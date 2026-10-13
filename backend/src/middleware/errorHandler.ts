import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { AppError, Errors } from "../utils/AppError";
import { logger } from "../utils/logger";
import { MAX_FILE_SIZE_MB } from "./upload";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: "Not found.",
    code: "NOT_FOUND",
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof multer.MulterError) {
    const mapped =
      err.code === "LIMIT_FILE_SIZE"
        ? Errors.fileTooLarge(MAX_FILE_SIZE_MB)
        : Errors.invalidFileType();
    return res.status(mapped.statusCode).json({
      success: false,
      error: mapped.userMessage,
      code: mapped.code,
    });
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error("app_error", { message: err.message, status: err.statusCode });
    }
    return res.status(err.statusCode).json({
      success: false,
      error:
        err.statusCode >= 500 && err.code === "INTERNAL_ERROR"
          ? "Something went wrong on our end. Please try again."
          : err.userMessage,
      code: err.code,
    });
  }

  logger.error("unhandled_error", {
    message: err instanceof Error ? err.message : "unknown",
  });

  return res.status(500).json({
    success: false,
    error: "Something went wrong on our end. Please try again.",
    code: "INTERNAL_ERROR",
  });
}
