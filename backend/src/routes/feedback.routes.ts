import { Router } from "express";
import {
  deleteBetaFeedbackController,
  recordProductEventController,
  submitBetaFeedbackController,
} from "../controllers/feedback.controller";
import { feedbackRateLimiter } from "../middleware/rateLimiter";

const router = Router();

router.use(feedbackRateLimiter);
router.post("/events", recordProductEventController);
router.post("/", submitBetaFeedbackController);
router.delete("/:sessionId", deleteBetaFeedbackController);

export default router;
