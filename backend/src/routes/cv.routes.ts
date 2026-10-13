import { Router } from "express";
import { uploadCv } from "../middleware/upload";
import { requireAuth } from "../middleware/auth.middleware";
import { submitAiTaskController } from "../controllers/aiJobs.controller";
import { aiSubmitRateLimiter } from "../middleware/rateLimiter";
import {
  analyzeCv,
  downloadCvDocx,
  downloadCvPdf,
  downloadCoverLetterPdf,
} from "../controllers/cv.controller";

const router = Router();

router.post("/analyze", requireAuth, aiSubmitRateLimiter, uploadCv.single("cv"), analyzeCv);
router.post("/generate", requireAuth, aiSubmitRateLimiter, submitAiTaskController("cv.generate"));
router.post("/cover-letter", requireAuth, aiSubmitRateLimiter, submitAiTaskController("cv.cover-letter"));
router.post("/interview-prep", requireAuth, aiSubmitRateLimiter, submitAiTaskController("cv.interview-prep"));
router.post("/interview/start", requireAuth, aiSubmitRateLimiter, submitAiTaskController("cv.interview-start"));
router.post("/interview/evaluate", requireAuth, aiSubmitRateLimiter, submitAiTaskController("cv.interview-evaluate"));
router.post("/pdf", requireAuth, downloadCvPdf);
router.post("/cover-letter/pdf", requireAuth, downloadCoverLetterPdf);
router.post("/docx", requireAuth, downloadCvDocx);

export default router;
