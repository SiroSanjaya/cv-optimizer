import { getAIProvider } from "../ai/aiProviderFactory";
import { extractTextFromFile } from "../parser/cvParser";
import {
  CvAnalysis,
  StructuredCv,
  CoverLetterResult,
  CoverLetterOptions,
  InterviewQuestion,
} from "../../types/cv.types";
import { logger } from "../../utils/logger";

/**
 * Parse an uploaded file once and convert it into structured CV JSON.
 * This structured CV should be reused by the frontend for subsequent
 * /generate and /pdf calls instead of re-uploading/re-parsing the file,
 * to minimize AI API cost (per product spec).
 */
export async function parseAndStructureCv(
  filePath: string,
  mimeType: string
): Promise<StructuredCv> {
  const rawText = await extractTextFromFile(filePath, mimeType);
  logger.info("cv_text_extracted", { chars: rawText.length });

  const provider = getAIProvider();
  const structured = await provider.extractStructuredCv(rawText);
  return structured;
}

export async function analyzeCvAgainstJob(
  cv: StructuredCv,
  jobDescription: string
): Promise<CvAnalysis> {
  const provider = getAIProvider();
  return provider.analyzeMatch(cv, jobDescription);
}

export async function generateTailoredCv(
  cv: StructuredCv,
  jobDescription: string,
  analysis: CvAnalysis
): Promise<StructuredCv> {
  const provider = getAIProvider();
  return provider.generateTailoredCv(cv, jobDescription, analysis);
}

export async function generateCoverLetter(
  cv: StructuredCv,
  jobDescription: string,
  options?: CoverLetterOptions
): Promise<CoverLetterResult> {
  const provider = getAIProvider();
  return provider.generateCoverLetter(cv, jobDescription, options);
}

export async function generateInterviewPrep(
  cv: StructuredCv,
  jobDescription: string
): Promise<InterviewQuestion[]> {
  const provider = getAIProvider();
  return provider.generateInterviewPrep(cv, jobDescription);
}
