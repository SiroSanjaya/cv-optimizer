import { Router } from "express";
import { deleteMyAccount } from "../controllers/profile.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { submitAiTaskController } from "../controllers/aiJobs.controller";
import { aiSubmitRateLimiter } from "../middleware/rateLimiter";
import {
  getCareerProfile,
  listCvVersions,
  saveCareerProfile,
} from "../controllers/careerProfile.controller";

const router = Router();

router.get("/", requireAuth, getCareerProfile);
router.put("/", requireAuth, saveCareerProfile);
router.get("/cv-versions", requireAuth, listCvVersions);
router.post("/import", requireAuth, aiSubmitRateLimiter, submitAiTaskController("profile.import"));
router.delete("/account", requireAuth, deleteMyAccount);

export default router;
