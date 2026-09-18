import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import cvRoutes from "./routes/cv.routes";
import authRoutes from "./routes/auth.routes";
import applicationsRoutes from "./routes/applications.routes";
import jobsRoutes from "./routes/jobs.routes";
import profileRoutes from "./routes/profile.routes";
import { apiRateLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

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
  app.use(apiRateLimiter);

  app.get("/api/health", (_req, res) => {
    res.json({ success: true, status: "ok", timestamp: new Date().toISOString() });
  });

  // Mount feature routes
  app.use("/api/auth", authRoutes);
  app.use("/api/cv", cvRoutes);
  app.use("/api/applications", applicationsRoutes);
  app.use("/api/jobs", jobsRoutes);
  app.use("/api/profile", profileRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
