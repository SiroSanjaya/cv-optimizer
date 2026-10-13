import { Router } from "express";
import {
  getRecommendedJobs,
  searchTalentController,
  generateInterviewInviteController,
  generateRecruiterPitchController,
  analyzeCustomJobController,
} from "../controllers/jobs.controller";
import { optionalAuth } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { submitAiTaskController } from "../controllers/aiJobs.controller";
import { aiSubmitRateLimiter } from "../middleware/rateLimiter";

const router = Router();

// Job search & recommendations
router.get("/recommendations", optionalAuth, getRecommendedJobs);
router.post("/analyze-custom", optionalAuth, analyzeCustomJobController);
router.post("/outreach-pitch", optionalAuth, generateRecruiterPitchController);

// HR & Recruiter Portal routes
router.post("/talent/search", optionalAuth, searchTalentController);
router.post("/talent/bulk-screen", requireAuth, aiSubmitRateLimiter, submitAiTaskController("jobs.bulk-screen"));
router.post("/talent/invite-template", optionalAuth, generateInterviewInviteController);

export default router;
