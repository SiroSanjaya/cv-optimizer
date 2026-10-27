import { prisma } from "../../utils/prisma";

export interface ApplicationOutcomeMetrics {
  total: number;
  responseRate: number; // % of apps that got any recruiter response
  interviewRate: number; // % that reached interview stage
  offerRate: number;
  avgMatchScore: number | null;
  byStatus: Record<string, number>;

  // Insights
  topPerformingPositions: Array<{
    position: string;
    count: number;
    interviewCount: number;
    responseRate: number;
  }>;
  topPerformingSkills: Array<{
    skill: string;
    appearances: number;
    interviewsGenerated: number;
  }>;
  recentTrend: Array<{
    month: string; // "2024-10"
    applied: number;
    interviewed: number;
    offered: number;
  }>;
  cvVersionPerformance: Array<{
    cvVersionId: string;
    label: string;
    applications: number;
    interviewCount: number;
    interviewRate: number;
  }>;
  insights: string[]; // human-readable observation strings
}

const INTERVIEW_STATUSES = new Set([
  "hr_interview",
  "user_interview",
  "technical_test",
  "offer",
]);

export async function getOutcomeMetrics(userId: string): Promise<ApplicationOutcomeMetrics> {
  const apps = await prisma.application.findMany({
    where: { userId },
    orderBy: { appliedAt: "desc" },
    include: {
      cvVersion: {
        select: { id: true, label: true },
      },
    },
  });

  if (apps.length === 0) {
    return {
      total: 0,
      responseRate: 0,
      interviewRate: 0,
      offerRate: 0,
      avgMatchScore: null,
      byStatus: {},
      topPerformingPositions: [],
      topPerformingSkills: [],
      recentTrend: [],
      cvVersionPerformance: [],
      insights: ["Belum ada lamaran yang tercatat. Mulai tambah lamaran ke tracker!"],
    };
  }

  const total = apps.length;

  // Status distribution
  const byStatus: Record<string, number> = {};
  for (const app of apps) {
    byStatus[app.status] = (byStatus[app.status] || 0) + 1;
  }

  const interviewCount = apps.filter((a) => INTERVIEW_STATUSES.has(a.status)).length;
  const offerCount = byStatus["offer"] || 0;

  // Response = any status that is NOT just "applied" and NOT "ghosted"
  const responseCount = apps.filter(
    (a) => a.status !== "applied" && a.status !== "ghosted"
  ).length;

  const responseRate = total > 0 ? Math.round((responseCount / total) * 100) : 0;
  const interviewRate = total > 0 ? Math.round((interviewCount / total) * 100) : 0;
  const offerRate = total > 0 ? Math.round((offerCount / total) * 100) : 0;

  const scores = apps
    .map((a) => a.matchScore)
    .filter((s): s is number => typeof s === "number");
  const avgMatchScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  // Top performing positions (normalized)
  const positionMap: Record<
    string,
    { count: number; interviewCount: number }
  > = {};
  for (const app of apps) {
    const pos = normalizePosition(app.position || "Unknown");
    if (!positionMap[pos]) positionMap[pos] = { count: 0, interviewCount: 0 };
    positionMap[pos].count++;
    if (INTERVIEW_STATUSES.has(app.status)) positionMap[pos].interviewCount++;
  }
  const topPerformingPositions = Object.entries(positionMap)
    .map(([position, data]) => ({
      position,
      count: data.count,
      interviewCount: data.interviewCount,
      responseRate:
        data.count > 0 ? Math.round((data.interviewCount / data.count) * 100) : 0,
    }))
    .sort((a, b) => b.interviewCount - a.interviewCount)
    .slice(0, 5);

  // Skill performance from analysis.keywords or job description keywords
  const skillMap: Record<string, { appearances: number; interviewsGenerated: number }> = {};
  for (const app of apps) {
    const analysis = app.analysis as any;
    const keywords: string[] =
      Array.isArray(analysis?.matchedKeywords)
        ? analysis.matchedKeywords
        : Array.isArray(analysis?.keywords)
          ? analysis.keywords
          : [];

    for (const kw of keywords.slice(0, 10)) {
      const skill = kw.trim();
      if (!skill || skill.length < 2) continue;
      if (!skillMap[skill]) skillMap[skill] = { appearances: 0, interviewsGenerated: 0 };
      skillMap[skill].appearances++;
      if (INTERVIEW_STATUSES.has(app.status)) skillMap[skill].interviewsGenerated++;
    }
  }
  const topPerformingSkills = Object.entries(skillMap)
    .map(([skill, data]) => ({ skill, ...data }))
    .sort((a, b) => b.interviewsGenerated - a.interviewsGenerated || b.appearances - a.appearances)
    .slice(0, 8);

  // Monthly trend (last 6 months)
  const now = new Date();
  const recentTrend: Array<{ month: string; applied: number; interviewed: number; offered: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthApps = apps.filter((a) => {
      const appMonth = a.appliedAt
        ? `${a.appliedAt.getFullYear()}-${String(a.appliedAt.getMonth() + 1).padStart(2, "0")}`
        : "";
      return appMonth === month;
    });
    recentTrend.push({
      month,
      applied: monthApps.length,
      interviewed: monthApps.filter((a) => INTERVIEW_STATUSES.has(a.status)).length,
      offered: monthApps.filter((a) => a.status === "offer").length,
    });
  }

  // CV Version performance
  const cvMap: Record<string, { label: string; applications: number; interviewCount: number }> = {};
  for (const app of apps) {
    const cvId = app.cvVersionId || "none";
    const label = app.cvVersion?.label || (cvId === "none" ? "Tanpa CV tersimpan" : `CV #${cvId.slice(-4)}`);
    if (!cvMap[cvId]) cvMap[cvId] = { label, applications: 0, interviewCount: 0 };
    cvMap[cvId].applications++;
    if (INTERVIEW_STATUSES.has(app.status)) cvMap[cvId].interviewCount++;
  }
  const cvVersionPerformance = Object.entries(cvMap)
    .map(([cvVersionId, data]) => ({
      cvVersionId,
      label: data.label,
      applications: data.applications,
      interviewCount: data.interviewCount,
      interviewRate:
        data.applications > 0
          ? Math.round((data.interviewCount / data.applications) * 100)
          : 0,
    }))
    .sort((a, b) => b.interviewRate - a.interviewRate);

  // Generate insights
  const insights: string[] = generateInsights({
    total,
    responseRate,
    interviewRate,
    offerRate,
    topPerformingPositions,
    topPerformingSkills,
    recentTrend,
    cvVersionPerformance,
    avgMatchScore,
  });

  return {
    total,
    responseRate,
    interviewRate,
    offerRate,
    avgMatchScore,
    byStatus,
    topPerformingPositions,
    topPerformingSkills,
    recentTrend,
    cvVersionPerformance,
    insights,
  };
}

function normalizePosition(pos: string): string {
  const lower = pos.toLowerCase();
  if (lower.includes("backend") || lower.includes("back-end")) return "Backend Engineer";
  if (lower.includes("frontend") || lower.includes("front-end")) return "Frontend Engineer";
  if (lower.includes("fullstack") || lower.includes("full stack") || lower.includes("full-stack"))
    return "Full Stack Engineer";
  if (lower.includes("data engineer")) return "Data Engineer";
  if (lower.includes("data scientist") || lower.includes("data science")) return "Data Scientist";
  if (lower.includes("data analyst")) return "Data Analyst";
  if (lower.includes("mobile") || lower.includes("android") || lower.includes("ios"))
    return "Mobile Developer";
  if (lower.includes("devops") || lower.includes("site reliability") || lower.includes("sre"))
    return "DevOps / SRE";
  if (lower.includes("product manager") || lower.includes("pm ")) return "Product Manager";
  if (lower.includes("software engineer") || lower.includes("software developer"))
    return "Software Engineer";
  return pos.trim() || "Unknown";
}

function generateInsights(data: {
  total: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  topPerformingPositions: Array<{ position: string; count: number; interviewCount: number; responseRate: number }>;
  topPerformingSkills: Array<{ skill: string; appearances: number; interviewsGenerated: number }>;
  recentTrend: Array<{ month: string; applied: number; interviewed: number; offered: number }>;
  cvVersionPerformance: Array<{ cvVersionId: string; label: string; applications: number; interviewCount: number; interviewRate: number }>;
  avgMatchScore: number | null;
}): string[] {
  const insights: string[] = [];

  if (data.total < 5) {
    insights.push(
      `Baru ${data.total} lamaran tercatat. Butuh minimal 10 data untuk mendapatkan pola yang lebih bermakna.`
    );
    return insights;
  }

  // Response rate observation
  if (data.responseRate >= 40) {
    insights.push(
      `Tingkat respons recruiter ${data.responseRate}% — di atas rata-rata pasar. CV kamu tampaknya relevan dengan posisi yang dilamar.`
    );
  } else if (data.responseRate < 15) {
    insights.push(
      `Tingkat respons ${data.responseRate}% cukup rendah. Coba tingkatkan relevansi CV dengan job description sebelum melamar.`
    );
  }

  // Position insight
  const topPos = data.topPerformingPositions[0];
  const bottomPos = data.topPerformingPositions.at(-1);
  if (topPos && bottomPos && topPos.position !== bottomPos.position) {
    if (topPos.interviewCount > 0 && bottomPos.interviewCount === 0) {
      insights.push(
        `Lamaran "${topPos.position}" menghasilkan lebih banyak interview (${topPos.interviewCount}x) dibanding "${bottomPos.position}" (${bottomPos.interviewCount}x). Fokuskan energi di posisi yang lebih cocok dengan profilmu.`
      );
    }
  }

  // Skill insight
  const topSkill = data.topPerformingSkills[0];
  if (topSkill && topSkill.interviewsGenerated > 0) {
    insights.push(
      `Skill "${topSkill.skill}" muncul di ${topSkill.interviewsGenerated} lamaran yang berhasil sampai interview. Pastikan skill ini selalu terlihat di CV dan profil.`
    );
  }

  // Match score insight
  if (data.avgMatchScore !== null) {
    if (data.avgMatchScore < 60) {
      insights.push(
        `Rata-rata match score lamaran ${data.avgMatchScore}%. Gunakan fitur Optimasi CV untuk meningkatkan kecocokan sebelum melamar.`
      );
    } else if (data.avgMatchScore >= 80) {
      insights.push(
        `Rata-rata match score ${data.avgMatchScore}% — profil kamu sangat cocok dengan posisi yang dilamar.`
      );
    }
  }

  // CV version insight
  const bestCv = data.cvVersionPerformance[0];
  if (bestCv && bestCv.interviewRate > 0 && data.cvVersionPerformance.length > 1) {
    insights.push(
      `"${bestCv.label}" memiliki conversion rate tertinggi (${bestCv.interviewRate}% dari ${bestCv.applications} lamaran mendapat interview). Gunakan versi ini sebagai baseline.`
    );
  }

  // Trend
  const lastMonth = data.recentTrend.at(-1);
  const prevMonth = data.recentTrend.at(-2);
  if (lastMonth && prevMonth) {
    if (lastMonth.applied > prevMonth.applied) {
      insights.push(
        `Volume lamaran bulan ini (${lastMonth.applied}) lebih tinggi dari bulan lalu (${prevMonth.applied}). Jaga kualitas tetap prioritas dibanding kuantitas.`
      );
    } else if (lastMonth.applied === 0) {
      insights.push("Tidak ada lamaran bulan ini. Konsistensi adalah kunci dalam pencarian kerja.");
    }
  }

  return insights.length > 0
    ? insights
    : ["Terus tambahkan data lamaran untuk mendapatkan insight yang lebih personal."];
}
