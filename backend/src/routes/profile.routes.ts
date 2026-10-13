import { Router } from "express";
import { deleteMyAccount } from "../controllers/profile.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { submitAiTaskController } from "../controllers/aiJobs.controller";
import { aiSubmitRateLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/import", requireAuth, aiSubmitRateLimiter, submitAiTaskController("profile.import"));
router.delete("/account", requireAuth, deleteMyAccount);

export default router;
