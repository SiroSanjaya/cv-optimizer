import { Router } from "express";
import { importProfile } from "../controllers/profile.controller";

const router = Router();

router.post("/import", importProfile);

export default router;
