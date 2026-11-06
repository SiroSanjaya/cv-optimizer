import type { NextFunction, Request, Response } from "express";
import { Errors } from "../utils/AppError";

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const allowedEmails = new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
  const email = req.userPayload?.email?.trim().toLowerCase();

  if (!email || !allowedEmails.has(email)) {
    next(Errors.forbidden("Akun ini tidak memiliki akses admin."));
    return;
  }

  next();
}
