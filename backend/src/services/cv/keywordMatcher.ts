import { StructuredCv } from "../../types/cv.types";

/**
 * Lightweight deterministic keyword extraction used to give the AI a head
 * start and to sanity-check its output. Not a replacement for semantic
 * matching, just cheap pre/post-processing to reduce reliance on the model.
 */

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "you", "your", "are", "will", "our", "a",
  "an", "to", "of", "in", "on", "is", "as", "we", "or", "at", "this",
  "that", "be", "have", "has", "their", "job", "role", "years", "year",
]);

export function extractKeywordsFromText(text: string, limit = 25): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9+.#/\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

export function flattenCvSkillsText(cv: StructuredCv): string {
  return [
    cv.skills.join(" "),
    cv.projects.flatMap((p) => p.technologies).join(" "),
    cv.experience.flatMap((e) => e.bullets).join(" "),
  ]
    .join(" ")
    .toLowerCase();
}
