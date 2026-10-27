import { useState, useEffect } from "react";
import { getOutcomeMetrics, type OutcomeMetrics } from "../lib/api";
import {
  TrendingUp,
  Target,
  Award,
  Lightbulb,
  BarChart3,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

function MetricRing({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * Math.min(value, 100)) / 100;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-16 w-16">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="currentColor" strokeWidth="6"
            className="text-paper" />
          <circle
            cx="36" cy="36" r={radius} fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-ink">
          {value}%
        </span>
      </div>
      <span className="text-center text-xs text-ink-soft">{label}</span>
    </div>
  );
}

function MiniBar({
  label,
  value,
  max,
  sublabel,
  accent = "#22c55e",
}: {
  label: string;
  value: number;
  max: number;
  sublabel?: string;
  accent?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0 truncate text-xs text-ink">{label}</div>
      <div className="flex-1 h-2 rounded-full bg-paper overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: accent }}
        />
      </div>
      <div className="w-10 shrink-0 text-right text-xs text-ink-soft">{sublabel ?? value}</div>
    </div>
  );
}

interface CareerOutcomeInsightsProps {
  /** If true, renders as a compact summary card (for dashboard) */
  compact?: boolean;
}

export function CareerOutcomeInsights({ compact = false }: CareerOutcomeInsightsProps) {
  const [metrics, setMetrics] = useState<OutcomeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const data = await getOutcomeMetrics();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-line bg-paper-raised p-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-xl bg-paper" />
          <div className="h-4 w-40 animate-pulse rounded-lg bg-paper" />
        </div>
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-paper" style={{ width: `${70 + i * 8}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-line bg-paper-raised p-6 text-center">
        <p className="text-sm text-ink-soft">{error}</p>
        <button
          type="button"
          onClick={() => load()}
          className="mt-3 text-xs text-forest underline-offset-2 hover:underline"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  const hasEnoughData = metrics.total >= 3;
  const maxPositionCount = Math.max(...(metrics.topPerformingPositions.map((p) => p.count) || [1]), 1);
  const maxSkillCount = Math.max(...(metrics.topPerformingSkills.map((s) => s.appearances) || [1]), 1);

  // Simplified month label
  const formatMonth = (ym: string) => {
    const [y, m] = ym.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    return `${months[parseInt(m) - 1]} '${y.slice(2)}`;
  };

  return (
    <div className="rounded-2xl border border-line bg-paper-raised overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Career Outcome Intelligence</h3>
            <p className="text-xs text-ink-soft">
              {metrics.total} lamaran tercatat
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-paper disabled:opacity-50"
            aria-label="Refresh data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          {compact && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-paper"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {(!compact || expanded) && (
        <div className="p-5 space-y-6">
          {/* Rate Rings */}
          {hasEnoughData && (
            <div className="flex justify-around">
              <MetricRing value={metrics.responseRate} label="Respons Rate" color="#22c55e" />
              <MetricRing value={metrics.interviewRate} label="Interview Rate" color="#f59e0b" />
              <MetricRing value={metrics.offerRate} label="Offer Rate" color="#6366f1" />
              {metrics.avgMatchScore !== null && (
                <MetricRing value={metrics.avgMatchScore} label="Avg Match Score" color="#06b6d4" />
              )}
            </div>
          )}

          {!hasEnoughData && (
            <div className="rounded-xl border border-dashed border-line p-4 text-center">
              <BarChart3 className="mx-auto mb-2 h-8 w-8 text-ink-soft/40" />
              <p className="text-sm font-medium text-ink-soft">
                Butuh minimal 3 lamaran untuk menampilkan grafik
              </p>
              <p className="mt-1 text-xs text-ink-soft/70">
                Kamu baru punya {metrics.total} lamaran. Terus tambahkan!
              </p>
            </div>
          )}

          {/* AI Insights */}
          {metrics.insights.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Insight Otomatis
                </span>
              </div>
              <div className="space-y-2">
                {metrics.insights.map((insight, i) => (
                  <div
                    key={i}
                    className="flex gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3"
                  >
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 mt-1.5" />
                    <p className="text-xs text-amber-800 leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Performing Positions */}
          {metrics.topPerformingPositions.length > 0 && hasEnoughData && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-forest" />
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Posisi Terbaik (by Interview)
                </span>
              </div>
              <div className="space-y-2">
                {metrics.topPerformingPositions.map((pos) => (
                  <MiniBar
                    key={pos.position}
                    label={pos.position}
                    value={pos.interviewCount}
                    max={maxPositionCount}
                    sublabel={`${pos.interviewCount}/${pos.count}`}
                    accent="#22c55e"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Top Skills */}
          {metrics.topPerformingSkills.length > 0 && hasEnoughData && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Skill yang Menghasilkan Interview
                </span>
              </div>
              <div className="space-y-2">
                {metrics.topPerformingSkills.slice(0, 6).map((skill) => (
                  <MiniBar
                    key={skill.skill}
                    label={skill.skill}
                    value={skill.interviewsGenerated}
                    max={maxSkillCount}
                    sublabel={`${skill.interviewsGenerated}x`}
                    accent="#6366f1"
                  />
                ))}
              </div>
            </div>
          )}

          {/* 6-Month Trend */}
          {hasEnoughData && metrics.recentTrend.some((t) => t.applied > 0) && (
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Tren 6 Bulan Terakhir
              </span>
              <div className="grid grid-cols-6 gap-1">
                {metrics.recentTrend.map((t) => {
                  const maxVal = Math.max(
                    ...metrics.recentTrend.map((r) => r.applied),
                    1
                  );
                  const h = Math.max(8, Math.round((t.applied / maxVal) * 64));
                  return (
                    <div key={t.month} className="flex flex-col items-center gap-1" title={`${formatMonth(t.month)}: ${t.applied} lamaran, ${t.interviewed} interview`}>
                      <div className="flex w-full flex-col items-center justify-end" style={{ height: 72 }}>
                        <div className="relative w-full max-w-[28px] rounded-t-sm bg-forest-tint" style={{ height: h }}>
                          {t.interviewed > 0 && (
                            <div
                              className="absolute bottom-0 left-0 right-0 rounded-t-sm bg-forest"
                              style={{ height: Math.max(4, Math.round((t.interviewed / Math.max(t.applied, 1)) * h)) }}
                            />
                          )}
                        </div>
                      </div>
                      <span className="text-[9px] text-ink-soft/70 text-center leading-tight">
                        {formatMonth(t.month)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 text-xs text-ink-soft">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-3 rounded-sm bg-forest-tint" />
                  Dilamar
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-3 rounded-sm bg-forest" />
                  Interview
                </span>
              </div>
            </div>
          )}

          {/* CV Version Performance */}
          {metrics.cvVersionPerformance.length > 1 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Performa per Versi CV
              </span>
              <div className="overflow-hidden rounded-xl border border-line">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-line bg-paper text-left text-ink-soft">
                      <th className="px-3 py-2 font-medium">Versi CV</th>
                      <th className="px-3 py-2 text-right font-medium">Lamaran</th>
                      <th className="px-3 py-2 text-right font-medium">Interview</th>
                      <th className="px-3 py-2 text-right font-medium">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.cvVersionPerformance.slice(0, 4).map((cv, i) => (
                      <tr
                        key={cv.cvVersionId}
                        className={`border-b border-line last:border-0 ${i === 0 ? "bg-forest-tint/30" : ""}`}
                      >
                        <td className="px-3 py-2 text-ink">
                          {i === 0 && <span className="mr-1 text-forest">★</span>}
                          {cv.label}
                        </td>
                        <td className="px-3 py-2 text-right text-ink-soft">{cv.applications}</td>
                        <td className="px-3 py-2 text-right text-ink-soft">{cv.interviewCount}</td>
                        <td className="px-3 py-2 text-right font-medium text-ink">
                          {cv.interviewRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-ink-soft/60">
            Data bersifat observasi. Hasil lamaran dipengaruhi banyak faktor eksternal.
          </p>
        </div>
      )}
    </div>
  );
}
