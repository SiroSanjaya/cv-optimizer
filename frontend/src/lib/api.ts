import axios from "axios";
import { clearSessionCvSkills, clearSessionProfile } from "./sessionProfile";
import type {
  CvAnalysis,
  StructuredCv,
  CoverLetterResult,
  InterviewQuestion,
} from "../types/cv";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Automatically attach token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
  applicationCount?: number;
  cvVersionCount?: number;
  credits?: number;
  usedCredits?: number;
}

export type ApplicationStatus =
  | "applied"
  | "hr_interview"
  | "user_interview"
  | "technical_test"
  | "offer"
  | "rejected"
  | "ghosted"
  | "withdrawn";

export interface ApplicationItem {
  id: string;
  userId?: string;
  company?: string | null;
  position?: string | null;
  jobDescription: string;
  jobUrl?: string | null;
  matchScore?: number | null;
  hireProb?: number | null;
  status: ApplicationStatus;
  appliedAt: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationMetrics {
  total: number;
  interviewing: number;
  offers: number;
  rejected: number;
  avgMatchScore: number | null;
  byStatus: Record<string, number>;
}

export interface RecommendedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  type?: string;
  source: "Kalibrr" | "Remotive" | "Arbeitnow" | "Jooble" | "RemoteOK" | "Himalayas" | "Indeed" | "Curated" | "Glints";
  url: string;
  description: string;
  skills: string[];
  postedAt?: string;
  logo?: string;
  remote?: boolean;
  responseRate?: number;
  visaSponsorship?: "available" | "unavailable" | "not_mentioned";
  matchScore?: number;
  matchingSkills?: string[];
  missingSkills?: string[];
}


export interface AnalyzeResponse {
  success: true;
  cv: StructuredCv;
  analysis: CvAnalysis;
}

export interface GenerateResponse {
  success: true;
  cv: StructuredCv;
}

interface AiJobSubmission {
  success: true;
  jobId: string;
  status: "waiting";
}

interface AiJobStatusResponse {
  success: true;
  jobId: string;
  status: "waiting" | "active" | "delayed" | "completed" | "failed";
  result?: unknown;
  error?: string;
}

interface ApiErrorBody {
  success: false;
  error: string;
}

async function waitForAiJob<T>(
  submission: Promise<{ data: AiJobSubmission }>,
  timeoutMs = 5 * 60_000
): Promise<T> {
  const { data: job } = await submission;
  const deadline = Date.now() + timeoutMs;
  let intervalMs = 1_000;

  while (Date.now() < deadline) {
    await new Promise((resolve) =>
      window.setTimeout(resolve, Math.min(intervalMs, deadline - Date.now()))
    );
    const { data: status } = await api.get<AiJobStatusResponse>(
      `/api/ai/jobs/${encodeURIComponent(job.jobId)}`,
      { timeout: 15_000 }
    );

    if (status.status === "completed") {
      if (status.result === undefined) {
        throw new Error("The AI task completed without returning a result.");
      }
      return status.result as T;
    }
    if (status.status === "failed") {
      throw new Error(status.error || "The AI task could not be completed.");
    }

    intervalMs = Math.min(Math.round(intervalMs * 1.5), 5_000);
  }

  throw new Error("The AI task is taking longer than expected. Please try again later.");
}

export function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ApiErrorBody | undefined;
    if (body?.error) return body.error;
    if (err.code === "ECONNABORTED") return "The request timed out. Please try again.";
    if (!err.response) return "Can't reach the server. Please check your connection.";
  }
  return fallback;
}

// ----------------- CV APIs -----------------
export async function analyzeCv(
  cvSource: File | StructuredCv,
  jobDescription: string
): Promise<AnalyzeResponse> {
  try {
    if (cvSource instanceof File) {
      const formData = new FormData();
      formData.append("cv", cvSource);
      formData.append("jobDescription", jobDescription);

      return await waitForAiJob<AnalyzeResponse>(api.post<AiJobSubmission>("/api/cv/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60_000,
      }));
    } else {
      return await waitForAiJob<AnalyzeResponse>(api.post<AiJobSubmission>(
        "/api/cv/analyze",
        { cvData: cvSource, jobDescription },
        { timeout: 60_000 }
      ));
    }
  } catch (err) {
    throw new Error(extractErrorMessage(err, "We couldn't analyze your CV. Please try again."));
  }
}

export async function generateTailoredCv(
  cvData: StructuredCv,
  jobDescription: string,
  analysis: CvAnalysis
): Promise<GenerateResponse> {
  try {
    return await waitForAiJob<GenerateResponse>(api.post<AiJobSubmission>(
      "/api/cv/generate",
      { cvData, jobDescription, analysis },
      { timeout: 90_000 }
    ));
  } catch (err) {
    throw new Error(extractErrorMessage(err, "We couldn't generate your tailored CV. Please try again."));
  }
}

export async function generateCoverLetter(
  cvData: StructuredCv,
  jobDescription: string,
  options?: {
    language?: "id" | "en";
    tone?: "professional" | "modern";
    companyName?: string;
    targetRole?: string;
    hiringManager?: string;
    motivation?: string;
  }
): Promise<{ success: true; coverLetter: CoverLetterResult }> {
  try {
    return await waitForAiJob<{ success: true; coverLetter: CoverLetterResult }>(api.post<AiJobSubmission>(
      "/api/cv/cover-letter",
      {
        cvData,
        jobDescription,
        language: options?.language || "id",
        tone: options?.tone || "professional",
        companyName: options?.companyName,
        targetRole: options?.targetRole,
        hiringManager: options?.hiringManager,
        motivation: options?.motivation,
      },
      { timeout: 60_000 }
    ));
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Gagal membuat surat lamaran. Silakan coba lagi."));
  }
}

export async function generateInterviewPrep(
  cvData: StructuredCv,
  jobDescription: string
): Promise<{ success: true; questions: InterviewQuestion[] }> {
  try {
    return await waitForAiJob<{ success: true; questions: InterviewQuestion[] }>(api.post<AiJobSubmission>(
      "/api/cv/interview-prep",
      { cvData, jobDescription },
      { timeout: 60_000 }
    ));
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Gagal memuat prediksi interview. Silakan coba lagi."));
  }
}

export async function downloadCvFile(
  cv: StructuredCv,
  format: "pdf" | "docx",
  pdfOptions?: {
    template: "executive" | "classic" | "tech";
    density: "spacious" | "compact";
  }
): Promise<Blob> {
  try {
    const body = format === "pdf" ? { cv, ...pdfOptions } : { cv };
    const { data } = await api.post(`/api/cv/${format}`, body, {
      responseType: "blob",
      timeout: 30_000,
    });
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "We couldn't prepare your download. Please try again."));
  }
}

export async function downloadCoverLetterPdf(input: {
  subject: string;
  recipient: string;
  content: string;
  applicantName: string;
  email?: string;
  phone?: string;
}): Promise<Blob> {
  try {
    const { data } = await api.post("/api/cv/cover-letter/pdf", input, {
      responseType: "blob",
      timeout: 30_000,
    });
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "We couldn't prepare your cover letter PDF. Please try again."));
  }
}

// ----------------- Profile Import APIs -----------------
export async function importProfile(params: {
  type: "url" | "json" | "text";
  url?: string;
  content?: string;
  jobDescription?: string;
}): Promise<AnalyzeResponse> {
  try {
    return await waitForAiJob<AnalyzeResponse>(api.post<AiJobSubmission>("/api/profile/import", params, {
      timeout: 45_000,
    }));
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Failed to import profile."));
  }
}

// ----------------- Auth APIs -----------------
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const { data } = await api.get<{ success: boolean; user: User | null }>("/api/auth/me");
    return data.user;
  } catch {
    return null;
  }
}

export async function googleLogin(credentialOrToken: string): Promise<{ user: User; token: string }> {
  try {
    const { data } = await api.post<{ success: boolean; user: User; token: string }>("/api/auth/google", {
      credential: credentialOrToken,
    });
    if (data.token) {
      clearSessionCvSkills();
      localStorage.setItem("auth_token", data.token);
    }
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Google sign in failed."));
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await api.post("/api/auth/logout");
  } finally {
    localStorage.removeItem("auth_token");
    clearSessionProfile();
  }
}

export async function deleteMyAccount(): Promise<void> {
  try {
    await api.delete("/api/profile/account");
    localStorage.removeItem("auth_token");
    clearSessionProfile();
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Failed to delete your account."));
  }
}

// ----------------- Application Tracker APIs -----------------
export async function getApplications(status?: string): Promise<ApplicationItem[]> {
  try {
    const { data } = await api.get<{ success: boolean; applications: ApplicationItem[] }>(
      "/api/applications",
      { params: { status } }
    );
    return data.applications;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Failed to fetch applications."));
  }
}

export async function getApplicationMetrics(): Promise<ApplicationMetrics> {
  try {
    const { data } = await api.get<{ success: boolean; metrics: ApplicationMetrics }>(
      "/api/applications/metrics"
    );
    return data.metrics;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Failed to fetch metrics."));
  }
}

export async function createApplication(app: {
  company: string;
  position: string;
  jobDescription?: string;
  jobUrl?: string;
  matchScore?: number;
  hireProb?: number;
  status?: ApplicationStatus;
  notes?: string;
}): Promise<ApplicationItem> {
  try {
    const { data } = await api.post<{ success: boolean; application: ApplicationItem }>(
      "/api/applications",
      app
    );
    return data.application;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Failed to create application."));
  }
}

export async function updateApplication(
  id: string,
  updates: Partial<ApplicationItem>
): Promise<ApplicationItem> {
  try {
    const { data } = await api.patch<{ success: boolean; application: ApplicationItem }>(
      `/api/applications/${id}`,
      updates
    );
    return data.application;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Failed to update application."));
  }
}

export async function deleteApplication(id: string): Promise<void> {
  try {
    await api.delete(`/api/applications/${id}`);
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Failed to delete application."));
  }
}

// ----------------- Jobs Recommendations APIs -----------------
export async function getJobRecommendations(params?: {
  keyword?: string;
  location?: "indonesia" | "malaysia" | "singapore" | "australia" | "remote" | "all";
  category?: string;
  skills?: string[];
}): Promise<{ query: any; jobs: RecommendedJob[] }> {
  try {
    const { data } = await api.get<{ success: boolean; query: any; jobs: RecommendedJob[] }>(
      "/api/jobs/recommendations",
      {
        params: {
          keyword: params?.keyword,
          location: params?.location,
          category: params?.category,
          skills: params?.skills?.join(","),
        },
      }
    );
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Failed to fetch job recommendations."));
  }
}

// ----------------- AI Mock Interview APIs -----------------
export interface MockInterviewQuestion {
  id: string;
  question: string;
  category: "technical" | "behavioral" | "system_design";
  targetSkillOrTopic: string;
  context?: string;
  hint: string;
  keyConceptsExpected: string[];
}

export interface InterviewEvaluation {
  score: number;
  starRubric: {
    situation: { present: boolean; note: string };
    task: { present: boolean; note: string };
    action: { present: boolean; note: string };
    result: { present: boolean; note: string };
  };
  technicalAccuracy: {
    score: number;
    feedback: string;
  };
  matchedKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  improvements: string[];
  idealAnswer: string;
  interviewerResponse?: string;
  followUpQuestion?: string;
}

export async function startMockInterviewSession(params: {
  role?: string;
  level?: string;
  type?: "technical" | "behavioral" | "system_design" | "mixed";
  language?: "id" | "en";
  cvSkills?: string[];
  jobDescription?: string;
  questionCount?: number;
}): Promise<MockInterviewQuestion[]> {
  try {
    const data = await waitForAiJob<{ success: boolean; questions: MockInterviewQuestion[] }>(api.post<AiJobSubmission>(
      "/api/cv/interview/start",
      params
    ));
    return data.questions;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Gagal memulai sesi latihan wawancara."));
  }
}

export async function evaluateMockInterviewAnswer(params: {
  question: string;
  answer: string;
  category?: string;
  targetSkillOrTopic?: string;
  role?: string;
  language?: "id" | "en";
}): Promise<InterviewEvaluation> {
  try {
    const data = await waitForAiJob<{ success: boolean; evaluation: InterviewEvaluation }>(api.post<AiJobSubmission>(
      "/api/cv/interview/evaluate",
      params
    ));
    return data.evaluation;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Gagal mengevaluasi jawaban wawancara."));
  }
}

// ----------------- HR / Recruiter Portal APIs -----------------
export interface TalentCandidate {
  id: string;
  name: string;
  email?: string;
  headline: string;
  location: string;
  yearsOfExperience: number;
  expectedSalary?: string;
  skills: string[];
  summary: string;
  matchScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  aiFitSummary: string;
  recentCompany?: string;
  isOpenToWork: boolean;
}

export interface BulkScreenResultItem {
  id: string;
  candidateName: string;
  role: string;
  matchScore: number;
  recommendation: "Shortlisted" | "Review Further" | "Not Recommended";
  keyStrengths: string[];
  missingQualifications: string[];
  summaryReason: string;
}

export async function searchTalentByRequirements(params: {
  requirementText: string;
  minExp?: number;
  location?: string;
}): Promise<{ candidates: TalentCandidate[]; extractedRequirements: { role: string; skills: string[] } }> {
  try {
    const { data } = await api.post<{ success: boolean; candidates: TalentCandidate[]; extractedRequirements: any }>(
      "/api/jobs/talent/search",
      params
    );
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Gagal mencari kandidat talent."));
  }
}

export async function bulkScreenCvs(params: {
  requirementText: string;
  rawCvs: { id: string; name: string; content: string }[];
}): Promise<BulkScreenResultItem[]> {
  try {
    const data = await waitForAiJob<{ success: boolean; results: BulkScreenResultItem[] }>(api.post<AiJobSubmission>(
      "/api/jobs/talent/bulk-screen",
      params
    ));
    return data.results;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Gagal melakukan screening CV massal."));
  }
}

export async function generateInterviewInvitation(params: {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  interviewType: "HR Screening" | "Technical Challenge" | "User Interview";
  dateSchedule?: string;
  platform?: "Google Meet" | "Zoom" | "Office";
}): Promise<{ emailSubject: string; emailBody: string; whatsappMessage: string }> {
  try {
    const { data } = await api.post<{ success: boolean; template: any }>(
      "/api/jobs/talent/invite-template",
      params
    );
    return data.template;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Gagal membuat template undangan wawancara."));
  }
}

export async function generateRecruiterPitch(params: {
  candidateName: string;
  targetRole: string;
  targetCompany: string;
  candidateSkills: string[];
  portfolioUrl?: string;
}): Promise<{ linkedinNote: string; coldEmailSubject: string; coldEmailBody: string }> {
  try {
    const { data } = await api.post<{ success: boolean; pitch: any }>(
      "/api/jobs/outreach-pitch",
      params
    );
    return data.pitch;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Gagal membuat pesan outreach ke recruiter."));
  }
}

export async function analyzeCustomJob(params: {
  jobText: string;
  candidateSkills?: string[];
}): Promise<{
  title: string;
  company: string;
  location: string;
  salary: string;
  skills: string[];
  matchScore: number | null;
  matchingSkills: string[];
  missingSkills: string[];
  overview: string;
}> {
  try {
    const { data } = await api.post<{ success: boolean; job: any }>(
      "/api/jobs/analyze-custom",
      params
    );
    return data.job;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Gagal menganalisis lowongan kustom."));
  }
}

// ==========================================
// STAR Story Vault (Master Experience Bank)
// ==========================================

export type StarCategory =
  | "technical"
  | "leadership"
  | "architecture"
  | "process_improvement"
  | "crisis_handling"
  | "other";

export interface VaultStoryItem {
  id: string;
  userId: string;
  company: string;
  role: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  category: StarCategory;
  skillsUsed: string[];
  situation: string;
  task: string;
  action: string;
  result: string;
  polishedBullet?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVaultStoryInput {
  company: string;
  role: string;
  periodStart?: string;
  periodEnd?: string;
  category: StarCategory;
  skillsUsed: string[];
  situation: string;
  task: string;
  action: string;
  result: string;
  polishedBullet?: string;
}

export async function getVaultStories(params?: {
  category?: string;
  search?: string;
}): Promise<VaultStoryItem[]> {
  try {
    const { data } = await api.get<{
      success: boolean;
      count: number;
      stories: VaultStoryItem[];
    }>("/api/vault", { params });
    return data.stories;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Gagal memuat STAR Story Vault."));
  }
}

export async function createVaultStory(
  input: CreateVaultStoryInput
): Promise<VaultStoryItem> {
  try {
    const { data } = await api.post<{
      success: boolean;
      story: VaultStoryItem;
    }>("/api/vault", input);
    return data.story;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Gagal menambahkan STAR story."));
  }
}

export async function updateVaultStory(
  id: string,
  input: Partial<CreateVaultStoryInput>
): Promise<VaultStoryItem> {
  try {
    const { data } = await api.put<{
      success: boolean;
      story: VaultStoryItem;
    }>(`/api/vault/${id}`, input);
    return data.story;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Gagal memperbarui STAR story."));
  }
}

export async function deleteVaultStory(id: string): Promise<void> {
  try {
    await api.delete(`/api/vault/${id}`);
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Gagal menghapus STAR story."));
  }
}

export async function extractVaultStoriesFromCv(
  cvContent: string
): Promise<CreateVaultStoryInput[]> {
  try {
    const { data } = await api.post<{
      success: boolean;
      count: number;
      extracted: CreateVaultStoryInput[];
    }>("/api/vault/extract-from-cv", { cvContent });
    return data.extracted;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Gagal mengekstrak STAR stories dari CV."));
  }
}

export async function matchVaultStoriesForJob(
  jobDescription: string
): Promise<{
  matchedStories: Array<{
    story: VaultStoryItem;
    relevanceScore: number;
    matchedSkills: string[];
  }>;
  totalVaultStories: number;
}> {
  try {
    const { data } = await api.post<{
      success: boolean;
      matchedStories: Array<{
        story: VaultStoryItem;
        relevanceScore: number;
        matchedSkills: string[];
      }>;
      totalVaultStories: number;
    }>("/api/vault/match-for-job", { jobDescription });
    return {
      matchedStories: data.matchedStories,
      totalVaultStories: data.totalVaultStories,
    };
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Gagal mencocokkan STAR stories dengan lowongan."));
  }
}
