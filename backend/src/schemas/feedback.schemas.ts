import { z } from "zod";

export const productEventSchema = z.object({
  eventName: z.enum([
    "landing_viewed",
    "optimize_opened",
    "analysis_completed",
    "optimization_completed",
    "cv_exported",
    "tracker_saved",
    "optimization_restarted",
  ]),
  sessionId: z.string().uuid(),
}).strict();

export const betaFeedbackSchema = z.object({
  sessionId: z.string().uuid(),
  feedbackDetail: z.string().trim().min(30).max(1200),
  qualityReviewConsent: z.literal(true),
  applicationFrequency: z.enum(["three_plus_weekly", "one_to_two_weekly", "monthly", "exploring"]),
  valueRating: z.number().int().min(1).max(5),
  mainValue: z.enum([
    "cv_tailoring",
    "match_analysis",
    "cover_letter",
    "application_tracker",
    "job_search",
  ]),
  reuseIntent: z.enum(["yes", "maybe", "no"]),
  willingnessToPay: z.enum([
    "free_only",
    "under_25k",
    "25k_to_50k",
    "50k_to_100k",
    "over_100k",
    "one_time",
    "not_sure",
  ]),
  mainBlocker: z.enum([
    "too_much_effort",
    "results_not_trustworthy",
    "job_sources",
    "missing_workflow",
    "price",
    "other",
  ]),
}).strict();
