import { Errors } from "../../utils/AppError";

/**
 * LLMs occasionally wrap JSON in markdown fences or add stray text.
 * This extracts and parses the first valid JSON object in the string.
 */
export function extractJson<T>(raw: string): T {
  let text = raw.trim();

  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // Fallback: grab from first { to last }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw Errors.malformedAiResponse();
  }
  const jsonSlice = text.slice(start, end + 1);

  try {
    return JSON.parse(jsonSlice) as T;
  } catch {
    throw Errors.malformedAiResponse();
  }
}
