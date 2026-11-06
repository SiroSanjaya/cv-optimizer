import { prisma } from "../../utils/prisma";
import { Errors } from "../../utils/AppError";
import { logger } from "../../utils/logger";
import type { Prisma } from "@prisma/client";
import { LedgerEntryType, PaymentStatus } from "@prisma/client";

export interface AiCostRates {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
}

export function getAiCostRates(): AiCostRates | null {
  const input = process.env.AI_COST_INPUT_USD_PER_MILLION?.trim();
  const output = process.env.AI_COST_OUTPUT_USD_PER_MILLION?.trim();
  if (!input && !output) return null;
  if (!input || !output) {
    throw new Error(
      "AI_COST_INPUT_USD_PER_MILLION and AI_COST_OUTPUT_USD_PER_MILLION must be configured together."
    );
  }

  const inputUsdPerMillion = Number(input);
  const outputUsdPerMillion = Number(output);
  if (
    !Number.isFinite(inputUsdPerMillion) ||
    inputUsdPerMillion < 0 ||
    !Number.isFinite(outputUsdPerMillion) ||
    outputUsdPerMillion < 0
  ) {
    throw new Error("AI cost rates must be finite non-negative numbers.");
  }
  return { inputUsdPerMillion, outputUsdPerMillion };
}

export function estimateCostUsd(promptTokens: number, completionTokens: number): number {
  const rates = getAiCostRates();
  if (!rates) return 0;
  const promptCost =
    (promptTokens / 1_000_000) * rates.inputUsdPerMillion;
  const completionCost =
    (completionTokens / 1_000_000) * rates.outputUsdPerMillion;
  return Number((promptCost + completionCost).toFixed(6));
}

function getUsdToIdrRate(): number {
  const configured = process.env.USD_TO_IDR_RATE?.trim();
  if (!configured) return 16_000;
  const rate = Number(configured);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("USD_TO_IDR_RATE must be a positive finite number.");
  }
  return rate;
}

/**
 * Get current balance for a user from their UsageCredit or compute from ledger
 */
export async function getUserCreditBalance(userId: string): Promise<{
  credits: number;
  usedCredits: number;
  remainingCredits: number;
}> {
  const credit = await prisma.usageCredit.findUnique({
    where: { userId },
  });

  if (!credit) {
    return { credits: 10, usedCredits: 0, remainingCredits: 10 };
  }

  const remaining = Math.max(0, credit.limit - credit.used);
  return {
    credits: credit.limit,
    usedCredits: credit.used,
    remainingCredits: remaining,
  };
}

/**
 * Atomic Grant credits with ledger logging
 */
export async function grantCredits(
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string
): Promise<{ newBalance: number }> {
  if (amount <= 0) throw Errors.validation("Credit grant amount must be positive.");

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.usageCredit.upsert({
      where: { userId },
      create: { userId, used: 0, limit: 10 + amount },
      update: { limit: { increment: amount } },
    });

    const balanceAfter = existing.limit - existing.used;

    await tx.creditLedgerEntry.create({
      data: {
        userId,
        amount,
        balanceAfter,
        type: LedgerEntryType.GRANT,
        reason,
        referenceId,
      },
    });

    return { newBalance: balanceAfter };
  });
}

/**
 * Atomic Deduct credits with ledger logging
 */
export async function deductCredits(
  userId: string,
  amount = 1,
  reason: string,
  jobId?: string
): Promise<{ remaining: number }> {
  return await prisma.$transaction(async (tx) => {
    const record = await tx.usageCredit.findUnique({ where: { userId } });
    const currentLimit = record?.limit ?? 10;
    const currentUsed = record?.used ?? 0;

    if (currentUsed + amount > currentLimit) {
      throw Errors.quotaExceeded();
    }

    const updated = await tx.usageCredit.update({
      where: { userId },
      data: { used: { increment: amount } },
    });

    const balanceAfter = updated.limit - updated.used;

    await tx.creditLedgerEntry.create({
      data: {
        userId,
        amount: -amount,
        balanceAfter,
        type: LedgerEntryType.USAGE,
        reason,
        jobId,
      },
    });

    return { remaining: balanceAfter };
  });
}

/**
 * Automatic Recovery flow: Refund credit if an optimization job failed
 */
export async function refundCredits(
  userId: string,
  amount = 1,
  reason: string,
  jobId?: string
): Promise<{ restoredBalance: number }> {
  return await prisma.$transaction(async (tx) => {
    const record = await tx.usageCredit.findUnique({ where: { userId } });
    if (!record) return { restoredBalance: 10 };

    const newUsed = Math.max(0, record.used - amount);

    const updated = await tx.usageCredit.update({
      where: { userId },
      data: { used: newUsed },
    });

    const balanceAfter = updated.limit - updated.used;

    await tx.creditLedgerEntry.create({
      data: {
        userId,
        amount,
        balanceAfter,
        type: LedgerEntryType.REFUND,
        reason: `Auto-Recovery: ${reason}`,
        jobId,
      },
    });

    logger.info("credit_auto_refunded", { userId, amount, jobId, reason });

    return { restoredBalance: balanceAfter };
  });
}

/**
 * Log AI token usage and calculate costs
 */
export async function logAiCost(entry: {
  userId?: string;
  jobId?: string;
  taskType: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  retryCount?: number;
  status?: string;
  error?: string;
}): Promise<void> {
  try {
    const pTokens = entry.promptTokens || 0;
    const cTokens = entry.completionTokens || 0;
    const totalTokens = pTokens + cTokens;
    const estimatedCostUsd = estimateCostUsd(pTokens, cTokens);

    await prisma.aiCostLog.create({
      data: {
        userId: entry.userId || null,
        jobId: entry.jobId || null,
        taskType: entry.taskType,
        model: entry.model || "unknown",
        promptTokens: pTokens,
        completionTokens: cTokens,
        totalTokens,
        estimatedCostUsd,
        latencyMs: entry.latencyMs || 0,
        retryCount: entry.retryCount || 0,
        status: entry.status || "success",
        error: entry.error ? entry.error.slice(0, 500) : null,
      },
    });
  } catch (err) {
    logger.warn("failed_to_log_ai_cost", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Track Funnel Events
 */
export async function trackFunnelEvent(
  eventName: string,
  userId?: string,
  sessionId?: string,
  metadata?: Prisma.InputJsonValue
): Promise<void> {
  try {
    await prisma.funnelEvent.create({
      data: {
        eventName,
        userId: userId || null,
        sessionId: sessionId || null,
        metadata,
      },
    });
  } catch (err) {
    logger.warn("funnel_event_track_failed", {
      eventName,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Idempotent Payment Webhook Processor (Midtrans / Stripe / Xendit ready)
 */
export async function processPaymentWebhook(params: {
  orderId: string;
  idempotencyKey: string;
  userId: string;
  gateway: string;
  amount: number;
  creditsToGrant: number;
  paymentStatus: "PAID" | "FAILED";
  paymentMethod?: string;
  rawPayload?: any;
}): Promise<{
  processed: boolean;
  duplicate: boolean;
  status: string;
}> {
  // Idempotency check: see if transaction already exists and is finalized
  const existing = await prisma.paymentTransaction.findUnique({
    where: { idempotencyKey: params.idempotencyKey },
  });

  if (existing && existing.status === PaymentStatus.PAID) {
    return { processed: true, duplicate: true, status: existing.status };
  }

  if (params.paymentStatus !== "PAID") {
    await prisma.paymentTransaction.upsert({
      where: { idempotencyKey: params.idempotencyKey },
      create: {
        idempotencyKey: params.idempotencyKey,
        orderId: params.orderId,
        userId: params.userId,
        gateway: params.gateway,
        amount: params.amount,
        creditsGranted: 0,
        status: PaymentStatus.FAILED,
        paymentMethod: params.paymentMethod,
        rawPayload: params.rawPayload,
      },
      update: {
        status: PaymentStatus.FAILED,
        rawPayload: params.rawPayload,
      },
    });
    return { processed: true, duplicate: false, status: "FAILED" };
  }

  // Atomic payment finalize & credit grant
  await prisma.$transaction(async (tx) => {
    await tx.paymentTransaction.upsert({
      where: { idempotencyKey: params.idempotencyKey },
      create: {
        idempotencyKey: params.idempotencyKey,
        orderId: params.orderId,
        userId: params.userId,
        gateway: params.gateway,
        amount: params.amount,
        creditsGranted: params.creditsToGrant,
        status: PaymentStatus.PAID,
        paymentMethod: params.paymentMethod,
        rawPayload: params.rawPayload,
        paidAt: new Date(),
      },
      update: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        rawPayload: params.rawPayload,
      },
    });

    const usage = await tx.usageCredit.upsert({
      where: { userId: params.userId },
      create: { userId: params.userId, used: 0, limit: 10 + params.creditsToGrant },
      update: { limit: { increment: params.creditsToGrant } },
    });

    const balanceAfter = usage.limit - usage.used;

    await tx.creditLedgerEntry.create({
      data: {
        userId: params.userId,
        amount: params.creditsToGrant,
        balanceAfter,
        type: LedgerEntryType.PURCHASE,
        reason: `Payment verified (${params.gateway}: ${params.orderId})`,
        referenceId: params.idempotencyKey,
      },
    });
  });

  await trackFunnelEvent("payment_success", params.userId, undefined, {
    orderId: params.orderId,
    amount: params.amount,
  });

  return { processed: true, duplicate: false, status: "PAID" };
}

/**
 * Founder Metrics Command Center:
 * Computes business performance, unit economics, conversion rates, and margins.
 */
export async function getFounderMetrics(): Promise<{
  totalUsers: number;
  totalApplications: number;
  totalAiCalls: number;
  activationRate: number; // % users who analyzed >= 1 CV
  analysisCompletionRate: number; // % started vs completed
  exportCompletionRate: number; // % exported vs analyzed
  paidConversionRate: number; // % users who paid
  totalRevenueIdr: number;
  totalAiCostUsd: number;
  contributionMarginIdr: number;
  failureRate: number; // % failed model calls
  ledgerHistoryCount: number;
}> {
  const [
    totalUsers,
    totalApplications,
    usersWithCv,
    paidUsers,
    totalRevenueAgg,
    aiCostAggregate,
    aiCallCount,
    failedAiCallCount,
    analyticsSessions,
    ledgerCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.application.count(),
    prisma.cvVersion.groupBy({
      by: ["userId"],
      where: { userId: { not: null } },
    }),
    prisma.paymentTransaction.groupBy({
      by: ["userId"],
      where: { status: PaymentStatus.PAID },
    }),
    prisma.paymentTransaction.aggregate({
      where: { status: PaymentStatus.PAID },
      _sum: { amount: true },
    }),
    prisma.aiCostLog.aggregate({
      _count: { _all: true },
      _sum: { estimatedCostUsd: true },
    }),
    prisma.aiCostLog.count(),
    prisma.aiCostLog.count({ where: { status: "failed" } }),
    prisma.funnelEvent.groupBy({
      by: ["eventName", "sessionId"],
      where: {
        eventName: { in: ["optimize_opened", "analysis_completed", "cv_exported"] },
        sessionId: { not: null },
      },
    }),
    prisma.creditLedgerEntry.count(),
  ]);

  const activeUsersCount = usersWithCv.length;
  const paidUsersCount = paidUsers.length;

  const activationRate =
    totalUsers > 0 ? Number(((activeUsersCount / totalUsers) * 100).toFixed(1)) : 0;

  const paidConversionRate =
    totalUsers > 0 ? Number(((paidUsersCount / totalUsers) * 100).toFixed(1)) : 0;

  const totalCostUsd = aiCostAggregate._sum.estimatedCostUsd ?? 0;
  const failureRate =
    aiCallCount > 0 ? Number(((failedAiCallCount / aiCallCount) * 100).toFixed(1)) : 0;
  const sessionIdsFor = (eventName: string) =>
    new Set(
      analyticsSessions
        .filter((event) => event.eventName === eventName && event.sessionId)
        .map((event) => event.sessionId)
    );
  const startedSessions = sessionIdsFor("optimize_opened");
  const analyzedSessions = sessionIdsFor("analysis_completed");
  const exportedSessions = sessionIdsFor("cv_exported");
  const analysisCompletionRate =
    startedSessions.size > 0
      ? Number(((analyzedSessions.size / startedSessions.size) * 100).toFixed(1))
      : 0;
  const exportCompletionRate =
    analyzedSessions.size > 0
      ? Number(((exportedSessions.size / analyzedSessions.size) * 100).toFixed(1))
      : 0;

  const totalRevenueIdr = totalRevenueAgg._sum.amount || 0;
  const totalCostIdr = Math.round(totalCostUsd * getUsdToIdrRate());
  const contributionMarginIdr = totalRevenueIdr - totalCostIdr;

  return {
    totalUsers,
    totalApplications,
    totalAiCalls: aiCostAggregate._count._all,
    activationRate,
    analysisCompletionRate,
    exportCompletionRate,
    paidConversionRate,
    totalRevenueIdr,
    totalAiCostUsd: Number(totalCostUsd.toFixed(4)),
    contributionMarginIdr,
    failureRate,
    ledgerHistoryCount: ledgerCount,
  };
}
