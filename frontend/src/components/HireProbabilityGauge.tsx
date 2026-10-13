import { AlertTriangle, CheckCircle2, Target } from "lucide-react";

interface MatchScoreCardProps {
  score: number;
  matchedSkillsCount?: number;
  missingSkillsCount?: number;
  className?: string;
}

export function HireProbabilityGauge({
  score,
  matchedSkillsCount = 0,
  missingSkillsCount = 0,
  className = "",
}: MatchScoreCardProps) {
  const validScore = Math.min(100, Math.max(0, Math.round(score)));
  const scoreColor =
    validScore >= 70
      ? "text-forest"
      : validScore >= 45
        ? "text-amber-700"
        : "text-rust";

  return (
    <section
      aria-labelledby="match-score-title"
      className={`rounded-xl border border-line bg-paper-raised p-6 shadow-sm ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-forest-tint p-2 text-forest">
          <Target className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="match-score-title" className="font-serif text-lg font-semibold text-ink">
            Kecocokan CV dengan lowongan
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            Estimasi relevansi berdasarkan informasi yang terbaca pada CV dan deskripsi pekerjaan.
            Bukan skor ATS perusahaan atau prediksi peluang diterima.
          </p>
        </div>
        <p className={`shrink-0 text-2xl font-bold ${scoreColor}`}>
          {validScore}<span className="text-base">%</span>
        </p>
      </div>

      <div
        className="mt-5 h-2 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label="Estimasi kecocokan CV"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={validScore}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            validScore >= 70 ? "bg-forest" : validScore >= 45 ? "bg-amber" : "bg-rust"
          }`}
          style={{ width: `${validScore}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-forest" aria-hidden="true" />
          {matchedSkillsCount} skill cocok
        </span>
        <span className="inline-flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber" aria-hidden="true" />
          {missingSkillsCount} skill belum terdeteksi
        </span>
      </div>
    </section>
  );
}
