import { Request, Response, NextFunction } from "express";
import { aiJobRequestSchema, type AiJobTask } from "../schemas/aiJob.schemas";
import { getAiJobStatus, submitAiJob } from "../services/ai/aiTasks";
import { Errors } from "../utils/AppError";

export async function submitAiJobController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = aiJobRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw Errors.validation("Invalid AI task request.");
    }
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    const job = await submitAiJob(userId, parsed.data);
    res.status(202).json({ success: true, ...job });
  } catch (error) {
    next(error);
  }
}

export function submitAiTaskController(task: AiJobTask) {
  return async function enqueueTask(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const parsed = aiJobRequestSchema.safeParse({ task, input: req.body });
      if (!parsed.success) {
        throw Errors.validation("Invalid AI task request.");
      }
      const userId = req.userPayload?.userId;
      if (!userId) throw Errors.unauthorized();

      const job = await submitAiJob(userId, parsed.data);
      res.status(202).json({ success: true, ...job });
    } catch (error) {
      next(error);
    }
  };
}

export async function getAiJobStatusController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();
    const status = await getAiJobStatus(req.params.jobId, userId);
    res.json({ success: true, ...status });
  } catch (error) {
    next(error);
  }
}
