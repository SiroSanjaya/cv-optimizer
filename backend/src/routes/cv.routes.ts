import { Router } from "express";
import { uploadCv } from "../middleware/upload";
import {
  analyzeCv,
  downloadCvDocx,
  downloadCvPdf,
  generateCv,
  generateCoverLetterController,
  getInterviewPrepController,
  startMockInterviewSession,
  evaluateMockInterviewAnswerController,
} from "../controllers/cv.controller";

const router = Router();

router.post("/analyze", uploadCv.single("cv"), analyzeCv);
router.post("/generate", generateCv);
router.post("/cover-letter", generateCoverLetterController);
router.post("/interview-prep", getInterviewPrepController);
router.post("/interview/start", startMockInterviewSession);
router.post("/interview/evaluate", evaluateMockInterviewAnswerController);
router.post("/pdf", downloadCvPdf);
router.post("/docx", downloadCvDocx);

export default router;


