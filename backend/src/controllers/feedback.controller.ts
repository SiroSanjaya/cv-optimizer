import type { NextFunction, Request, Response } from "express";
import { LedgerEntryType, Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { Errors } from "../utils/AppError";
import { betaFeedbackSchema, productEventSchema } from "../schemas/feedback.schemas";
import { getMonthlyQuota } from "../services/ai/aiTasks";
import { assessFeedbackQuality } from "../services/feedbackQuality.service";

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
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    const parsed = betaFeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      throw Errors.validation("Invalid beta feedback.");
    }

    const { sessionId, ...answers } = parsed.data;
    const existingReward = await prisma.betaFeedbackReward.findUnique({
      where: { userId },
    });

    if (existingReward) {
      await prisma.funnelEvent.create({
        data: {
          eventName: "beta_feedback",
          sessionId,
          userId,
          metadata: answers,
        },
      });
      const usage = await prisma.usageCredit.findUnique({ where: { userId } });
      return res.status(201).json({
        success: true,
        feedbackEligible: false,
        alreadyRewarded: true,
        bonusGranted: 0,
        bonusCredits: usage?.bonusCredits ?? 0,
        tip: "Bonus feedback sudah pernah diklaim di akun ini. Terima kasih untuk masukan tambahannya.",
      });
    }

    const assessment = await assessFeedbackQuality(answers.feedbackDetail);
    await prisma.funnelEvent.create({
      data: {
        eventName: "beta_feedback",
        sessionId,
        userId,
        metadata: answers,
      },
    });

    if (!assessment.eligible) {
      return res.status(201).json({
        success: true,
        feedbackEligible: false,
        alreadyRewarded: false,
        bonusGranted: 0,
        tip: assessment.tip,
      });
    }

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const monthlyQuota = getMonthlyQuota();
    let reward;

    try {
      reward = await prisma.$transaction(async (tx) => {
        const createdReward = await tx.betaFeedbackReward.create({
          data: { userId, credits: 2 },
        });
        const usage = await tx.usageCredit.upsert({
          where: { userId },
          create: {
            userId,
            used: 0,
            limit: monthlyQuota,
            bonusCredits: createdReward.credits,
            periodStart: monthStart,
          },
          update: { bonusCredits: { increment: createdReward.credits } },
        });
        const monthlyRemaining =
          usage.periodStart >= monthStart
            ? Math.max(0, usage.limit - usage.used)
            : monthlyQuota;

        await tx.creditLedgerEntry.create({
          data: {
            userId,
            amount: createdReward.credits,
            balanceAfter: monthlyRemaining + usage.bonusCredits,
            type: LedgerEntryType.GRANT,
            reason: "Beta feedback reward",
            referenceId: createdReward.id,
          },
        });

        return { granted: createdReward.credits, bonusCredits: usage.bonusCredits };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const concurrentReward = await prisma.betaFeedbackReward.findUnique({
          where: { userId },
        });
        if (!concurrentReward) throw error;

        const usage = await prisma.usageCredit.findUnique({ where: { userId } });
        reward = { granted: 0, bonusCredits: usage?.bonusCredits ?? 0 };
      } else {
        throw error;
      }
    }

    res.status(201).json({
      success: true,
      feedbackEligible: true,
      alreadyRewarded: reward.granted === 0,
      bonusGranted: reward.granted,
      bonusCredits: reward.bonusCredits,
      tip: assessment.tip,
    });
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
