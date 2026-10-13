import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedisClient } from "../utils/redis";

const windowMinutes = Number(process.env.RATE_LIMIT_WINDOW_MINUTES ?? 15);
const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 60);

if (!Number.isFinite(windowMinutes) || windowMinutes < 1) {
  throw new Error("RATE_LIMIT_WINDOW_MINUTES must be a positive number.");
}
if (!Number.isInteger(maxRequests) || maxRequests < 1) {
  throw new Error("RATE_LIMIT_MAX_REQUESTS must be a positive integer.");
}

function sharedStore(prefix: string) {
  if (process.env.NODE_ENV !== "production") return undefined;
  return new RedisStore({
    prefix,
    sendCommand: (...args: string[]) =>
      getRedisClient().call(args[0], ...args.slice(1)) as Promise<string | number>,
  });
}

const apiStore = sharedStore("rate:api:");
const aiStore = sharedStore("rate:ai:");

export const apiRateLimiter = rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  max: maxRequests,
  ...(apiStore ? { store: apiStore } : {}),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests. Please slow down and try again shortly.",
  },
});

export const aiSubmitRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.userPayload?.userId ?? "unauthenticated",
  ...(aiStore ? { store: aiStore } : {}),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "AI task limit reached. Please wait before submitting another task.",
    code: "RATE_LIMITED",
  },
});
