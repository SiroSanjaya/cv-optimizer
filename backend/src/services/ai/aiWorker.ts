import "dotenv/config";
import { Worker, type Job } from "bullmq";
import type { AiJobRequest } from "../../schemas/aiJob.schemas";
import { decryptJobValue, encryptJobValue } from "./jobEncryption";
import { processAiJob } from "./aiJobProcessor";
import { getRedisClient } from "../../utils/redis";
import { logger } from "../../utils/logger";
import { prisma } from "../../utils/prisma";
import { validateJobEncryptionKey } from "./jobEncryption";
import { pruneSettledReservations, settleMonthlyAction } from "./aiTasks";

interface AiJobData {
  userId: string;
  payload: Parameters<typeof decryptJobValue<AiJobRequest>>[0];
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for the AI worker.");
  }
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required for the AI worker.");
  }
  validateJobEncryptionKey();

  const concurrency = Number(process.env.AI_WORKER_CONCURRENCY ?? 4);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 32) {
    throw new Error("AI_WORKER_CONCURRENCY must be an integer between 1 and 32.");
  }

  await prisma.$connect();
  await getRedisClient().ping();

  const worker = new Worker<AiJobData, ReturnType<typeof encryptJobValue>>(
    "cv-optimizer-ai",
    async (job: Job<AiJobData>) => {
      try {
        const request = decryptJobValue<AiJobRequest>(job.data.payload);
        const result = await processAiJob(request);
        return encryptJobValue(result);
      } catch (error) {
        logger.error("ai_job_failed", {
          task: job.name,
          message: error instanceof Error ? error.message : "unknown",
        });
        throw new Error("AI task failed.");
      }
    },
    {
      connection: getRedisClient(),
      concurrency,
      lockDuration: 5 * 60 * 1000,
      stalledInterval: 30_000,
    }
  );

  worker.on("failed", (job) => {
    logger.error("ai_job_attempt_failed", {
      task: job?.name ?? "unknown",
      attemptsMade: job?.attemptsMade ?? 0,
    });
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      void settleMonthlyAction(job.id ?? "", "released").catch((error: unknown) => {
        logger.error("ai_job_quota_release_failed", {
          jobId: job.id ?? "unknown",
          message: error instanceof Error ? error.message : "unknown",
        });
      });
    }
  });
  worker.on("completed", (job) => {
    void settleMonthlyAction(job.id ?? "", "consumed").catch((error: unknown) => {
      logger.error("ai_job_quota_settlement_failed", {
        jobId: job.id ?? "unknown",
        message: error instanceof Error ? error.message : "unknown",
      });
    });
  });
  worker.on("error", (error) => {
    logger.error("ai_worker_error", { message: error.message });
  });
  const pruneReservations = async () => {
    try {
      const pruned = await pruneSettledReservations();
      if (pruned > 0) logger.info("ai_job_reservations_pruned", { count: pruned });
    } catch (error) {
      logger.error("ai_job_reservation_prune_failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  };
  await pruneReservations();
  const reservationCleanup = setInterval(() => void pruneReservations(), 24 * 60 * 60 * 1000);
  reservationCleanup.unref();
  logger.info("ai_worker_started", { concurrency });

  const shutdown = async (signal: string) => {
    logger.info("ai_worker_shutdown_started", { signal });
    try {
      clearInterval(reservationCleanup);
      await worker.close();
      await getRedisClient().quit();
      await prisma.$disconnect();
    } catch (error) {
      logger.error("ai_worker_shutdown_failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
      process.exitCode = 1;
    }
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error: unknown) => {
  logger.error("ai_worker_start_failed", {
    message: error instanceof Error ? error.message : "unknown",
  });
  process.exitCode = 1;
});
