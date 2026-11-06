import { Router } from "express";
import {
  listVaultController,
  getVaultController,
  createVaultController,
  updateVaultController,
  deleteVaultController,
  extractFromCvController,
  matchForJobController,
} from "../controllers/vault.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// All vault routes require authentication
router.use(requireAuth);

router.get("/", listVaultController);
router.post("/", createVaultController);
router.post("/match-for-job", matchForJobController);

router.get("/:id", getVaultController);
router.put("/:id", updateVaultController);
router.delete("/:id", deleteVaultController);

export default router;
