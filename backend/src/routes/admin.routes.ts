import { Router } from "express";
import { getAdminDashboardController } from "../controllers/admin.controller";
import { requireAdmin } from "../middleware/admin.middleware";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.use(requireAuth, requireAdmin);
router.get("/dashboard", getAdminDashboardController);

export default router;
