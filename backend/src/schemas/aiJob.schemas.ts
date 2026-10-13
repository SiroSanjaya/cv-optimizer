import { z } from "zod";
import {
  analyzeRequestSchema,
  coverLetterRequestSchema,
  cvAnalysisSchema,
  generateRequestSchema,
  interviewPrepRequestSchema,
  structuredCvSchema,
} from "./cv.schemas";

const analyzeCvJobInputSchema = z.object({
  cvData: structuredCvSchema.optional(),
  rawCvText: z.string().min(40).max(40_000).optional(),
  jobDescription: analyzeRequestSchema.shape.jobDescription,
}).refine((input) => Boolean(input.cvData || input.rawCvText), {
  message: "Provide structured CV data or extracted CV text.",
});

const profileImportInputSchema = z.object({
  type: z.enum(["url", "json", "text"]),
  url: z.string().url().max(2_000).optional(),
  content: z.string().max(20_000).optional(),
  jobDescription: z.string().max(30_000).optional(),
}).refine((input) => input.type === "url" ? Boolean(input.url) : Boolean(input.content), {
  message: "Profile import content is required.",
});

const interviewStartInputSchema = z.object({
  role: z.string().max(200).optional(),
  level: z.string().max(100).optional(),
  type: z.enum(["technical", "behavioral", "system_design", "mixed"]).optional(),
  language: z.enum(["id", "en"]).default("id"),
  cvSkills: z.array(z.string().max(100)).max(50).optional(),
  jobDescription: z.string().max(30_000).optional(),
  questionCount: z.number().int().min(1).max(10).optional(),
});

const interviewEvaluateInputSchema = z.object({
  question: z.string().min(1).max(10_000),
  answer: z.string().max(20_000),
  category: z.string().max(100).optional(),
  targetSkillOrTopic: z.string().max(200).optional(),
  role: z.string().max(200).optional(),
  language: z.enum(["id", "en"]).default("id"),
});

const bulkScreenInputSchema = z.object({
  requirementText: z.string().min(20).max(30_000),
  rawCvs: z.array(z.object({
    id: z.string().min(1).max(100),
    name: z.string().max(200),
    content: z.string().max(20_000),
  })).min(1).max(20),
});

export const aiJobRequestSchema = z.discriminatedUnion("task", [
  z.object({ task: z.literal("cv.analyze"), input: analyzeCvJobInputSchema }),
  z.object({ task: z.literal("cv.generate"), input: generateRequestSchema }),
  z.object({ task: z.literal("cv.cover-letter"), input: coverLetterRequestSchema }),
  z.object({ task: z.literal("cv.interview-prep"), input: interviewPrepRequestSchema }),
  z.object({ task: z.literal("cv.interview-start"), input: interviewStartInputSchema }),
  z.object({ task: z.literal("cv.interview-evaluate"), input: interviewEvaluateInputSchema }),
  z.object({ task: z.literal("profile.import"), input: profileImportInputSchema }),
  z.object({ task: z.literal("jobs.bulk-screen"), input: bulkScreenInputSchema }),
]);

export type AiJobRequest = z.infer<typeof aiJobRequestSchema>;
export type AiJobTask = AiJobRequest["task"];
