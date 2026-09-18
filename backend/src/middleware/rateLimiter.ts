import rateLimit from "express-rate-limit";

const windowMinutes = Number(process.env.RATE_LIMIT_WINDOW_MINUTES ?? 15);
const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 60);

export const apiRateLimiter = rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests. Please slow down and try again shortly.",
  },
});
