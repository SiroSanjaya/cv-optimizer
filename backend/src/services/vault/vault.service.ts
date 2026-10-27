import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../../utils/prisma";
import { Errors } from "../../utils/AppError";
import { logger } from "../../utils/logger";
import { extractJson } from "../ai/jsonExtractor";
import {
  StarStoryInput,
  StarStoryUpdate,
  VaultStoryItem,
} from "../../types/vault.types";

const geminiApiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(geminiApiKey);
const AI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

/**
 * Generate a concise, Google X-Y-Z formula polished bullet point:
 * "Accomplished [X] as measured by [Y], by doing [Z]"
 */
export function generateXYZBullet(story: {
  action: string;
  result: string;
  skillsUsed: string[];
}): string {
  const primarySkill = story.skillsUsed.length > 0 ? ` using ${story.skillsUsed.slice(0, 3).join(", ")}` : "";
  const cleanedAction = story.action.replace(/\.$/, "").trim();
  const cleanedResult = story.result.replace(/\.$/, "").trim();

  // If action already starts with an action verb, combine gracefully
  return `${cleanedAction}${primarySkill}, achieving ${cleanedResult.toLowerCase()}.`;
}

export async function listVaultStories(
  userId: string,
  filter?: { category?: string; search?: string }
): Promise<VaultStoryItem[]> {
  const where: any = { userId };

  if (filter?.category && filter.category !== "all") {
    where.category = filter.category;
  }

  if (filter?.search && filter.search.trim()) {
    const term = filter.search.trim();
    where.OR = [
      { company: { contains: term, mode: "insensitive" } },
      { role: { contains: term, mode: "insensitive" } },
      { action: { contains: term, mode: "insensitive" } },
      { result: { contains: term, mode: "insensitive" } },
      { skillsUsed: { has: term } },
    ];
  }

  const stories = await prisma.experienceVaultItem.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });

  return stories as VaultStoryItem[];
}

export async function getVaultStory(
  id: string,
  userId: string
): Promise<VaultStoryItem> {
  const story = await prisma.experienceVaultItem.findFirst({
    where: { id, userId },
  });

  if (!story) {
    throw Errors.notFound("STAR story tidak ditemukan.");
  }

  return story as VaultStoryItem;
}

export async function createVaultStory(
  userId: string,
  data: StarStoryInput
): Promise<VaultStoryItem> {
  const polishedBullet =
    data.polishedBullet?.trim() ||
    generateXYZBullet({
      action: data.action,
      result: data.result,
      skillsUsed: data.skillsUsed,
    });

  const created = await prisma.experienceVaultItem.create({
    data: {
      userId,
      company: data.company,
      role: data.role,
      periodStart: data.periodStart || null,
      periodEnd: data.periodEnd || null,
      category: data.category,
      skillsUsed: data.skillsUsed,
      situation: data.situation,
      task: data.task,
      action: data.action,
      result: data.result,
      polishedBullet,
    },
  });

  return created as VaultStoryItem;
}

export async function updateVaultStory(
  id: string,
  userId: string,
  data: StarStoryUpdate
): Promise<VaultStoryItem> {
  const existing = await getVaultStory(id, userId);

  const updatedAction = data.action ?? existing.action;
  const updatedResult = data.result ?? existing.result;
  const updatedSkills = data.skillsUsed ?? existing.skillsUsed;

  const polishedBullet =
    data.polishedBullet !== undefined
      ? data.polishedBullet?.trim() || null
      : generateXYZBullet({
          action: updatedAction,
          result: updatedResult,
          skillsUsed: updatedSkills,
        });

  const updated = await prisma.experienceVaultItem.update({
    where: { id: existing.id },
    data: {
      ...(data.company ? { company: data.company } : {}),
      ...(data.role ? { role: data.role } : {}),
      ...(data.periodStart !== undefined ? { periodStart: data.periodStart || null } : {}),
      ...(data.periodEnd !== undefined ? { periodEnd: data.periodEnd || null } : {}),
      ...(data.category ? { category: data.category } : {}),
      ...(data.skillsUsed ? { skillsUsed: data.skillsUsed } : {}),
      ...(data.situation ? { situation: data.situation } : {}),
      ...(data.task ? { task: data.task } : {}),
      ...(data.action ? { action: data.action } : {}),
      ...(data.result ? { result: data.result } : {}),
      polishedBullet,
    },
  });

  return updated as VaultStoryItem;
}

export async function deleteVaultStory(
  id: string,
  userId: string
): Promise<{ success: boolean }> {
  await getVaultStory(id, userId);

  await prisma.experienceVaultItem.delete({
    where: { id },
  });

  return { success: true };
}

/**
 * AI-powered STAR Extractor:
 * Parses candidate's CV text or Structured CV and automatically breaks down
 * achievements into granular STAR stories so user doesn't start from scratch.
 */
export async function extractStarStoriesFromCv(
  rawOrStructuredCv: string
): Promise<StarStoryInput[]> {
  if (!geminiApiKey) {
    throw Errors.aiFailed();
  }

  const prompt = `You are a high-caliber Career Architect and STAR method specialist.
Analyze the following candidate CV content and identify the top 3 to 6 distinct, impactful professional achievements.
Deconstruct each achievement strictly into the STAR framework (Situation, Task, Action, Result).

RULES:
1. STRICT FACTUAL ACCURACY: Derive stories ONLY from the explicit facts, projects, and work history provided. Do NOT hallucinate companies, degrees, or unmentioned technologies.
2. CATEGORIES: Categorize each story into one of: "technical", "leadership", "architecture", "process_improvement", "crisis_handling", or "other".
3. QUANTIFIABLE RESULT: If metrics (%, ms, revenue, users, cost) exist in the text, highlight them in "result". If exact numbers are absent, capture the qualitative impact concretely.
4. ACTION & SKILLS: In "action", highlight the exact tools and problem-solving methodology used. Populate "skillsUsed" with individual tool/skill tags (e.g. ["PostgreSQL", "Redis", "Docker"]).
5. POLISHED BULLET: Formulate an executive-level resume bullet using the X-Y-Z formula: "Accomplished [X] as measured by [Y], by doing [Z]".

=== CV INPUT ===
${rawOrStructuredCv.slice(0, 10000)}
=== END CV INPUT ===

OUTPUT FORMAT:
Return ONLY a valid JSON array matching this schema:
[
  {
    "company": "Company or Project Name",
    "role": "Job Title / Role",
    "periodStart": "e.g. Jan 2023",
    "periodEnd": "e.g. Present",
    "category": "technical",
    "skillsUsed": ["React", "TypeScript", "Tailwind CSS"],
    "situation": "Bottleneck or initial business challenge faced.",
    "task": "Specific goal, milestone, or deliverable expected.",
    "action": "Concrete actions executed, technical implementation, and architecture.",
    "result": "Measurable business or technical outcome.",
    "polishedBullet": "Action-verb led XYZ resume bullet."
  }
]`;

  try {
    const model = genAI.getGenerativeModel({ model: AI_MODEL });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = extractJson<StarStoryInput[]>(responseText);

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid format: expected array of STAR stories");
    }

    return parsed.map((item) => ({
      company: item.company || "Experience",
      role: item.role || "Professional",
      periodStart: item.periodStart || "",
      periodEnd: item.periodEnd || "",
      category: item.category || "technical",
      skillsUsed: Array.isArray(item.skillsUsed) ? item.skillsUsed : ["General"],
      situation: item.situation || "Challenge context",
      task: item.task || "Role responsibility",
      action: item.action || "Technical implementation",
      result: item.result || "Achieved measurable project deliverables",
      polishedBullet: item.polishedBullet || undefined,
    }));
  } catch (err) {
    logger.error("extract_star_stories_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw Errors.aiFailed();
  }
}

/**
 * Deterministic keyword & relevance matcher for Vault stories against a target Job Description.
 * This runs at 0 token cost and sub-millisecond latency!
 */
export async function matchStoriesForJob(
  userId: string,
  jobDescription: string
): Promise<{
  matchedStories: Array<{
    story: VaultStoryItem;
    relevanceScore: number;
    matchedSkills: string[];
  }>;
  totalVaultStories: number;
}> {
  const stories = await listVaultStories(userId);
  if (stories.length === 0) {
    return { matchedStories: [], totalVaultStories: 0 };
  }

  const jdLower = jobDescription.toLowerCase();

  const scored = stories.map((story) => {
    let score = 0;
    const matchedSkills: string[] = [];

    // Check each skill against JD
    for (const skill of story.skillsUsed) {
      if (skill.length > 1 && jdLower.includes(skill.toLowerCase())) {
        score += 15;
        matchedSkills.push(skill);
      }
    }

    // Role match bonus
    if (story.role && jdLower.includes(story.role.toLowerCase())) {
      score += 25;
    }

    // Keyword hits in action / result
    const actionWords = story.action.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
    for (const word of actionWords) {
      if (jdLower.includes(word)) {
        score += 2;
      }
    }

    const cappedScore = Math.min(100, Math.max(10, score));

    return {
      story,
      relevanceScore: cappedScore,
      matchedSkills,
    };
  });

  // Sort descending by relevance score
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return {
    matchedStories: scored,
    totalVaultStories: stories.length,
  };
}
