import { Router } from "express";
import {
  getRecommendedJobs,
  searchTalentController,
  bulkScreenCvsController,
  generateInterviewInviteController,
  generateRecruiterPitchController,
  analyzeCustomJobController,
} from "../controllers/jobs.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

// Job search & recommendations
router.get("/recommendations", optionalAuth, getRecommendedJobs);
router.post("/analyze-custom", optionalAuth, analyzeCustomJobController);
router.post("/outreach-pitch", optionalAuth, generateRecruiterPitchController);

// HR & Recruiter Portal routes
router.post("/talent/search", optionalAuth, searchTalentController);
router.post("/talent/bulk-screen", optionalAuth, bulkScreenCvsController);
router.post("/talent/invite-template", optionalAuth, generateInterviewInviteController);

export default router;
