import type { StructuredCv } from "../types/cv";

const CV_SKILLS_PREFIX = "cv_skills:";
const CV_STRUCTURED_PREFIX = "cv_structured:";
const LEGACY_CV_SKILLS_KEY = "user_cv_skills";

export function getSessionCvSkills(userId: string): string[] | undefined {
  const savedSkills = sessionStorage.getItem(`${CV_SKILLS_PREFIX}${userId}`);
  if (!savedSkills) return undefined;

  try {
    const parsed: unknown = JSON.parse(savedSkills);
    return Array.isArray(parsed) && parsed.every((skill) => typeof skill === "string")
      ? parsed
      : undefined;
  } catch (error) {
    console.warn("Ignoring invalid saved CV skills.", error);
    return undefined;
  }
}

export function saveSessionCvSkills(userId: string, skills: string[]): void {
  sessionStorage.setItem(`${CV_SKILLS_PREFIX}${userId}`, JSON.stringify(skills));
}

export interface SavedCvSession {
  cv: StructuredCv;
  fileName?: string;
  savedAt: string;
}

export function saveSessionStructuredCv(
  userId: string,
  cv: StructuredCv,
  fileName?: string
): void {
  const payload: SavedCvSession = {
    cv,
    fileName: fileName || (cv.personalInfo?.name ? `${cv.personalInfo.name}_CV` : "CV_Uploaded"),
    savedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(`${CV_STRUCTURED_PREFIX}${userId}`, JSON.stringify(payload));
  // Keep skills in sync
  if (Array.isArray(cv.skills) && cv.skills.length > 0) {
    saveSessionCvSkills(userId, cv.skills);
  }
}

export function getSessionStructuredCv(userId: string): SavedCvSession | undefined {
  const raw = sessionStorage.getItem(`${CV_STRUCTURED_PREFIX}${userId}`);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as SavedCvSession;
    if (parsed && typeof parsed === "object" && parsed.cv && parsed.cv.personalInfo) {
      return parsed;
    }
    return undefined;
  } catch (error) {
    console.warn("Ignoring invalid saved structured CV.", error);
    return undefined;
  }
}

export function clearSessionCvSkills(): void {
  const keys = Array.from({ length: sessionStorage.length }, (_, index) =>
    sessionStorage.key(index)
  ).filter((key): key is string => key !== null);

  for (const key of keys) {
    if (key.startsWith(CV_SKILLS_PREFIX) || key.startsWith(CV_STRUCTURED_PREFIX)) {
      sessionStorage.removeItem(key);
    }
  }

  sessionStorage.removeItem(LEGACY_CV_SKILLS_KEY);
}

export function clearSessionProfile(): void {
  clearSessionCvSkills();
  sessionStorage.removeItem("target_job_description");
  sessionStorage.removeItem("interview_target_job");
  sessionStorage.removeItem("interview_target_role");
  sessionStorage.removeItem("job_application_batch");
}

