import {
  CvAnalysis,
  StructuredCv,
  CoverLetterResult,
  CoverLetterOptions,
  InterviewQuestion,
} from "../../types/cv.types";

/**
 * Abstraction over any LLM provider used for CV analysis / generation.
 * Swap implementations (Gemini, OpenAI, Claude, etc.) without touching
 * controllers or routes — they only depend on this interface.
 */
export interface AIProvider {
  /**
    * Extract a structured CV JSON object from raw CV text.
    * Must not invent any information not present in the source text.
    */
  extractStructuredCv(rawCvText: string): Promise<StructuredCv>;

  /**
    * Compare a structured CV against a job description and return a
    * match analysis. Must not fabricate matches.
    */
  analyzeMatch(cv: StructuredCv, jobDescription: string): Promise<CvAnalysis>;

  /**
    * Produce a tailored, ATS-friendly version of the CV using only facts
    * already present in the original structured CV.
    */
  generateTailoredCv(
    cv: StructuredCv,
    jobDescription: string,
    analysis: CvAnalysis
  ): Promise<StructuredCv>;

  /**
    * Generate a tailored, high-converting cover letter based on candidate's CV and job requirements.
    */
  generateCoverLetter(
    cv: StructuredCv,
    jobDescription: string,
    options?: CoverLetterOptions
  ): Promise<CoverLetterResult>;

  /**
    * Generate targeted interview questions with STAR method guidance.
    */
  generateInterviewPrep(
    cv: StructuredCv,
    jobDescription: string
  ): Promise<InterviewQuestion[]>;
}
