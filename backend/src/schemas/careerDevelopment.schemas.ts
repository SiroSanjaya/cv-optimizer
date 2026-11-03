import { z } from "zod";

export const careerDevelopmentTargetSchema = z.object({
  targetRole: z.string().trim().min(2).max(120),
});

export const careerDevelopmentProgressSchema = z.object({
  milestoneId: z.string().min(1).max(120),
  status: z.enum(["not_started", "in_progress", "completed"]),
});

export const careerDevelopmentPlanResponseSchema = z.object({
  targetRole: z.string(),
  jobCount: z.number().int().nonnegative(),
  generatedAt: z.string(),
  skillDemand: z.array(z.object({
    skill: z.string(),
    count: z.number().int().positive(),
  })),
  skillGaps: z.array(z.string()),
  learningRecommendations: z.array(z.object({
    id: z.string(),
    skill: z.string(),
    priority: z.enum(["high", "medium", "low"]),
    rationale: z.string(),
    steps: z.array(z.string()),
  })),
  portfolioProjects: z.array(z.object({
    id: z.string(),
    title: z.string(),
    rationale: z.string(),
    skills: z.array(z.string()),
    scope: z.array(z.string()),
  })),
  certifications: z.array(z.object({
    id: z.string(),
    name: z.string(),
    issuer: z.string(),
    officialUrl: z.string().url(),
    relatedSkills: z.array(z.string()),
    rationale: z.string(),
  })),
  progress: z.record(z.enum(["not_started", "in_progress", "completed"])),
});

export type CareerDevelopmentPlanResponse = z.infer<
  typeof careerDevelopmentPlanResponseSchema
>;
