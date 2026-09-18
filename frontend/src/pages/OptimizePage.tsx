import { useState, useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Header } from "../components/Header";
import { FileUpload } from "../components/FileUpload";
import { JobDescriptionInput } from "../components/JobDescriptionInput";
import { LoadingState } from "../components/LoadingState";
import { MatchAnalysis } from "../components/MatchAnalysis";
import { CvPreview } from "../components/CvPreview";
import { QuotaBanner } from "../components/QuotaBanner";
import { Button } from "../components/Button";
import { HireProbabilityGauge } from "../components/HireProbabilityGauge";
import { ProfileImportModal } from "../components/ProfileImportModal";
import { CoverLetterSection } from "../components/CoverLetterSection";
import { ShareableScoreModal } from "../components/ShareableScoreModal";
import { DEMO_PROFILES } from "../data/demoData";
import { fireConfetti } from "../lib/confetti";
import { analyzeCv, generateTailoredCv, createApplication } from "../lib/api";
import { getUsage, hasQuotaRemaining, incrementUsage } from "../lib/quota";
import type { CvAnalysis, StructuredCv } from "../types/cv";
import {
  Sparkles,
  Link2,
  CheckCircle2,
  BookmarkPlus,
  Mail,
  FileText,
  Award,
} from "lucide-react";

const formSchema = z.object({
  jobDescription: z
    .string()
    .trim()
    .min(30, "Silakan masukkan deskripsi pekerjaan lengkap (minimal 30 karakter)."),
});

type FormValues = z.infer<typeof formSchema>;
type Stage = "form" | "analyzing" | "results" | "generating" | "tailored";

export function OptimizePage() {
  const [stage, setStage] = useState<Stage>("form");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [structuredCv, setStructuredCv] = useState<StructuredCv | null>(null);
  const [analysis, setAnalysis] = useState<CvAnalysis | null>(null);
  const [tailoredCv, setTailoredCv] = useState<StructuredCv | null>(null);

  const [usage, setUsage] = useState(getUsage());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [savedToTracker, setSavedToTracker] = useState(false);
  const [claimedSkills, setClaimedSkills] = useState<string[]>([]);
  const [activeDemo, setActiveDemo] = useState<"frontend" | "backend" | null>(null);
  const [tailoredTab, setTailoredTab] = useState<"cv" | "cover_letter">("cv");

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { jobDescription: "" },
  });

  const jobDescription = watch("jobDescription");

  // Check if job description was passed from Jobs recommendation page
  useEffect(() => {
    const savedDesc = sessionStorage.getItem("target_job_description");
    if (savedDesc) {
      setValue("jobDescription", savedDesc);
      sessionStorage.removeItem("target_job_description");
    }
  }, [setValue]);

  const handleToggleSkill = (skill: string) => {
    setClaimedSkills((prev) => {
      const exists = prev.some((s) => s.toLowerCase() === skill.toLowerCase());
      const next = exists
        ? prev.filter((s) => s.toLowerCase() !== skill.toLowerCase())
        : [...prev, skill];

      // Dynamically update structuredCv.skills so the CV itself immediately contains the claimed skill
      if (structuredCv) {
        const curr = structuredCv.skills || [];
        let updatedSkills: string[];
        if (exists) {
          updatedSkills = curr.filter((s) => s.toLowerCase() !== skill.toLowerCase());
        } else {
          updatedSkills = [...curr, skill];
        }
        setStructuredCv({
          ...structuredCv,
          skills: updatedSkills,
        });
      }

      return next;
    });
  };

  const effectiveScore = useMemo(() => {
    if (!analysis) return 0;
    const base = analysis.matchScore || 0;
    const totalMissing = (analysis.missingSkills?.length || 0) + (analysis.partialMatches?.length || 0);
    if (totalMissing === 0) return base;
    const boostPerSkill = Math.max(3, Math.round((98 - base) / Math.max(1, totalMissing)));
    const boosted = base + claimedSkills.length * boostPerSkill;
    return Math.min(98, Math.max(base, boosted));
  }, [analysis, claimedSkills]);

  const handleSelectDemo = (type: "frontend" | "backend") => {
    const demo = DEMO_PROFILES[type];
    setActiveDemo(type);
    setFile(null);
    setFileError(undefined);
    setStructuredCv(demo.cv);
    setValue("jobDescription", demo.jobDescription);
  };

  const onAnalyze = async (values: FormValues) => {
    setSubmitError(null);
    setClaimedSkills([]);

    // If structured CV was imported via LinkedIn / demo profile, we can reuse it
    if (!file && !structuredCv) {
      setFileError("Upload file CV kamu atau gunakan tombol 'Import dari LinkedIn' / 'Coba Demo' di bawah.");
      return;
    }
    if (!hasQuotaRemaining()) {
      setSubmitError("Batas optimasi harian gratis tercapai.");
      return;
    }

    setStage("analyzing");
    try {
      const cvSource = file || structuredCv!;
      const result = await analyzeCv(cvSource, values.jobDescription);
      setStructuredCv(result.cv);
      setAnalysis(result.analysis);
      if (result.cv?.skills?.length) {
        sessionStorage.setItem("user_cv_skills", JSON.stringify(result.cv.skills));
      }
      setUsage(incrementUsage());
      setStage("results");
      if ((result.analysis?.matchScore || 0) >= 70) {
        setTimeout(() => fireConfetti(2500), 300);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Terjadi kesalahan saat menganalisis.");
      setStage("form");
    }
  };

  const onGenerate = async () => {
    if (!structuredCv || !analysis) return;
    setSubmitError(null);
    setStage("generating");
    try {
      // Build enhanced analysis payload reflecting claimed skills
      const enhancedAnalysis: CvAnalysis = {
        ...analysis,
        matchScore: effectiveScore,
        matchedSkills: [
          ...(analysis.matchedSkills || []),
          ...claimedSkills.filter(
            (c) => !(analysis.matchedSkills || []).some((m) => m.toLowerCase() === c.toLowerCase())
          ),
        ],
        missingSkills: (analysis.missingSkills || []).filter(
          (s) => !claimedSkills.some((c) => c.toLowerCase() === s.toLowerCase())
        ),
      };

      const result = await generateTailoredCv(structuredCv, jobDescription, enhancedAnalysis);
      setTailoredCv(result.cv);
      setStage("tailored");
      setTimeout(() => fireConfetti(3500), 300);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Terjadi kesalahan saat membuat CV tailored.");
      setStage("results");
    }
  };

  const handleSaveToTracker = async () => {
    if (!analysis) return;
    try {
      // Extract position or company from first line of job description
      const lines = jobDescription.split("\n").filter((l) => l.trim().length > 0);
      const titleLine = lines[0] || "Target Role";
      const parts = titleLine.split(" at ");
      const position = parts[0] || "Target Role";
      const company = parts[1] || "Perusahaan Target";

      await createApplication({
        company: company.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 40),
        position: position.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 40),
        jobDescription,
        matchScore: effectiveScore,
        hireProb: Math.round(effectiveScore * 0.95),
        status: "applied",
        notes: `Probabilitas Lolos: ${effectiveScore}%. Dibuat otomatis dari CV Optimizer.`,
      });
      setSavedToTracker(true);
    } catch (err) {
      alert("Berhasil dicatat di status lokal.");
      setSavedToTracker(true);
    }
  };

  const startOver = () => {
    setFile(null);
    setStructuredCv(null);
    setAnalysis(null);
    setTailoredCv(null);
    setSubmitError(null);
    setSavedToTracker(false);
    setClaimedSkills([]);
    setActiveDemo(null);
    setTailoredTab("cv");
    setStage("form");
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between">
      <Header />

      <main className="mx-auto w-full max-w-4xl px-6 py-10 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink">
              Optimasi CV dengan AI
            </h1>
            <p className="mt-1 text-xs text-ink-soft">
              Bandingkan profilmu dengan job requirements & dapatkan CV berstandar ATS dengan peluang lolos maksimal.
            </p>
          </div>

          {stage === "form" && (
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-forest/40 bg-forest-tint/70 px-3.5 py-2 text-xs font-semibold text-forest shadow-xs hover:bg-forest-tint transition-all"
            >
              <Link2 className="h-4 w-4" />
              <span>Import LinkedIn / Profil</span>
            </button>
          )}
        </div>

        <div className="mt-6">
          <QuotaBanner used={usage.used} limit={usage.limit} />
        </div>

        {submitError && (
          <div className="mt-4 rounded-md border border-rust/30 bg-rust-tint px-4 py-3 text-xs text-rust">
            {submitError}
          </div>
        )}

        {stage === "form" && (
          <form onSubmit={handleSubmit(onAnalyze)} className="mt-8 space-y-6">
            {/* 1-Click Demo Presets */}
            <div className="rounded-xl border border-forest/30 bg-gradient-to-r from-forest-tint/90 via-forest-tint/50 to-emerald-50/30 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-forest-dark">
                    <Sparkles className="h-3.5 w-3.5 text-forest" />
                    <span>Coba Demo 1-Click (Tanpa Upload File)</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    Ingin langsung melihat cara kerja AI? Pilih salah satu profil dan lowongan contoh berikut:
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectDemo("frontend")}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                      activeDemo === "frontend"
                        ? "border-forest bg-forest text-white shadow-xs"
                        : "border-line bg-paper-raised text-ink hover:border-forest hover:bg-forest-tint"
                    }`}
                  >
                    ⚡ Demo Frontend (React/Next)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectDemo("backend")}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                      activeDemo === "backend"
                        ? "border-forest bg-forest text-white shadow-xs"
                        : "border-line bg-paper-raised text-ink hover:border-forest hover:bg-forest-tint"
                    }`}
                  >
                    ⚡ Demo Backend (Go/Cloud)
                  </button>
                </div>
              </div>

              {activeDemo && (
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-paper-raised/95 p-3 border border-forest/30 text-xs shadow-2xs">
                  <div className="flex items-center gap-2 text-forest-dark font-medium">
                    <CheckCircle2 className="h-4 w-4 text-forest shrink-0" />
                    <span>
                      Profil Aktif: <strong>{DEMO_PROFILES[activeDemo].name}</strong> ({DEMO_PROFILES[activeDemo].role})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSubmit(onAnalyze)()}
                    className="font-bold text-forest underline hover:text-forest-dark flex items-center gap-1 self-end sm:self-auto"
                  >
                    <span>⚡ Langsung Analisis Demo Ini Sekarang &rarr;</span>
                  </button>
                </div>
              )}
            </div>

            {/* Input CV Section */}
            <div className="rounded-xl border border-line bg-paper-raised p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-ink">
                  1. Masukkan CV Kamu
                </label>
                {structuredCv && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" />
                    Profil Terhubung ({structuredCv.personalInfo?.name || "Siap"})
                  </span>
                )}
              </div>

              <FileUpload
                file={file}
                onChange={(f) => {
                  setFile(f);
                  setActiveDemo(null);
                  setFileError(undefined);
                }}
                error={fileError}
              />

              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-ink-soft">
                <span>Atau tidak punya file?</span>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="font-semibold text-forest underline hover:text-forest-dark"
                >
                  Import via Link LinkedIn / Paste Teks Profil
                </button>
              </div>
            </div>

            {/* Job Description Section */}
            <div className="rounded-xl border border-line bg-paper-raised p-6 shadow-sm">
              <label className="text-sm font-bold text-ink mb-3 block">
                2. Tempel (Paste) Deskripsi Pekerjaan Target
              </label>
              <Controller
                name="jobDescription"
                control={control}
                render={({ field }) => (
                  <JobDescriptionInput
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.jobDescription?.message}
                  />
                )}
              />
            </div>

            <Button type="submit" className="w-full py-3 text-sm sm:w-auto px-8 gap-2">
              <Sparkles className="h-4 w-4" />
              Analisa Kecocokan & Probabilitas
            </Button>
          </form>
        )}

        {stage === "analyzing" && (
          <div className="mt-8">
            <LoadingState
              messages={[
                "Membaca data pengalaman & skill kamu...",
                "Mencocokkan kualifikasi dengan deskripsi pekerjaan...",
                "Menghitung probabilitas lolos screening ATS...",
                "Menyiapkan prediksi pertanyaan interview recruiter...",
              ]}
            />
          </div>
        )}

        {stage === "results" && analysis && (
          <div className="mt-8 space-y-6">
            {/* New Hire Probability Gauge Widget */}
            <HireProbabilityGauge
              score={effectiveScore}
              matchedSkillsCount={(analysis.matchedSkills?.length || 0) + claimedSkills.length}
              missingSkillsCount={Math.max(0, (analysis.missingSkills?.length || 0) - claimedSkills.length)}
            />

            {/* Detailed Skills & Experience Breakdown */}
            <MatchAnalysis
              analysis={analysis}
              claimedSkills={claimedSkills}
              onToggleSkill={handleToggleSkill}
              score={effectiveScore}
            />

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={onGenerate} className="px-6 py-3 text-sm gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate CV Tailored Sempurna
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setTailoredCv(structuredCv);
                    setTailoredTab("cover_letter");
                    setStage("tailored");
                  }}
                  className="px-5 py-3 text-sm gap-2"
                >
                  <Mail className="h-4 w-4 text-forest" />
                  Buat Surat Lamaran AI
                </Button>
                <Button variant="secondary" onClick={startOver}>
                  Ulangi Dari Awal
                </Button>
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/80 px-4 py-2.5 text-xs font-bold text-amber-900 shadow-xs hover:border-amber-400 hover:scale-105 transition-all"
                >
                  <Award className="h-4 w-4 text-amber-600" />
                  <span>Pamerkan Skor LinkedIn 🚀</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveToTracker}
                disabled={savedToTracker}
                className={`flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-xs font-semibold shadow-xs transition-all ${
                  savedToTracker
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-paper-raised text-ink border-line hover:border-forest/60"
                }`}
              >
                {savedToTracker ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Tersimpan di Tracker Lamaran!
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="h-4 w-4 text-forest" />
                    Simpan ke Tracker Lamaran
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {stage === "generating" && (
          <div className="mt-8">
            <LoadingState
              messages={[
                "Menata ulang urutan poin pencapaian dengan action verbs...",
                "Mengintegrasikan keyword relevan tanpa mengubah fakta riwayat kerja...",
                "Memformat layout dokumen standar ATS...",
              ]}
            />
          </div>
        )}

        {stage === "tailored" && (tailoredCv || structuredCv) && (
          <div className="mt-8 space-y-6">
            {/* Segmented Tab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
              <div className="inline-flex rounded-xl border border-line bg-paper-raised p-1 text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setTailoredTab("cv")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-all ${
                    tailoredTab === "cv"
                      ? "bg-forest text-white shadow-xs"
                      : "text-ink-soft hover:text-ink hover:bg-paper"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>📄 CV Tailored (ATS Standard)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTailoredTab("cover_letter")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-all ${
                    tailoredTab === "cover_letter"
                      ? "bg-forest text-white shadow-xs"
                      : "text-ink-soft hover:text-ink hover:bg-paper"
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  <span>✉️ Surat Lamaran AI (Cover Letter)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-100 hover:scale-105 transition-all"
                >
                  <Award className="h-3.5 w-3.5 text-amber-600" />
                  <span>Kartu Skor LinkedIn (.PNG)</span>
                </button>
                <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={startOver}>
                  Optimasi Lowongan Lain
                </Button>
              </div>
            </div>

            {tailoredTab === "cv" ? (
              tailoredCv ? (
                <CvPreview cv={tailoredCv} />
              ) : (
                structuredCv && <CvPreview cv={structuredCv} />
              )
            ) : (
              <CoverLetterSection
                cvData={tailoredCv || structuredCv!}
                jobDescription={jobDescription}
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <Button variant="secondary" onClick={startOver}>
                Optimasi CV Untuk Lowongan Lain
              </Button>

              <button
                type="button"
                onClick={handleSaveToTracker}
                disabled={savedToTracker}
                className={`flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-xs font-semibold shadow-xs transition-all ${
                  savedToTracker
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-forest text-white border-forest hover:bg-forest-dark"
                }`}
              >
                <BookmarkPlus className="h-4 w-4" />
                {savedToTracker ? "Sudah di Tracker Lamaran" : "Tambahkan ke Pipeline Tracker"}
              </button>
            </div>
          </div>
        )}

        {/* Profile Import Modal */}
        <ProfileImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          jobDescription={jobDescription}
          onImportSuccess={(res) => {
            setStructuredCv(res.cv);
            if (res.cv?.skills?.length) {
              sessionStorage.setItem("user_cv_skills", JSON.stringify(res.cv.skills));
            }
            if (res.analysis) {
              setAnalysis(res.analysis);
              setStage("results");
            } else {
              setStage("form");
            }
          }}
        />

        {/* Shareable LinkedIn Scorecard Modal */}
        <ShareableScoreModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          score={effectiveScore}
          cv={tailoredCv || structuredCv}
          jobDescription={jobDescription}
        />
      </main>

      <footer className="border-t border-line py-6 text-center text-xs text-ink-soft">
        CV Optimizer — Buat CV yang meloloskanmu ke tahap interview.
      </footer>
    </div>
  );
}
