import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "../services/auth/jwt";
import { Errors } from "../utils/AppError";

declare global {
  namespace Express {
    interface Request {
      userPayload?: TokenPayload;
    }
  }
}

export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const token = extractToken(req);
  if (!token) {
    return next(Errors.unauthorized("Please log in to continue."));
  }

  const payload = verifyToken(token);
  if (!payload) {
    return next(Errors.unauthorized("Session expired or invalid. Please log in again."));
  }

  req.userPayload = payload;
  next();
}

export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.userPayload = payload;
    }
  }
  next();
}
