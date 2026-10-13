import { Queue, type Job } from "bullmq";
import { randomUUID } from "crypto";
import { prisma } from "../../utils/prisma";
import { getRedisClient } from "../../utils/redis";
import { Errors } from "../../utils/AppError";
import { encryptJobValue, decryptJobValue } from "./jobEncryption";
import type { AiJobRequest } from "../../schemas/aiJob.schemas";

const AI_QUEUE_NAME = "cv-optimizer-ai";
const DEFAULT_MONTHLY_QUOTA = 10;

interface AiJobData {
  userId: string;
  payload: ReturnType<typeof encryptJobValue>;
}

export interface AiJobStatus {
  jobId: string;
  status: "waiting" | "active" | "delayed" | "completed" | "failed";
  result?: unknown;
  error?: string;
}

let aiQueue: Queue<AiJobData> | undefined;

export function getMonthlyQuota(): number {
  const configured = Number(process.env.AI_MONTHLY_QUOTA ?? DEFAULT_MONTHLY_QUOTA);
  if (!Number.isInteger(configured) || configured < 1) {
    throw new Error("AI_MONTHLY_QUOTA must be a positive integer.");
  }
  return configured;
}

function getQueue(): Queue<AiJobData> {
  if (!aiQueue) {
    aiQueue = new Queue<AiJobData>(AI_QUEUE_NAME, {
      connection: getRedisClient(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 2_000 },
        removeOnComplete: { age: 10 * 60, count: 1_000 },
        removeOnFail: { age: 24 * 60 * 60, count: 5_000 },
      },
    });
  }
  return aiQueue;
}

function utcMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function reserveMonthlyAction(userId: string, jobId: string): Promise<void> {
  const monthStart = utcMonthStart();
  const limit = getMonthlyQuota();

  await prisma.$transaction(async (tx) => {
    await tx.usageCredit.upsert({
      where: { userId },
      create: { userId, used: 0, limit, periodStart: monthStart },
      update: { limit },
    });

    await tx.usageCredit.updateMany({
      where: { userId, periodStart: { lt: monthStart } },
      data: { used: 0, limit, periodStart: monthStart },
    });

    const reservation = await tx.usageCredit.updateMany({
      where: { userId, periodStart: monthStart, used: { lt: limit } },
      data: { used: { increment: 1 }, limit },
    });
    if (reservation.count !== 1) {
      throw Errors.quotaExceeded();
    }

    await tx.aiJobReservation.create({
      data: { jobId, userId, periodStart: monthStart },
    });
  });
}

export async function settleMonthlyAction(
  jobId: string,
  outcome: "consumed" | "released"
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const reservation = await tx.aiJobReservation.findUnique({
      where: { jobId },
    });
    if (!reservation || reservation.status !== "reserved") return;

    const claimed = await tx.aiJobReservation.updateMany({
      where: { jobId, status: "reserved" },
      data: { status: outcome },
    });
    if (claimed.count !== 1 || outcome !== "released") return;

    await tx.usageCredit.updateMany({
      where: {
        userId: reservation.userId,
        periodStart: reservation.periodStart,
        used: { gt: 0 },
      },
      data: { used: { decrement: 1 } },
    });
  });
}

export async function pruneSettledReservations(): Promise<number> {
  const retentionCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const result = await prisma.aiJobReservation.deleteMany({
    where: {
      status: { in: ["consumed", "released"] },
      updatedAt: { lt: retentionCutoff },
    },
  });
  return result.count;
}

export async function submitAiJob(
  userId: string,
  request: AiJobRequest
): Promise<{ jobId: string; status: "waiting" }> {
  const encryptedPayload = encryptJobValue(request);
  const jobId = randomUUID();
  await reserveMonthlyAction(userId, jobId);

  try {
    await getQueue().add(request.task, {
      userId,
      payload: encryptedPayload,
    }, { jobId });
    return { jobId, status: "waiting" };
  } catch (error) {
    await settleMonthlyAction(jobId, "released");
    throw error;
  }
}

export async function getAiJobStatus(
  jobId: string,
  userId: string
): Promise<AiJobStatus> {
  const job: Job<AiJobData, ReturnType<typeof encryptJobValue>> | undefined =
    await getQueue().getJob(jobId);
  if (!job || job.data.userId !== userId) {
    throw Errors.notFound("AI job not found.");
  }

  const state = await job.getState();
  if (state === "completed" && job.returnvalue) {
    return {
      jobId,
      status: "completed",
      result: decryptJobValue(job.returnvalue),
    };
  }
  if (state === "failed") {
    return {
      jobId,
      status: "failed",
      error: "The AI task could not be completed. Please try again later.",
    };
  }
  if (state !== "waiting" && state !== "active" && state !== "delayed") {
    throw Errors.notFound("AI job not found.");
  }
  return { jobId, status: state };
}

export async function closeAiQueue(): Promise<void> {
  if (!aiQueue) return;
  const queue = aiQueue;
  aiQueue = undefined;
  await queue.close();
}
