import { Router } from "express";
import {
  deleteBetaFeedbackController,
  recordProductEventController,
  submitBetaFeedbackController,
} from "../controllers/feedback.controller";
import { requireAuth } from "../middleware/auth.middleware";
import {
  betaFeedbackRateLimiter,
  feedbackRateLimiter,
} from "../middleware/rateLimiter";

const router = Router();

router.use(feedbackRateLimiter);
router.post("/events", recordProductEventController);
router.post("/", requireAuth, betaFeedbackRateLimiter, submitBetaFeedbackController);
router.delete("/:sessionId", deleteBetaFeedbackController);

export default router;
