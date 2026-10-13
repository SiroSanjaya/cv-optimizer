import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider } from "./AIProvider";
import {
  CvAnalysis,
  StructuredCv,
  CoverLetterResult,
  CoverLetterOptions,
  InterviewQuestion,
} from "../../types/cv.types";
import {
  buildAnalysisPrompt,
  buildExtractionPrompt,
  buildGenerationPrompt,
  buildCoverLetterPrompt,
  buildInterviewPrepPrompt,
} from "./prompts";
import { extractJson } from "./jsonExtractor";
import { structuredCvSchema, cvAnalysisSchema } from "../../schemas/cv.schemas";
import { Errors } from "../../utils/AppError";
import { logger } from "../../utils/logger";

const AI_TIMEOUT_MS = 45_000;
const RETRY_DELAYS_MS = [1_000, 2_000];
const PRIMARY_MODEL = "gemini-3.5-flash-lite";
const BACKUP_MODELS = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.8-flash"];

function isOverloadedOrRateLimited(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.message.includes("503") ||
    err.message.includes("429") ||
    err.message.includes("quota") ||
    err.message.includes("Resource has been exhausted") ||
    err.message.includes("Service Unavailable") ||
    err.message.includes("overloaded") ||
    err.message.includes("high demand")
  );
}

function isTimeoutError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("took too long");
}

function isRetryableError(err: unknown): boolean {
  return isOverloadedOrRateLimited(err) || isTimeoutError(err);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(Errors.aiTimeout()), AI_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  private modelName: string;
  private fallbackModelName: string;

  constructor(
    apiKey: string,
    modelName = PRIMARY_MODEL,
    fallbackModelName = BACKUP_MODELS[0]
  ) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required to initialize GeminiProvider");
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
    this.fallbackModelName = fallbackModelName;
  }

  private async callModel(prompt: string, modelName: string): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const result = await withTimeout(model.generateContent(prompt));
    const text = result.response.text();
    if (!text) throw Errors.aiFailed();
    return text;
  }

  /**
   * Generates content with:
   *  1. Retries on the primary model for overload/timeout errors.
   *  2. Sequential fallback attempts across BACKUP_MODELS if the primary model fails or hits quota limits.
   */
  private async generate(prompt: string): Promise<string> {
    let lastErr: unknown;

    // 1. Try Primary model with quick retry
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        return await this.callModel(prompt, this.modelName);
      } catch (err) {
        lastErr = err;

        if (!isRetryableError(err)) break;

        logger.warn("gemini_primary_retry", {
          model: this.modelName,
          attempt,
          message: err instanceof Error ? err.message : "unknown",
        });

        if (attempt < RETRY_DELAYS_MS.length) {
          await sleep(RETRY_DELAYS_MS[attempt]);
        }
      }
    }

    // 2. Try Backup models sequentially
    const candidateBackups = [this.fallbackModelName, ...BACKUP_MODELS].filter(
      (m, idx, arr) => m !== this.modelName && arr.indexOf(m) === idx
    );

    for (const backup of candidateBackups) {
      try {
        logger.info("gemini_trying_backup_model", { model: backup });
        return await this.callModel(prompt, backup);
      } catch (err) {
        lastErr = err;
        logger.warn("gemini_backup_model_failed", {
          model: backup,
          message: err instanceof Error ? err.message : "unknown",
        });
      }
    }

    logger.error("gemini_call_failed", {
      model: this.modelName,
      final: true,
      message: lastErr instanceof Error ? lastErr.message : "unknown",
    });

    // Preserve the 504 "took too long" message if that's genuinely what
    // happened on the last attempt; otherwise use the generic AI-failure message.
    if (isTimeoutError(lastErr)) throw Errors.aiTimeout();
    throw Errors.aiFailed();
  }

  async extractStructuredCv(rawCvText: string): Promise<StructuredCv> {
    const prompt = buildExtractionPrompt(rawCvText);
    const raw = await this.generate(prompt);
    const json = extractJson<unknown>(raw);
    const parsed = structuredCvSchema.safeParse(json);
    if (!parsed.success) {
      logger.error("schema_validation_failed", {
        stage: "extractStructuredCv",
        issues: JSON.stringify(parsed.error.issues),
      });
      throw Errors.malformedAiResponse();
    }
    return parsed.data;
  }

  async analyzeMatch(
    cv: StructuredCv,
    jobDescription: string
  ): Promise<CvAnalysis> {
    const prompt = buildAnalysisPrompt(JSON.stringify(cv), jobDescription);
    const raw = await this.generate(prompt);
    const json = extractJson<unknown>(raw);
    const parsed = cvAnalysisSchema.safeParse(json);
    if (!parsed.success) {
      logger.error("schema_validation_failed", {
        stage: "analyzeMatch",
        issues: JSON.stringify(parsed.error.issues),
      });
      throw Errors.malformedAiResponse();
    }
    return parsed.data;
  }

  async generateTailoredCv(
    cv: StructuredCv,
    jobDescription: string,
    analysis: CvAnalysis
  ): Promise<StructuredCv> {
    const prompt = buildGenerationPrompt(
      JSON.stringify(cv),
      jobDescription,
      JSON.stringify(analysis)
    );
    const raw = await this.generate(prompt);
    const json = extractJson<unknown>(raw);
    const parsed = structuredCvSchema.safeParse(json);
    if (!parsed.success) {
      logger.error("schema_validation_failed", {
        stage: "generateTailoredCv",
        issues: JSON.stringify(parsed.error.issues),
      });
      throw Errors.malformedAiResponse();
    }
    return guardAgainstFabrication(cv, parsed.data);
  }

  async generateCoverLetter(
    cv: StructuredCv,
    jobDescription: string,
    options: CoverLetterOptions = {}
  ): Promise<CoverLetterResult> {
    const prompt = buildCoverLetterPrompt(
      JSON.stringify(cv),
      jobDescription,
      options.language || "id",
      options.tone || "professional",
      options
    );
    const raw = await this.generate(prompt);
    const json = extractJson<any>(raw);

    const subject =
      typeof json?.subject === "string" && json.subject.trim()
        ? json.subject.trim()
        : `Surat Lamaran Kerja - ${cv.personalInfo?.name || "Kandidat"}`;

    const recipient =
      typeof json?.recipient === "string" && json.recipient.trim()
        ? json.recipient.trim()
        : "Yth. Tim Rekrutmen / Hiring Manager";

    const content =
      typeof json?.content === "string" && json.content.trim()
        ? json.content.trim()
        : typeof json === "string"
        ? json
        : "Dengan hormat, saya mengajukan lamaran kerja...";

    const keyHighlights = Array.isArray(json?.keyHighlights)
      ? json.keyHighlights.map((h: unknown) => String(h).trim()).filter(Boolean)
      : [];

    return {
      subject,
      recipient,
      content,
      keyHighlights,
    };
  }

  async generateInterviewPrep(
    cv: StructuredCv,
    jobDescription: string
  ): Promise<InterviewQuestion[]> {
    const prompt = buildInterviewPrepPrompt(JSON.stringify(cv), jobDescription);
    const raw = await this.generate(prompt);
    const json = extractJson<any>(raw);

    const rawList = Array.isArray(json?.questions)
      ? json.questions
      : Array.isArray(json)
      ? json
      : [];

    return rawList.map((item: any) => ({
      question: String(item?.question || "Pertanyaan teknis seputar proyek Anda."),
      category:
        item?.category === "behavioral" || item?.category === "situational"
          ? item.category
          : "technical",
      targetSkillOrContext: String(item?.targetSkillOrContext || "General Competency"),
      answerTip: String(item?.answerTip || "Jelaskan dengan metodologi STAR (Situation, Task, Action, Result)."),
    }));
  }
}

function guardAgainstFabrication(
  original: StructuredCv,
  tailored: StructuredCv
): StructuredCv {
  const originalSkills = Array.isArray(original?.skills) ? original.skills : [];
  const tailoredSkills = Array.isArray(tailored?.skills) ? tailored.skills : [];

  // Combine original skills with AI-tailored keywords & skills, deduplicated case-insensitively
  const seen = new Set<string>();
  const combinedSkills: string[] = [];
  for (const s of [...originalSkills, ...tailoredSkills]) {
    const trimmed = String(s).trim();
    const lower = trimmed.toLowerCase();
    if (trimmed && !seen.has(lower)) {
      seen.add(lower);
      combinedSkills.push(trimmed);
    }
  }

  return {
    ...tailored,
    skills: combinedSkills.length > 0 ? combinedSkills : originalSkills,
    personalInfo: original?.personalInfo || tailored?.personalInfo,
    education: original?.education || tailored?.education,
    certifications: original?.certifications && original.certifications.length > 0
      ? original.certifications
      : tailored?.certifications || [],
  };
}