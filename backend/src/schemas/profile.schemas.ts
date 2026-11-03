import { z } from "zod";
import { structuredCvSchema } from "./cv.schemas";

const stringList = z.array(z.string().trim().min(1).max(120)).max(100);

export const careerProfileInputSchema = z.object({
  structuredCv: structuredCvSchema,
  languages: stringList,
  targetRoles: stringList,
  preferredIndustries: stringList,
  preferredLocations: stringList,
  employmentPreferences: z.array(z.enum(["remote", "hybrid", "onsite"])).max(3),
  expectedSalaryMin: z.number().int().min(0).max(2_000_000_000).nullable(),
  expectedSalaryMax: z.number().int().min(0).max(2_000_000_000).nullable(),
  salaryCurrency: z.enum(["IDR", "USD"]),
}).refine(
  (profile) =>
    profile.expectedSalaryMin === null ||
    profile.expectedSalaryMax === null ||
    profile.expectedSalaryMin <= profile.expectedSalaryMax,
  {
    message: "Gaji minimum tidak boleh melebihi gaji maksimum.",
    path: ["expectedSalaryMax"],
  }
);

export const savedJobInputSchema = z.object({
  externalId: z.string().trim().min(1).max(160),
  source: z.enum(["Kalibrr", "Remotive", "Arbeitnow", "Jooble", "RemoteOK", "Himalayas"]),
  title: z.string().trim().min(1).max(300),
  company: z.string().trim().min(1).max(300),
  location: z.string().trim().min(1).max(300),
  salary: z.string().trim().max(200).nullable().optional(),
  salaryMin: z.number().finite().nonnegative().nullable().optional(),
  salaryMax: z.number().finite().nonnegative().nullable().optional(),
  salaryCurrency: z.enum(["IDR", "USD", "EUR", "GBP", "AUD", "SGD", "MYR"]).nullable().optional(),
  salaryPeriod: z.enum(["hourly", "monthly", "annual", "unknown"]).nullable().optional(),
  type: z.string().trim().max(100).nullable().optional(),
  industry: z.string().trim().max(120).nullable().optional(),
  experienceLevel: z.enum(["internship", "entry", "mid", "senior", "lead"]).nullable().optional(),
  url: z.string().url().refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "https:";
  }, "Tautan lowongan harus menggunakan HTTPS."),
  description: z.string().max(10_000),
  skills: z.array(z.string().trim().min(1).max(120)).max(100),
  matchingSkills: z.array(z.string().trim().min(1).max(120)).max(100).optional(),
  missingSkills: z.array(z.string().trim().min(1).max(120)).max(100).optional(),
  matchReasons: z.array(z.string().trim().min(1).max(300)).max(20).optional(),
  matchScore: z.number().int().min(0).max(100).nullable().optional(),
  applyRecommendation: z.enum(["apply", "consider", "low_priority"]).nullable().optional(),
  postedAtDate: z.string().datetime().nullable().optional(),
  applicationDeadline: z.string().datetime().nullable().optional(),
}).refine(
  (job) =>
    job.salaryMin == null ||
    job.salaryMax == null ||
    job.salaryMin <= job.salaryMax,
  {
    message: "Gaji minimum tidak boleh melebihi gaji maksimum.",
    path: ["salaryMax"],
  }
);
