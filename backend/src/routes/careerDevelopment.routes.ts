import { Router } from "express";
import {
  analyzeCareerDevelopment,
  generateCareerDevelopmentPlan,
  getCareerDevelopmentPlan,
  updateCareerDevelopmentProgress,
} from "../controllers/careerDevelopment.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { aiSubmitRateLimiter } from "../middleware/rateLimiter";

const router = Router();

router.use(requireAuth);
router.get("/plan", getCareerDevelopmentPlan);
router.post("/analyze", analyzeCareerDevelopment);
router.post("/plan", aiSubmitRateLimiter, generateCareerDevelopmentPlan);
router.patch("/progress", updateCareerDevelopmentProgress);

export default router;
