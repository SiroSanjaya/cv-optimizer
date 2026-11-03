import { JobRequirementMatch } from "../../types/cv.types";

const SCORE_BY_STATUS: Record<JobRequirementMatch["status"], number> = {
  Supported: 1,
  Partial: 0.5,
  Gap: 0,
};

export function deduplicateJobRequirements(
  requirements: JobRequirementMatch[]
): JobRequirementMatch[] {
  const uniqueRequirements = new Map<string, JobRequirementMatch["status"]>();
  const uniqueMatches = new Map<string, JobRequirementMatch>();

  for (const match of requirements) {
    const key = match.requirement.trim().toLowerCase().replace(/\s+/g, " ");
    if (!key) continue;

    const currentStatus = uniqueRequirements.get(key);
    if (
      currentStatus === undefined ||
      SCORE_BY_STATUS[match.status] < SCORE_BY_STATUS[currentStatus]
    ) {
      uniqueRequirements.set(key, match.status);
      uniqueMatches.set(key, match);
    }
  }

  return [...uniqueMatches.values()];
}

export function calculateEvidenceMatchScore(
  requirements: JobRequirementMatch[]
): number | null {
  const uniqueRequirements = deduplicateJobRequirements(requirements);
  if (uniqueRequirements.length === 0) return null;

  const evidencePoints = uniqueRequirements.reduce(
    (total, match) => total + SCORE_BY_STATUS[match.status],
    0
  );

  return Math.round((evidencePoints / uniqueRequirements.length) * 100);
}
