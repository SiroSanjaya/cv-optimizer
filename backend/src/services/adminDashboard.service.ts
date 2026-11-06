import { prisma } from "../utils/prisma";
import { getMonthlyQuota } from "./ai/aiTasks";
import { getAiCostRates } from "./monetization/creditLedger.service";

const MAX_PERIOD_DAYS = 90;

export function normalizeDashboardPeriod(days: number): number {
  return Math.min(MAX_PERIOD_DAYS, Math.max(1, Math.trunc(days)));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function readNumberMetadata(metadata: unknown, key: string): number[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? [value] : [];
}

export async function getAdminDashboard(daysInput: number) {
  const days = normalizeDashboardPeriod(daysInput);
  const now = new Date();
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const rates = getAiCostRates();

  const [
    costs,
    taskGroups,
    userGroups,
    daily,
    funnelGroups,
    usage,
    bonusReservations,
    totalUsers,
    measurementEvents,
    applicationGroups,
  ] = await Promise.all([
    prisma.aiCostLog.aggregate({
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        estimatedCostUsd: true,
        latencyMs: true,
      },
    }),
    prisma.aiCostLog.groupBy({
      by: ["taskType"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        estimatedCostUsd: true,
      },
      orderBy: { _count: { taskType: "desc" } },
    }),
    prisma.aiCostLog.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: since }, userId: { not: null } },
      _count: { _all: true },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        estimatedCostUsd: true,
      },
      orderBy: { _sum: { estimatedCostUsd: "desc" } },
      take: 50,
    }),
    prisma.$queryRaw<Array<{
      day: string;
      requests: number;
      failures: number;
      estimatedCostUsd: number;
    }>>`
      SELECT
        TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS day,
        COUNT(*)::int AS requests,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failures,
        COALESCE(SUM("estimatedCostUsd"), 0)::float8 AS "estimatedCostUsd"
      FROM "AiCostLog"
      WHERE "createdAt" >= ${since}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY DATE_TRUNC('day', "createdAt") ASC
    `,
    prisma.funnelEvent.groupBy({
      by: ["eventName"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { eventName: "desc" } },
    }),
    prisma.usageCredit.aggregate({
      where: { periodStart: { gte: monthStart } },
      _sum: { used: true, bonusCredits: true },
      _count: { _all: true },
    }),
    prisma.aiJobReservation.count({
      where: {
        periodStart: { gte: monthStart },
        creditSource: "bonus",
        status: "consumed",
      },
    }),
    prisma.user.count(),
    prisma.funnelEvent.findMany({
      where: {
        createdAt: { gte: since },
        eventName: {
          in: [
            "workflow_started",
            "analysis_completed",
            "analysis_actionable",
            "optimization_completed",
            "cv_exported",
            "ai_output_accepted",
            "tracker_saved",
            "beta_feedback",
          ],
        },
      },
      select: { eventName: true, sessionId: true, metadata: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 20_000,
    }),
    prisma.application.groupBy({
      by: ["status"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  const requestCount = costs._count._all;
  const failedCount = await prisma.aiCostLog.count({
    where: { createdAt: { gte: since }, status: "failed" },
  });

  const analysisDurations = measurementEvents.flatMap((event) =>
    event.eventName === "analysis_completed" || event.eventName === "analysis_actionable"
      ? readNumberMetadata(event.metadata, "durationMs")
      : []
  );
  const actionableDurations = measurementEvents.flatMap((event) =>
    event.eventName === "analysis_actionable"
      ? readNumberMetadata(event.metadata, "durationMs")
      : []
  );
  const workflowDurations = measurementEvents.flatMap((event) =>
    event.eventName === "optimization_completed"
      ? readNumberMetadata(event.metadata, "durationMs")
      : []
  );
  const baselineMinutes = measurementEvents.flatMap((event) =>
    event.eventName === "beta_feedback"
      ? readNumberMetadata(event.metadata, "baselineMinutesBefore")
      : []
  );
  const baselineApplicationsPerHour = measurementEvents.flatMap((event) =>
    event.eventName === "beta_feedback"
      ? readNumberMetadata(event.metadata, "estimatedApplicationsPerHourBefore")
      : []
  );
  const exportedSessions = new Set(
    measurementEvents
      .filter((event) => event.eventName === "cv_exported" && event.sessionId)
      .map((event) => event.sessionId as string)
  );
  const acceptedSessions = new Set(
    measurementEvents
      .filter((event) => event.eventName === "ai_output_accepted" && event.sessionId)
      .map((event) => event.sessionId as string)
  );
  const submittedStatuses = new Set([
    "applied",
    "hr_screening",
    "assessment_test",
    "hr_interview",
    "technical_interview",
    "user_interview",
    "technical_test",
    "final_interview",
    "offer",
    "hired",
  ]);
  const interviewStatuses = new Set([
    "hr_screening",
    "assessment_test",
    "hr_interview",
    "technical_interview",
    "user_interview",
    "technical_test",
    "final_interview",
    "offer",
    "hired",
  ]);
  const applicationsByStatus = Object.fromEntries(
    applicationGroups.map((row) => [row.status, row._count._all])
  );
  const totalSubmitted = applicationGroups
    .filter((row) => submittedStatuses.has(row.status))
    .reduce((sum, row) => sum + row._count._all, 0);
  const totalInterviewed = applicationGroups
    .filter((row) => interviewStatuses.has(row.status))
    .reduce((sum, row) => sum + row._count._all, 0);

  return {
    generatedAt: now.toISOString(),
    periodDays: days,
    periodStart: since.toISOString(),
    totalUsers,
    ratesConfigured: rates !== null,
    costRates: rates,
    ai: {
      requestCount,
      failedCount,
      failureRate:
        requestCount > 0
          ? Number(((failedCount / requestCount) * 100).toFixed(1))
          : 0,
      promptTokens: costs._sum.promptTokens ?? 0,
      completionTokens: costs._sum.completionTokens ?? 0,
      totalTokens: costs._sum.totalTokens ?? 0,
      estimatedCostUsd: Number((costs._sum.estimatedCostUsd ?? 0).toFixed(6)),
      averageLatencyMs:
        requestCount > 0
          ? Math.round((costs._sum.latencyMs ?? 0) / requestCount)
          : 0,
      usersWithAiUsage: userGroups.length,
    },
    currentMonth: {
      quotaPerUser: getMonthlyQuota(),
      usersWithUsageRecord: usage._count._all,
      monthlyCreditsConsumed: usage._sum.used ?? 0,
      bonusCreditsConsumed: bonusReservations,
      bonusCreditsRemaining: usage._sum.bonusCredits ?? 0,
    },
    daily: daily.map((row) => ({
      ...row,
      estimatedCostUsd: Number(row.estimatedCostUsd.toFixed(6)),
    })),
    byTaskType: taskGroups.map((row) => ({
      taskType: row.taskType,
      requests: row._count._all,
      promptTokens: row._sum.promptTokens ?? 0,
      completionTokens: row._sum.completionTokens ?? 0,
      totalTokens: row._sum.totalTokens ?? 0,
      estimatedCostUsd: Number((row._sum.estimatedCostUsd ?? 0).toFixed(6)),
    })),
    usersByCost: userGroups.map((row) => ({
      userId: row.userId,
      requests: row._count._all,
      promptTokens: row._sum.promptTokens ?? 0,
      completionTokens: row._sum.completionTokens ?? 0,
      totalTokens: row._sum.totalTokens ?? 0,
      estimatedCostUsd: Number((row._sum.estimatedCostUsd ?? 0).toFixed(6)),
    })),
    funnelEvents: funnelGroups.map((row) => ({
      eventName: row.eventName,
      count: row._count._all,
    })),
    betaEffectiveness: {
      sampleSize: {
        completedAnalyses: analysisDurations.length,
        completedWorkflows: workflowDurations.length,
        exportedSessions: exportedSessions.size,
        acceptedOutputs: acceptedSessions.size,
        submittedApplications: totalSubmitted,
      },
      medianMinutes: {
        analysis: analysisDurations.length > 0
          ? Number((median(analysisDurations)! / 60_000).toFixed(1))
          : null,
        actionableScore: actionableDurations.length > 0
          ? Number((median(actionableDurations)! / 60_000).toFixed(1))
          : null,
        completeWorkflow: workflowDurations.length > 0
          ? Number((median(workflowDurations)! / 60_000).toFixed(1))
          : null,
      },
      baseline: {
        medianMinutesBefore: baselineMinutes.length > 0
          ? median(baselineMinutes)
          : null,
        medianApplicationsPerHourBefore: baselineApplicationsPerHour.length > 0
          ? median(baselineApplicationsPerHour)
          : null,
        baselineResponses: baselineMinutes.length,
      },
      aiOutputUsabilityRate:
        exportedSessions.size > 0
          ? Number(((acceptedSessions.size / exportedSessions.size) * 100).toFixed(1))
          : null,
      applicationOutcomes: {
        byStatus: applicationsByStatus,
        totalSubmitted,
        interviewReached: totalInterviewed,
        interviewRate: totalSubmitted > 0
          ? Number(((totalInterviewed / totalSubmitted) * 100).toFixed(1))
          : null,
      },
    },
  };
}
