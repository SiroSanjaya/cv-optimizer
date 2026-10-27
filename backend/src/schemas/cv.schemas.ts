import { z } from "zod";

// Gemini sometimes returns `null`, primitive strings, or unexpected shapes for fields.
// These helpers normalize inputs before validation.
const nullableString = () =>
  z.preprocess(
    (val) => (val === null || val === undefined ? "" : typeof val === "string" ? val : String(val)),
    z.string()
  ).default("");

const nullableStringArray = () =>
  z.preprocess((val) => {
    if (val === null || val === undefined) return [];
    if (typeof val === "string") {
      return val
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (Array.isArray(val)) {
      return val
        .map((item) => {
          if (item === null || item === undefined) return "";
          if (typeof item === "string") return item.trim();
          if (typeof item === "object") return Object.values(item).join(" ").trim();
          return String(item).trim();
        })
        .filter(Boolean);
    }
    return [];
  }, z.array(z.string())).default([]);

const safeArray = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (val) => (Array.isArray(val) ? val.filter((item) => item !== null && item !== undefined) : []),
    z.array(schema)
  ).default([]);

export const analyzeRequestSchema = z.object({
  jobDescription: z
    .string()
    .trim()
    .min(10, "Job description is too short. Please paste the full job requirements.")
    .max(30000, "Job description is too long."),
});

export const personalInfoSchema = z.object({
  name: nullableString(),
  email: nullableString(),
  phone: nullableString(),
  location: nullableString(),
  linkedin: nullableString(),
  github: nullableString(),
});

export const experienceEntrySchema = z.object({
  company: nullableString(),
  position: nullableString(),
  startDate: nullableString(),
  endDate: nullableString(),
  bullets: nullableStringArray(),
});

export const projectEntrySchema = z.object({
  name: nullableString(),
  description: nullableString(),
  technologies: nullableStringArray(),
  bullets: nullableStringArray(),
});

export const educationEntrySchema = z.object({
  institution: nullableString(),
  degree: nullableString(),
  field: nullableString(),
  startDate: nullableString(),
  endDate: nullableString(),
});

export const structuredCvSchema = z.object({
  personalInfo: z.preprocess(
    (val) => (val && typeof val === "object" ? val : {}),
    personalInfoSchema
  ).default({
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
  }),
  summary: nullableString(),
  skills: nullableStringArray(),
  experience: safeArray(experienceEntrySchema),
  projects: safeArray(projectEntrySchema),
  education: safeArray(educationEntrySchema),
  certifications: nullableStringArray(),
});

export const partialMatchEntrySchema = z.object({
  skill: nullableString(),
  details: nullableString(),
});

export const experienceRelevanceEntrySchema = z.object({
  role: nullableString(),
  company: nullableString(),
  relevance: nullableString(),
  explanation: nullableString(),
});

export const interviewQuestionSchema = z.object({
  question: nullableString(),
  category: z
    .preprocess((val) => {
      const s = String(val || "").toLowerCase();
      if (s.includes("behavior") || s.includes("perilaku") || s.includes("budaya")) return "behavioral";
      if (s.includes("situat") || s.includes("kasus")) return "situational";
      return "technical";
    }, z.enum(["technical", "behavioral", "situational"]))
    .default("technical"),
  targetSkillOrContext: nullableString(),
  answerTip: nullableString(),
});

export const cvAnalysisSchema = z.object({
  matchScore: z.preprocess((val) => {
    if (val === null || val === undefined) return 0;
    const num = Number(val);
    if (isNaN(num)) return 0;
    return Math.min(100, Math.max(0, Math.round(num)));
  }, z.number().min(0).max(100)),
  matchedSkills: nullableStringArray(),
  partialMatches: safeArray(partialMatchEntrySchema),
  missingSkills: nullableStringArray(),
  keywords: nullableStringArray(),
  recommendations: nullableStringArray(),
  experienceRelevance: safeArray(experienceRelevanceEntrySchema),
  summary: nullableString(),
  interviewQuestions: safeArray(interviewQuestionSchema).optional(),
});

export const generateRequestSchema = z.object({
  cvData: structuredCvSchema,
  jobDescription: z.string().trim().min(10).max(30000),
  analysis: cvAnalysisSchema,
});

export const coverLetterRequestSchema = z.object({
  cvData: structuredCvSchema,
  jobDescription: z.string().trim().min(10).max(30000),
  companyName: z.string().trim().max(160).optional(),
  targetRole: z.string().trim().max(160).optional(),
  hiringManager: z.string().trim().max(160).optional(),
  motivation: z.string().trim().max(2000).optional(),
  language: z.enum(["id", "en"]).default("id"),
  tone: z.enum(["professional", "modern"]).default("professional"),
});

export const interviewPrepRequestSchema = z.object({
  cvData: structuredCvSchema,
  jobDescription: z.string().trim().min(10).max(30000),
});

export const pdfRequestSchema = z.object({
  cv: structuredCvSchema,
  template: z.enum(["executive", "classic", "tech"]).default("executive"),
  density: z.enum(["spacious", "compact"]).default("spacious"),
});

export const coverLetterPdfRequestSchema = z.object({
  subject: z.string().trim().max(300),
  recipient: z.string().trim().max(300),
  content: z.string().trim().min(1).max(20000),
  applicantName: z.string().trim().max(200),
  email: z.string().trim().max(320).optional(),
  phone: z.string().trim().max(80).optional(),
});