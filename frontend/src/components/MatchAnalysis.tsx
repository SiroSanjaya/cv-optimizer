import { useState } from "react";
import {
  Check,
  Minus,
  X,
  Plus,
  Sparkles,
  CheckCircle2,
  MessagesSquare,
  Copy,
  Lightbulb,
} from "lucide-react";
import type { CvAnalysis, InterviewQuestion } from "../types/cv";

interface MatchAnalysisProps {
  analysis: CvAnalysis;
  claimedSkills?: string[];
  onToggleSkill?: (skill: string) => void;
  score?: number;
}

function toSkillString(val: unknown): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    return String(obj.skill || obj.name || obj.title || Object.values(obj)[0] || "");
  }
  return String(val || "");
}

function toRecommendationString(val: unknown): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    return String(
      obj.recommendation || obj.tip || obj.message || obj.text || Object.values(obj).join(" ")
    );
  }
  return String(val || "");
}

function scoreColor(score: number) {
  if (score >= 75) return "text-forest";
  if (score >= 50) return "text-amber";
  return "text-rust";
}

function ringColor(score: number) {
  if (score >= 75) return "stroke-forest";
  if (score >= 50) return "stroke-amber";
  return "stroke-rust";
}

function ScoreRing({ score }: { score: number }) {
  const validScore = typeof score === "number" && !isNaN(score) ? Math.min(100, Math.max(0, Math.round(score))) : 0;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (validScore / 100) * circumference;

  return (
    <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-line"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={ringColor(validScore)}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`font-serif text-3xl font-semibold ${scoreColor(validScore)}`}>
          {validScore}%
        </span>
      </div>
    </div>
  );
}

function SkillPill({
  label,
  tone,
  title,
  onClick,
  isClaimed,
}: {
  label: string;
  tone: "match" | "partial" | "missing";
  title?: string;
  onClick?: () => void;
  isClaimed?: boolean;
}) {
  if (isClaimed) {
    return (
      <button
        type="button"
        onClick={onClick}
        title="Klik untuk membatalkan penambahan skill ini ke CV"
        className="group inline-flex items-center gap-1.5 rounded-full border border-emerald-400 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 shadow-xs hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all cursor-pointer"
      >
        <Check className="h-3.5 w-3.5 text-emerald-700 group-hover:hidden" />
        <X className="h-3.5 w-3.5 text-rose-500 hidden group-hover:block" />
        <span>{label}</span>
        <span className="text-[10px] bg-emerald-200/90 px-1.5 py-0.2 rounded font-normal text-emerald-900 group-hover:hidden">
          Ditambahkan
        </span>
        <span className="text-[10px] bg-rose-200/90 px-1.5 py-0.2 rounded font-normal text-rose-900 hidden group-hover:inline">
          Batal
        </span>
      </button>
    );
  }

  const isClickable = Boolean(onClick);

  const styles = {
    match: "bg-forest-tint text-forest-dark border-forest/30",
    partial: isClickable
      ? "bg-amber-tint text-amber border-amber/40 hover:border-forest hover:bg-forest-tint hover:text-forest-dark cursor-pointer"
      : "bg-amber-tint text-amber border-amber/30",
    missing: isClickable
      ? "bg-rust-tint text-rust border-rust/40 hover:border-forest hover:bg-forest-tint hover:text-forest-dark cursor-pointer"
      : "bg-rust-tint text-rust border-rust/30",
  }[tone];

  const Icon = {
    match: Check,
    partial: isClickable ? Plus : Minus,
    missing: isClickable ? Plus : X,
  }[tone];

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title || "Klik jika kamu sebenarnya menguasai skill ini untuk langsung dimasukkan ke CV"}
        className={`group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all hover:scale-105 active:scale-95 shadow-xs ${styles}`}
      >
        <Icon className="h-3 w-3 group-hover:text-forest" />
        <span>{label}</span>
        <span className="text-[9px] font-normal opacity-70 group-hover:opacity-100 bg-black/5 px-1 rounded">
          + Tambahkan
        </span>
      </button>
    );
  }

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export function MatchAnalysis({
  analysis,
  claimedSkills = [],
  onToggleSkill,
  score,
}: MatchAnalysisProps) {
  const [filterCategory, setFilterCategory] = useState<"all" | "technical" | "behavioral">("all");
  const [copiedQuestionIndex, setCopiedQuestionIndex] = useState<number | null>(null);

  const matched = analysis?.matchedSkills || [];
  const partial = analysis?.partialMatches || [];
  const missing = analysis?.missingSkills || [];
  const recs = analysis?.recommendations || [];
  const interviewQuestions: InterviewQuestion[] = analysis?.interviewQuestions || [];

  const displayScore = score ?? analysis?.matchScore ?? 0;

  const isClaimed = (skillName: string) =>
    claimedSkills.some((c) => c.toLowerCase() === skillName.toLowerCase());

  const filteredQuestions = interviewQuestions.filter((q) => {
    if (filterCategory === "all") return true;
    if (filterCategory === "behavioral") {
      return q.category === "behavioral" || q.category === "situational";
    }
    return q.category === "technical";
  });

  const copyQuestion = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedQuestionIndex(idx);
      setTimeout(() => setCopiedQuestionIndex(null), 2000);
    } catch {}
  };

  return (
    <div className="rounded-lg border border-line bg-paper-raised p-6 sm:p-8">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <ScoreRing score={displayScore} />
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              Job Match Score
            </p>
            {claimedSkills.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                <Sparkles className="h-2.5 w-2.5" />
                Simulasi Aktif (+{claimedSkills.length} skill)
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            {analysis?.summary}
          </p>
          <p className="mt-2 text-xs text-ink-soft/80">
            Skor ini mengestimasi relevansi CV kamu dengan lowongan ini — bukan nilai mutlak dari sistem ATS internal perusahaan.
          </p>
        </div>
      </div>

      {/* Interactive Guidance Tip */}
      <div className="mt-6 rounded-xl border border-forest/30 bg-forest-tint/60 p-3.5 text-xs text-ink flex items-start gap-2.5">
        <Sparkles className="h-4 w-4 text-forest shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-forest-dark">
            Klaim Skill yang Sebenarnya Kamu Kuasai!
          </p>
          <p className="mt-0.5 text-ink-soft text-[11px] leading-relaxed">
            Jika ada skill di bawah yang kamu kuasai namun <strong>belum tercatat di dokumen CV kamu</strong>, cukup <strong>klik pada skill tersebut</strong> untuk menambahkannya. Skor akan otomatis meningkat secara real-time dan skill tersebut akan dioptimasi di CV Tailored kamu!
          </p>
          {claimedSkills.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{claimedSkills.length} skill berhasil kamu tambahkan ke draft CV!</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <div>
          <h4 className="text-sm font-semibold text-ink">Skill Cocok Sempurna</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {matched.length ? (
              matched.map((s, idx) => (
                <SkillPill key={idx} label={toSkillString(s)} tone="match" />
              ))
            ) : (
              <p className="text-xs text-ink-soft">Belum ada yang cocok langsung.</p>
            )}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-ink flex items-center justify-between">
            <span>Skill Mendekati / Parsial</span>
            <span className="text-[10px] font-normal text-ink-soft">Klik utk tambah</span>
          </h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {partial.length ? (
              partial.map((pm, idx) => {
                const label = toSkillString(pm);
                const detail = typeof pm === "object" && pm !== null ? (pm as any).details : undefined;
                return (
                  <SkillPill
                    key={idx}
                    label={label}
                    title={detail}
                    tone="partial"
                    onClick={onToggleSkill ? () => onToggleSkill(label) : undefined}
                    isClaimed={isClaimed(label)}
                  />
                );
              })
            ) : (
              <p className="text-xs text-ink-soft">Tidak ada parsial.</p>
            )}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-ink flex items-center justify-between">
            <span>Skill Belum Ditemukan</span>
            <span className="text-[10px] font-normal text-ink-soft">Klik utk tambah</span>
          </h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {missing.length ? (
              missing.map((s, idx) => {
                const label = toSkillString(s);
                return (
                  <SkillPill
                    key={idx}
                    label={label}
                    tone="missing"
                    onClick={onToggleSkill ? () => onToggleSkill(label) : undefined}
                    isClaimed={isClaimed(label)}
                  />
                );
              })
            ) : (
              <p className="text-xs text-ink-soft">Semua skill utama terpenuhi!</p>
            )}
          </div>
        </div>
      </div>

      {recs.length > 0 && (
        <div className="mt-8 border-t border-line pt-6">
          <h4 className="text-sm font-semibold text-ink">Rekomendasi Penyesuaian</h4>
          <ul className="mt-3 space-y-2">
            {recs.map((rec, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-soft">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-forest" />
                {toRecommendationString(rec)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Interview Prep Cheat Sheet */}
      {interviewQuestions.length > 0 && (
        <div className="mt-8 border-t border-line pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-forest font-bold text-xs uppercase tracking-wider">
                <MessagesSquare className="h-4 w-4 text-forest" />
                <span>Interview Prep Cheat Sheet</span>
              </div>
              <h4 className="mt-1 text-base font-bold text-ink">
                Prediksi Pertanyaan Interview & Panduan Menjawab
              </h4>
              <p className="text-xs text-ink-soft mt-0.5">
                Disusun khusus berdasarkan perbandingan riwayat proyek Anda dengan ekspektasi recruiter.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="inline-flex rounded-lg border border-line bg-paper p-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterCategory("all")}
                className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                  filterCategory === "all"
                    ? "bg-forest text-white shadow-xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Semua ({interviewQuestions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory("technical")}
                className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                  filterCategory === "technical"
                    ? "bg-forest text-white shadow-xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Teknis (
                {interviewQuestions.filter((q) => q.category === "technical").length}
                )
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory("behavioral")}
                className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                  filterCategory === "behavioral"
                    ? "bg-forest text-white shadow-xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Behavioral (
                {
                  interviewQuestions.filter(
                    (q) => q.category === "behavioral" || q.category === "situational"
                  ).length
                }
                )
              </button>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {filteredQuestions.map((q, idx) => {
              const isTech = q.category === "technical";
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-line bg-paper p-5 transition-all hover:border-forest/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                          isTech
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}
                      >
                        {isTech ? "💻 Pertanyaan Teknis" : "🤝 Behavioral / Situasional"}
                      </span>
                      {q.targetSkillOrContext && (
                        <span className="text-[11px] text-ink-soft bg-paper-raised border border-line px-2 py-0.5 rounded-md">
                          Fokus: {q.targetSkillOrContext}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => copyQuestion(q.question, idx)}
                      className="inline-flex items-center gap-1 text-[11px] text-ink-soft hover:text-forest transition-colors"
                      title="Salin teks pertanyaan"
                    >
                      {copiedQuestionIndex === idx ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-700 font-medium">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Salin Pertanyaan</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="font-semibold text-ink text-sm leading-relaxed">
                    "{q.question}"
                  </p>

                  <div className="mt-3.5 rounded-lg border border-forest/20 bg-forest-tint/30 p-3.5 text-xs text-ink">
                    <div className="flex items-center gap-1.5 font-bold text-forest-dark mb-1">
                      <Lightbulb className="h-3.5 w-3.5 text-forest" />
                      <span>Panduan Menjawab (STAR Method):</span>
                    </div>
                    <p className="text-ink-soft text-[11px] leading-relaxed">
                      {q.answerTip}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
