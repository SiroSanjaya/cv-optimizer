import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import cvRoutes from "./routes/cv.routes";
import authRoutes from "./routes/auth.routes";
import applicationsRoutes from "./routes/applications.routes";
import jobsRoutes from "./routes/jobs.routes";
import profileRoutes from "./routes/profile.routes";
import aiJobsRoutes from "./routes/aiJobs.routes";
import { apiRateLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { prisma } from "./utils/prisma";
import { getRedisClient } from "./utils/redis";
import { logger } from "./utils/logger";

export function createApp() {
  const app = express();

  const trustProxyHops = process.env.NODE_ENV === "production"
    ? Number(process.env.TRUST_PROXY_HOPS ?? 1)
    : 0;
  app.set("trust proxy", trustProxyHops);

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  app.use(
    cors({
      origin: frontendUrl,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ success: true, status: "ok", timestamp: new Date().toISOString() });
  });
  app.get("/api/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      await getRedisClient().ping();
      res.json({ success: true, status: "ready" });
    } catch (error) {
      logger.warn("readiness_check_failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
      res.status(503).json({ success: false, status: "not_ready" });
    }
  });

  app.use(apiRateLimiter);

  // Mount feature routes
  app.use("/api/ai/jobs", aiJobsRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/cv", cvRoutes);
  app.use("/api/applications", applicationsRoutes);
  app.use("/api/jobs", jobsRoutes);
  app.use("/api/profile", profileRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
