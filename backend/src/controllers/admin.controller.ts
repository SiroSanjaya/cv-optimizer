import type { NextFunction, Request, Response } from "express";
import { Errors } from "../utils/AppError";
import { getAdminDashboard } from "../services/adminDashboard.service";

export async function getAdminDashboardController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawDays = req.query.days === undefined ? 30 : Number(req.query.days);
    if (!Number.isInteger(rawDays) || rawDays < 1 || rawDays > 90) {
      throw Errors.validation("days must be an integer between 1 and 90.");
    }

    res.json({
      success: true,
      dashboard: await getAdminDashboard(rawDays),
    });
  } catch (error) {
    next(error);
  }
}
