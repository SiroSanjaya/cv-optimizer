import { Router } from "express";
import {
  getAiJobStatusController,
  submitAiJobController,
} from "../controllers/aiJobs.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { aiSubmitRateLimiter } from "../middleware/rateLimiter";

const router = Router();

router.use(requireAuth);
router.post("/", aiSubmitRateLimiter, submitAiJobController);
router.get("/:jobId", getAiJobStatusController);

export default router;
