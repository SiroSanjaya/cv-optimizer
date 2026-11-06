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
  ExternalLink,
  GraduationCap,
} from "lucide-react";
import type { CvAnalysis, InterviewQuestion } from "../types/cv";
import { EvidenceMatchTable } from "./EvidenceMatchTable";

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

function getLearningResourceFallback(skill: string) {
  const normalized = skill.toLowerCase();
  if (normalized.includes("aws") || normalized.includes("amazon web services")) {
    return { skill, title: "AWS Cloud Practitioner learning plan", provider: "AWS Skill Builder", url: "https://skillbuilder.aws/", access: "Gratis untuk belajar" as const };
  }
  if (normalized.includes("google cloud") || normalized.includes("gcp")) {
    return { skill, title: "Google Cloud Skills Boost learning paths", provider: "Google Cloud Skills Boost", url: "https://www.cloudskillsboost.google/", access: "Gratis untuk belajar" as const };
  }
  if (normalized.includes("azure") || normalized.includes("microsoft")) {
    return { skill, title: "Microsoft Learn learning paths", provider: "Microsoft Learn", url: "https://learn.microsoft.com/training/", access: "Gratis untuk belajar" as const };
  }
  return null;
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
  const [customSkillInput, setCustomSkillInput] = useState("");

  const matched = analysis?.matchedSkills || [];
  const partial = analysis?.partialMatches || [];
  const missing = analysis?.missingSkills || [];
  const recs = analysis?.recommendations || [];
  const interviewQuestions: InterviewQuestion[] = analysis?.interviewQuestions || [];
  const perspectiveReviews = analysis?.perspectiveReviews || [];
  const learningResources = [
    ...(analysis?.learningResources || []),
    ...missing
      .map((skill) => getLearningResourceFallback(toSkillString(skill)))
      .filter((resource): resource is NonNullable<typeof resource> => Boolean(resource)),
  ].filter((resource, index, resources) =>
    resources.findIndex((item) => item.url === resource.url) === index
  );

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
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              Estimasi Bukti Kecocokan
            </p>
            {claimedSkills.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 shadow-xs">
                <Sparkles className="h-3 w-3 text-emerald-600" />
                {claimedSkills.length} skill diklaim pengguna
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            {analysis?.summary}
          </p>
          <p className="mt-2 text-xs text-ink-soft/80">
            Skor dihitung dari kebutuhan kerja yang ditemukan: bukti didukung = 100%, parsial = 50%, gap = 0%, dengan bobot sama. Bukan skor ATS atau peluang diterima.
          </p>
        </div>
      </div>

      {/* Interactive Guidance Tip */}
      <div className="mt-6 rounded-xl border border-forest/30 bg-forest-tint/60 p-4 text-xs text-ink flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-forest shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-forest-dark">
            Tambahkan Skill yang Memang Kamu Kuasai
          </p>
          <p className="mt-0.5 text-ink-soft text-[11px] leading-relaxed">
            Pilih hanya skill yang memang kamu kuasai. Skill itu ditambahkan ke draft CV; skor analisis ini tidak berubah sampai kamu menganalisis ulang CV yang sudah diperbarui.
          </p>
          {claimedSkills.length > 0 && (
            <div className="mt-2.5 flex items-center gap-2 text-emerald-800 font-bold text-xs bg-emerald-100/70 px-3 py-1.5 rounded-lg border border-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                {claimedSkills.length} skill yang kamu pilih akan ditambahkan ke draft. Tinjau kebenarannya sebelum memakai CV.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Evidence-Based Job Match Breakdown (Anti-Hallucination) */}
      <div className="mt-8">
        <EvidenceMatchTable
          requirements={analysis?.jobMatchAnalysis}
          matchedSkills={matched.map(toSkillString)}
          partialMatches={partial}
          missingSkills={missing}
          onClaimSkill={onToggleSkill}
          claimedSkills={claimedSkills}
        />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <div>
          <h4 className="text-sm font-semibold text-ink flex items-center justify-between">
            <span>Skill Cocok Sempurna</span>
            {claimedSkills.length > 0 && (
              <span className="text-[10px] text-emerald-700 font-bold">
                {claimedSkills.length} diklaim pengguna
              </span>
            )}
          </h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {matched.length ? (
              matched.map((s, idx) => (
                <SkillPill key={idx} label={toSkillString(s)} tone="match" />
              ))
            ) : claimedSkills.length === 0 ? (
              <p className="text-xs text-ink-soft">Belum ada yang cocok langsung.</p>
            ) : null}
            {claimedSkills.map((c, idx) => (
              <span
                key={`claimed-${idx}`}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-400 bg-emerald-100/90 px-2.5 py-1 text-xs font-semibold text-emerald-900 shadow-2xs"
              >
                <Sparkles className="h-3 w-3 text-emerald-600" />
                <span>{c}</span>
                <span className="text-[9px] bg-emerald-200 px-1 rounded text-emerald-950 font-normal">
                  Klaim pengguna
                </span>
              </span>
            ))}
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
            {/* Custom claimed skills that are not in missing or partial list */}
            {claimedSkills
              .filter(
                (c) =>
                  !missing.some((m) => toSkillString(m).toLowerCase() === c.toLowerCase()) &&
                  !partial.some((p) => toSkillString(p).toLowerCase() === c.toLowerCase())
              )
              .map((c, idx) => (
                <SkillPill
                  key={`custom-${idx}`}
                  label={c}
                  tone="missing"
                  onClick={onToggleSkill ? () => onToggleSkill(c) : undefined}
                  isClaimed={true}
                />
              ))}
          </div>

          {/* Quick Manual Add Input for any skill or keyword */}
          {onToggleSkill && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customSkillInput.trim()) {
                  onToggleSkill(customSkillInput.trim());
                  setCustomSkillInput("");
                }
              }}
              className="mt-3 flex items-center gap-1.5"
            >
              <input
                type="text"
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                placeholder="+ Tambah skill / kata kunci manual..."
                className="rounded-lg border border-line bg-paper px-2.5 py-1 text-xs text-ink placeholder:text-ink-soft/60 focus:border-forest focus:outline-none flex-1"
              />
              <button
                type="submit"
                disabled={!customSkillInput.trim()}
                className="rounded-lg bg-forest px-3 py-1 text-xs font-bold text-white hover:bg-forest-dark disabled:opacity-40 cursor-pointer shadow-xs transition-all"
              >
                + Tambah
              </button>
            </form>
          )}
        </div>
      </div>

      {perspectiveReviews.length > 0 && (
        <div className="mt-8 border-t border-line pt-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-forest">
              Review dari 7 perspektif
            </p>
            <h4 className="mt-1 text-base font-bold text-ink">
              Baca CV seperti tim rekrutmen, bukan sekadar skor angka
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              Ringkasan ini berbasis bukti pada CV dan deskripsi kerja. Ini review AI, bukan keputusan penerimaan atau klaim ATS resmi.
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {perspectiveReviews.slice(0, 7).map((review, index) => (
              <article
                key={`${review.perspective}-${index}`}
                className="rounded-xl border border-line bg-paper p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h5 className="text-sm font-bold text-ink">{review.perspective}</h5>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    review.priority === "Tinggi"
                      ? "bg-rust-tint text-rust"
                      : review.priority === "Rendah"
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-amber-tint text-amber"
                  }`}>
                    {review.priority}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">{review.summary}</p>
                {review.strengths.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">Kekuatan</p>
                    <ul className="mt-1 space-y-1">
                      {review.strengths.slice(0, 3).map((strength, strengthIndex) => (
                        <li key={strengthIndex} className="flex gap-1.5 text-xs text-ink-soft">
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-700" />
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {review.improvements.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Yang perlu diperbaiki</p>
                    <ul className="mt-1 space-y-1">
                      {review.improvements.slice(0, 3).map((improvement, improvementIndex) => (
                        <li key={improvementIndex} className="flex gap-1.5 text-xs text-ink-soft">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber" />
                          <span>{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {learningResources.length > 0 && (
        <div className="mt-8 border-t border-line pt-6">
          <div className="flex items-start gap-2">
            <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
            <div>
              <h4 className="text-sm font-bold text-ink">Belajar untuk menutup gap skill</h4>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Hanya tambah skill ini ke CV jika benar-benar sudah dipelajari. Materi gratis tidak sama dengan sertifikasi berbayar.
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {learningResources.slice(0, 8).map((resource, index) => (
              <a
                key={`${resource.url}-${index}`}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-line bg-paper p-3 transition-colors hover:border-forest/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-forest">{resource.skill}</p>
                    <p className="mt-1 text-xs font-bold text-ink">{resource.title}</p>
                    <p className="mt-1 text-[10px] text-ink-soft">{resource.provider} · {resource.access}</p>
                  </div>
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-soft group-hover:text-forest" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

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
