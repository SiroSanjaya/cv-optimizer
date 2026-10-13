import { validateJwtConfiguration } from "../services/auth/jwt";
import { validateJobEncryptionKey } from "../services/ai/jobEncryption";
import { getMonthlyQuota } from "../services/ai/aiTasks";

export function validateProductionConfiguration(): void {
  validateJwtConfiguration();
  getMonthlyQuota();
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 1);
  if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 5) {
    throw new Error("TRUST_PROXY_HOPS must be an integer between 0 and 5.");
  }

  if (process.env.NODE_ENV !== "production") return;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in production.");
  }
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required in production.");
  }
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is required in production.");
  }
  let redisUrl: URL;
  try {
    redisUrl = new URL(process.env.REDIS_URL);
  } catch {
    throw new Error("REDIS_URL must be a valid absolute URL.");
  }
  if (!["redis:", "rediss:"].includes(redisUrl.protocol)) {
    throw new Error("REDIS_URL must use redis:// or rediss://.");
  }
  if (!process.env.FRONTEND_URL) {
    throw new Error("FRONTEND_URL is required in production.");
  }
  let frontendUrl: URL;
  try {
    frontendUrl = new URL(process.env.FRONTEND_URL);
  } catch {
    throw new Error("FRONTEND_URL must be a valid absolute URL.");
  }
  if (
    frontendUrl.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(frontendUrl.hostname)
  ) {
    throw new Error("FRONTEND_URL must use HTTPS in production.");
  }
  validateJobEncryptionKey();
}
