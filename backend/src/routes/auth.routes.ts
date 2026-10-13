import { Router } from "express";
import {
  getCurrentUser,
  googleLoginWithToken,
  logout,
} from "../controllers/auth.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/me", optionalAuth, getCurrentUser);
router.post("/google", googleLoginWithToken);
router.post("/logout", logout);

export default router;
