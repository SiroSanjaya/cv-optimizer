export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
}

export interface ExperienceEntry {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface ProjectEntry {
  name: string;
  description: string;
  technologies: string[];
  bullets: string[];
}

export interface EducationEntry {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
}

export interface StructuredCv {
  personalInfo: PersonalInfo;
  summary: string;
  skills: string[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  education: EducationEntry[];
  certifications: string[];
}

export interface ExperienceRelevanceEntry {
  role: string;
  company: string;
  relevance: string;
  explanation: string;
}

export interface InterviewQuestion {
  question: string;
  category: "technical" | "behavioral" | "situational";
  targetSkillOrContext: string;
  answerTip: string;
}

export interface CoverLetterResult {
  subject: string;
  recipient: string;
  content: string;
  keyHighlights: string[];
}

export interface JobRequirementMatch {
  requirement: string;
  evidence: string;
  status: "Supported" | "Partial" | "Gap";
  category?: string;
}

export interface BulletRevision {
  id?: string;
  company: string;
  role: string;
  originalBullet: string;
  suggestedBullet: string;
  reasoning: string;
  actionVerb?: string;
  hasQuantifiableMetric?: boolean;
  metricPrompt?: string;
  status?: "pending" | "accepted" | "rejected";
}

export interface CvAnalysis {
  matchScore: number;
  matchedSkills: string[];
  partialMatches: string[];
  missingSkills: string[];
  keywords: string[];
  recommendations: string[];
  experienceRelevance: ExperienceRelevanceEntry[];
  summary: string;
  interviewQuestions?: InterviewQuestion[];
  jobMatchAnalysis?: JobRequirementMatch[];
  suggestedRevisions?: BulletRevision[];
}