import type { NextFunction, Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { Errors } from "../utils/AppError";
import { betaFeedbackSchema, productEventSchema } from "../schemas/feedback.schemas";

export async function recordProductEventController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = productEventSchema.safeParse(req.body);
    if (!parsed.success) {
      throw Errors.validation("Invalid product event.");
    }

    await prisma.funnelEvent.create({
      data: {
        eventName: parsed.data.eventName,
        sessionId: parsed.data.sessionId,
      },
    });
    res.status(202).json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function submitBetaFeedbackController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = betaFeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      throw Errors.validation("Invalid beta feedback.");
    }

    const { sessionId, ...answers } = parsed.data;
    await prisma.funnelEvent.create({
      data: {
        eventName: "beta_feedback",
        sessionId,
        metadata: answers,
      },
    });
    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function deleteBetaFeedbackController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const sessionId = req.params.sessionId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
      throw Errors.validation("Invalid feedback session.");
    }

    const result = await prisma.funnelEvent.deleteMany({
      where: { sessionId },
    });
    if (result.count === 0) {
      throw Errors.notFound("Feedback not found.");
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
