import { Router } from "express";
import {
  listApplications,
  getApplicationMetrics,
  createApplication,
  updateApplication,
  deleteApplication,
} from "../controllers/applications.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.use(requireAuth);

router.get("/", listApplications);
router.get("/metrics", getApplicationMetrics);
router.post("/", createApplication);
router.patch("/:id", updateApplication);
router.delete("/:id", deleteApplication);

export default router;
