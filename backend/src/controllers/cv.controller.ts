import { Request, Response, NextFunction } from "express";
import fs from "fs/promises";
import {
  analyzeRequestSchema,
  generateRequestSchema,
  pdfRequestSchema,
  coverLetterPdfRequestSchema,
  coverLetterRequestSchema,
  interviewPrepRequestSchema,
  structuredCvSchema,
} from "../schemas/cv.schemas";
import { Errors } from "../utils/AppError";
import { logger } from "../utils/logger";
import {
  analyzeCvAgainstJob,
  generateTailoredCv,
  generateCoverLetter as serviceGenerateCoverLetter,
  generateInterviewPrep as serviceGenerateInterviewPrep,
} from "../services/cv/cvService";
import { extractTextFromFile } from "../services/parser/cvParser";
import { generateCvPdf } from "../services/document/pdfGenerator";
import { generateCoverLetterPdf } from "../services/document/coverLetterPdfGenerator";
import { generateCvDocx } from "../services/document/docxGenerator";
import { aiJobRequestSchema } from "../schemas/aiJob.schemas";
import { submitAiJob } from "../services/ai/aiTasks";

/**
 * POST /api/cv/analyze
 * multipart/form-data (cv file + jobDescription) OR application/json ({ cvData, jobDescription })
 * Parses the CV once, structures it, and runs match analysis.
 * Returns both the structured CV and the analysis so the frontend can
 * reuse the structured CV for /generate without re-uploading the file.
 */
export async function analyzeCv(req: Request, res: Response, next: NextFunction) {
  let tempFilePath: string | undefined;
  try {
    const jobDescription = req.body.jobDescription;
    const parsedJd = analyzeRequestSchema.safeParse({ jobDescription });
    if (!parsedJd.success) {
      throw Errors.emptyJobDescription();
    }

    let taskInput: {
      cvData?: unknown;
      rawCvText?: string;
      jobDescription: string;
    };

    if (req.body?.cvData) {
      // Structured CV supplied directly (e.g. profile import)
      let rawCv = req.body.cvData;
      if (typeof rawCv === "string") {
        try {
          rawCv = JSON.parse(rawCv);
        } catch {
          throw Errors.validation("Invalid cvData JSON format.");
        }
      }
      const parsedCv = structuredCvSchema.safeParse(rawCv);
      if (!parsedCv.success) {
        throw Errors.validation("Invalid structured CV data format.");
      }
      taskInput = {
        cvData: parsedCv.data,
        jobDescription: parsedJd.data.jobDescription,
      };
    } else if (req.file) {
      tempFilePath = req.file.path;
      const rawCvText = await extractTextFromFile(
        tempFilePath,
        req.file.mimetype
      );
      taskInput = {
        rawCvText,
        jobDescription: parsedJd.data.jobDescription,
      };
    } else {
      throw Errors.invalidFileType();
    }

    const parsedTask = aiJobRequestSchema.safeParse({
      task: "cv.analyze",
      input: taskInput,
    });
    if (!parsedTask.success) {
      throw Errors.validation("Invalid CV analysis request.");
    }
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();
    const job = await submitAiJob(userId, parsedTask.data);
    res.status(202).json({ success: true, ...job });
  } catch (err) {
    next(err);
  } finally {
    if (tempFilePath) {
      fs.unlink(tempFilePath).catch((err: unknown) => {
        logger.warn("cv_upload_cleanup_failed", {
          message: err instanceof Error ? err.message : "unknown",
        });
      });
    }
  }
}

/**
 * POST /api/cv/generate
 * Body: { cvData, jobDescription, analysis }
 * No file involved — reuses previously structured CV to avoid re-parsing.
 */
export async function generateCv(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = generateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.error("generate_request_validation_failed", {
        issues: JSON.stringify(parsed.error.issues),
      });
      throw Errors.validation("Invalid request data for CV generation.");
    }

    const { cvData, jobDescription, analysis } = parsed.data;
    const tailoredCv = await generateTailoredCv(cvData, jobDescription, analysis);

    res.json({ success: true, cv: tailoredCv });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cv/pdf
 * Body: { cv }
 * Returns a generated PDF file (deterministic, no AI call).
 */
export async function downloadCvPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = pdfRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw Errors.validation("Invalid CV data for PDF generation.");
    }

    const stream = generateCvPdf(parsed.data.cv, {
      template: parsed.data.template,
      density: parsed.data.density,
    });
    const filename = safeFileName(parsed.data.cv.personalInfo.name);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.pdf"`
    );
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

export async function downloadCoverLetterPdf(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = coverLetterPdfRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw Errors.validation("Invalid cover letter data for PDF generation.");
    }

    const stream = generateCoverLetterPdf(parsed.data);
    const filenameBase = parsed.data.applicantName
      .trim()
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .replace(/\s+/g, "_");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Cover_Letter_${filenameBase || "Applicant"}.pdf"`
    );
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cv/docx
 * Body: { cv }
 * Returns a generated DOCX file (deterministic, no AI call).
 */
export async function downloadCvDocx(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = pdfRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw Errors.validation("Invalid CV data for DOCX generation.");
    }

    const buffer = await generateCvDocx(parsed.data.cv);
    const filename = safeFileName(parsed.data.cv.personalInfo.name);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.docx"`
    );
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

function safeFileName(name: string): string {
  const base = (name || "CV").trim().replace(/[^a-zA-Z0-9-_ ]/g, "");
  return `${base.replace(/\s+/g, "_") || "CV"}_Optimized`;
}

/**
 * POST /api/cv/cover-letter
 * Body: { cvData, jobDescription, language, tone }
 */
export async function generateCoverLetterController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = coverLetterRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.error("cover_letter_validation_failed", {
        issues: JSON.stringify(parsed.error.issues),
      });
      throw Errors.validation("Invalid request parameters for cover letter.");
    }

    const { cvData, jobDescription, language, tone } = parsed.data;
    const coverLetter = await serviceGenerateCoverLetter(
      cvData,
      jobDescription,
      { language, tone }
    );

    res.json({ success: true, coverLetter });
  } catch (err) {
    next(err);
  }
}

import {
  generateInterviewSession,
  evaluateInterviewAnswer,
} from "../services/ai/interview.service";

/**
 * POST /api/cv/interview-prep
 * Body: { cvData, jobDescription }
 */
export async function getInterviewPrepController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = interviewPrepRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.error("interview_prep_validation_failed", {
        issues: JSON.stringify(parsed.error.issues),
      });
      throw Errors.validation("Invalid request parameters for interview prep.");
    }

    const { cvData, jobDescription } = parsed.data;
    const questions = await serviceGenerateInterviewPrep(cvData, jobDescription);

    res.json({ success: true, questions });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cv/interview/start
 * Body: { role, level, type, cvSkills, jobDescription, questionCount }
 */
export async function startMockInterviewSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { role, level, type, cvSkills, jobDescription, questionCount } = req.body;
    const questions = await generateInterviewSession({
      role,
      level,
      type,
      cvSkills,
      jobDescription,
      questionCount: Number(questionCount) || 4,
    });

    res.json({ success: true, questions });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cv/interview/evaluate
 * Body: { question, answer, category, targetSkillOrTopic, role }
 */
export async function evaluateMockInterviewAnswerController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { question, answer, category, targetSkillOrTopic, role } = req.body;
    if (!question || typeof question !== "string") {
      throw Errors.validation("Pertanyaan wawancara wajib disertakan.");
    }

    const evaluation = await evaluateInterviewAnswer({
      question,
      answer: String(answer || ""),
      category,
      targetSkillOrTopic,
      role,
    });

    res.json({ success: true, evaluation });
  } catch (err) {
    next(err);
  }
}
