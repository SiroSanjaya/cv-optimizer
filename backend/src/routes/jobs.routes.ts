import { Router } from "express";
import {
  getRecommendedJobs,
  searchTalentController,
  generateInterviewInviteController,
  generateRecruiterPitchController,
  analyzeCustomJobController,
  importJobFromUrlController,
  importJobFromTextController,
  getOutcomeMetricsController,
} from "../controllers/jobs.controller";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware";
import { submitAiTaskController } from "../controllers/aiJobs.controller";
import { aiSubmitRateLimiter } from "../middleware/rateLimiter";

const router = Router();

// Job search & recommendations
router.get("/recommendations", optionalAuth, getRecommendedJobs);
router.post("/analyze-custom", optionalAuth, analyzeCustomJobController);
router.post("/outreach-pitch", optionalAuth, generateRecruiterPitchController);

// ── Job Importer ──────────────────────────────────────────────────────────────
// Import from a public job listing URL (LinkedIn, Glints, JobStreet, etc.)
router.post("/import-url", aiSubmitRateLimiter, importJobFromUrlController);
// Fallback: paste raw job description text
router.post("/import-text", aiSubmitRateLimiter, importJobFromTextController);

// ── Career Outcome Intelligence ───────────────────────────────────────────────
router.get("/outcome-metrics", requireAuth, getOutcomeMetricsController);

// HR & Recruiter Portal routes
router.post("/talent/search", optionalAuth, searchTalentController);
router.post("/talent/bulk-screen", requireAuth, aiSubmitRateLimiter, submitAiTaskController("jobs.bulk-screen"));
router.post("/talent/invite-template", optionalAuth, generateInterviewInviteController);

export default router;

