import jwt from "jsonwebtoken";

const DEVELOPMENT_JWT_SECRET = "local-only-cv-optimizer-secret-do-not-use-in-production";
const JWT_EXPIRES_IN = "7d";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.length < 32) {
      throw new Error("JWT_SECRET must be set to at least 32 characters in production.");
    }
    return secret;
  }
  return secret || DEVELOPMENT_JWT_SECRET;
}

export function validateJwtConfiguration(): void {
  getJwtSecret();
}

export interface TokenPayload {
  userId: string;
  email: string;
  name?: string | null;
  picture?: string | null;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    return null;
  }
}
