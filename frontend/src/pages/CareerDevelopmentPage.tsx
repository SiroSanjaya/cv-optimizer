import { useEffect, useMemo, useState } from "react";
import { Header } from "../components/Header";
import { Button } from "../components/Button";
import {
  analyzeCareerDevelopment,
  generateCareerDevelopmentPlan,
  getCareerDevelopmentPlan,
  getCareerProfile,
  updateCareerDevelopmentProgress,
  type CareerDevelopmentAnalysis,
  type CareerDevelopmentPlan,
  type CareerMilestoneStatus,
} from "../lib/api";
import {
  Award,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

const statusLabels: Record<CareerMilestoneStatus, string> = {
  not_started: "Belum dimulai",
  in_progress: "Sedang dikerjakan",
  completed: "Selesai",
};

function MilestoneStatus({
  id,
  status,
  disabled,
  onChange,
}: {
  id: string;
  status: CareerMilestoneStatus;
  disabled: boolean;
  onChange: (id: string, status: CareerMilestoneStatus) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-ink-soft">
      <span className="sr-only">Status milestone</span>
      <select
        aria-label={`Status: ${statusLabels[status]}`}
        value={status}
        disabled={disabled}
        onChange={(event) => onChange(id, event.target.value as CareerMilestoneStatus)}
        className="rounded-lg border border-line bg-paper px-2.5 py-2 text-xs text-ink focus:border-forest focus:outline-none"
      >
        {Object.entries(statusLabels).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </label>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-tint text-forest">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="font-serif text-xl font-bold text-ink">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{description}</p>
      </div>
    </div>
  );
}

export function CareerDevelopmentPage() {
  const [targetRole, setTargetRole] = useState("");
  const [analysis, setAnalysis] = useState<CareerDevelopmentAnalysis | null>(null);
  const [sources, setSources] = useState<Array<{
    label: string;
    status: string;
    receivedCount: number;
  }>>([]);
  const [plan, setPlan] = useState<CareerDevelopmentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingMilestone, setSavingMilestone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [profile, savedPlan] = await Promise.all([
          getCareerProfile(),
          getCareerDevelopmentPlan(),
        ]);
        if (!active) return;
        setPlan(savedPlan);
        setTargetRole(savedPlan?.targetRole || profile?.targetRoles[0] || "");
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Gagal memuat data karier.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const demand = analysis?.skillDemand ?? plan?.skillDemand ?? [];
  const gaps = analysis?.skillGaps ?? plan?.skillGaps ?? [];
  const jobCount = analysis?.jobCount ?? plan?.jobCount ?? 0;
  const milestoneIds = useMemo(() => plan ? [
    ...plan.learningRecommendations.map((item) => item.id),
    ...plan.portfolioProjects.map((item) => item.id),
    ...plan.certifications.map((item) => item.id),
  ] : [], [plan]);
  const completedCount = milestoneIds.filter((id) => plan?.progress[id] === "completed").length;

  const handleAnalyze = async () => {
    if (targetRole.trim().length < 2) {
      setError("Masukkan target posisi karier terlebih dahulu.");
      return;
    }
    setError(null);
    setAnalyzing(true);
    try {
      const result = await analyzeCareerDevelopment(targetRole.trim());
      setAnalysis(result.analysis);
      setSources(result.sources);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Analisis skill gagal.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!analysis || analysis.targetRole !== targetRole.trim()) {
      setError("Analisis kebutuhan skill untuk target role ini sebelum membuat roadmap.");
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      const generatedPlan = await generateCareerDevelopmentPlan(targetRole.trim());
      setPlan(generatedPlan);
      setAnalysis({
        targetRole: generatedPlan.targetRole,
        jobCount: generatedPlan.jobCount,
        skillDemand: generatedPlan.skillDemand,
        skillGaps: generatedPlan.skillGaps,
        certifications: generatedPlan.certifications.map((certification) => ({
          id: certification.id,
          name: certification.name,
          issuer: certification.issuer,
          officialUrl: certification.officialUrl,
          relatedSkills: certification.relatedSkills,
        })),
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Roadmap gagal dibuat.");
    } finally {
      setGenerating(false);
    }
  };

  const handleProgressChange = async (id: string, status: CareerMilestoneStatus) => {
    setSavingMilestone(id);
    setError(null);
    try {
      setPlan(await updateCareerDevelopmentProgress(id, status));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Progress gagal disimpan.");
    } finally {
      setSavingMilestone(null);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="rounded-3xl bg-forest px-6 py-8 text-white sm:px-10 sm:py-10">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/75">
            <Sparkles className="h-4 w-4" />
            CAREER DEVELOPMENT
          </div>
          <h1 className="mt-3 max-w-3xl font-serif text-3xl font-bold leading-tight sm:text-4xl">
            Bangun langkah karier berikutnya dengan lebih terarah.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
            Temukan skill yang muncul pada lowongan nyata, lalu ubah gap tersebut
            menjadi prioritas belajar, proyek portofolio, dan roadmap yang bisa dilacak.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-white/80">Target posisi</span>
              <input
                value={targetRole}
                onChange={(event) => {
                  setTargetRole(event.target.value);
                  setAnalysis(null);
                  setSources([]);
                }}
                maxLength={120}
                placeholder="Contoh: Data Analyst"
                className="w-full rounded-xl border border-white/20 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </label>
            <Button
              type="button"
              variant="secondary"
              disabled={loading || analyzing || generating}
              onClick={() => void handleAnalyze()}
              className="self-end border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              {analyzing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
              Analisis skill
            </Button>
            <Button
              type="button"
              disabled={loading || analyzing || generating || !analysis}
              onClick={() => void handleGeneratePlan()}
              className="self-end bg-white text-forest hover:bg-white/90"
            >
              {generating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Menyusun..." : "Buat roadmap AI"}
            </Button>
          </div>
          <p className="mt-3 text-xs text-white/70">
            Analisis skill memakai lowongan terverifikasi yang tersedia saat ini.
            Pembuatan roadmap memakai 1 kuota AI.
          </p>
        </div>

        {error && (
          <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-ink-soft" role="status">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Memuat profil dan roadmap...
          </div>
        ) : (
          <>
            <section className="mt-7 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-line bg-paper-raised p-5">
                <p className="text-sm text-ink-soft">Lowongan sebagai bukti</p>
                <p className="mt-2 text-3xl font-bold text-ink">{jobCount}</p>
                <p className="mt-1 text-xs text-ink-soft">Listing saat analisis dibuat</p>
              </div>
              <div className="rounded-2xl border border-line bg-paper-raised p-5">
                <p className="text-sm text-ink-soft">Skill yang dianalisis</p>
                <p className="mt-2 text-3xl font-bold text-ink">{demand.length}</p>
                <p className="mt-1 text-xs text-ink-soft">Dihitung per listing unik</p>
              </div>
              <div className="rounded-2xl border border-line bg-paper-raised p-5">
                <p className="text-sm text-ink-soft">Gap prioritas</p>
                <p className="mt-2 text-3xl font-bold text-ink">{gaps.length}</p>
                <p className="mt-1 text-xs text-ink-soft">Belum tercantum di skill CV</p>
              </div>
            </section>

            {sources.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                <span>Coverage pencarian saat ini:</span>
                {sources.map((source) => (
                  <span key={source.label} className="rounded-full border border-line bg-paper-raised px-2.5 py-1">
                    {source.label}: {source.status === "available"
                      ? `${source.receivedCount} listing`
                      : source.status === "not_configured"
                        ? "tidak dikonfigurasi"
                        : source.status === "failed" ? "gagal diakses" : "tidak ada hasil"}
                  </span>
                ))}
                <span>Frekuensi mencerminkan hasil saat ini, bukan tren seluruh pasar.</span>
              </div>
            )}

            <section className="mt-7 rounded-2xl border border-line bg-paper-raised p-5 sm:p-7">
              <SectionHeading
                icon={TrendingUp}
                title="Skill yang sering diminta"
                description="Frekuensi menunjukkan jumlah listing terverifikasi yang mencantumkan skill tersebut."
              />
              {demand.length === 0 ? (
                <p className="rounded-xl bg-paper p-4 text-sm text-ink-soft">
                  Jalankan analisis untuk melihat kebutuhan skill berdasarkan lowongan terkini.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {demand.slice(0, 18).map((item) => {
                    const isGap = gaps.some((gap) => gap.toLowerCase() === item.skill.toLowerCase());
                    return (
                      <div key={item.skill} className="flex items-center justify-between gap-3 rounded-xl bg-paper px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{item.skill}</p>
                          {isGap && <span className="text-xs font-medium text-amber-700">Gap skill</span>}
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink-soft">
                          {item.count} listing
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {plan && (
              <>
                <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-forest">ROADMAP PERSONAL</p>
                    <h2 className="mt-1 font-serif text-2xl font-bold text-ink">{plan.targetRole}</h2>
                    <p className="mt-1 text-sm text-ink-soft">
                      Dibuat {new Date(plan.generatedAt).toLocaleDateString()} · {completedCount} dari {milestoneIds.length} milestone selesai
                    </p>
                  </div>
                  {milestoneIds.length > 0 && (
                    <div className="h-2 w-full overflow-hidden rounded-full bg-line sm:w-48" aria-label="Progress roadmap">
                      <div
                        className="h-full rounded-full bg-forest transition-all"
                        style={{ width: `${(completedCount / milestoneIds.length) * 100}%` }}
                      />
                    </div>
                  )}
                </div>

                <section className="mt-5 rounded-2xl border border-line bg-paper-raised p-5 sm:p-7">
                  <SectionHeading
                    icon={BookOpen}
                    title="Prioritas belajar"
                    description="Langkah belajar dibuat berdasarkan skill gap dan pengalaman di profilmu."
                  />
                  {plan.learningRecommendations.length === 0 ? (
                    <p className="text-sm text-ink-soft">Belum ada rekomendasi belajar untuk roadmap ini.</p>
                  ) : (
                    <div className="space-y-3">
                      {plan.learningRecommendations.map((item) => (
                        <article key={item.id} className="rounded-xl border border-line bg-paper p-4 sm:p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-ink">{item.skill}</h3>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  item.priority === "high" ? "bg-rose-100 text-rose-800" :
                                  item.priority === "medium" ? "bg-amber-100 text-amber-800" :
                                  "bg-slate-100 text-slate-700"
                                }`}>
                                  Prioritas {item.priority === "high" ? "tinggi" : item.priority === "medium" ? "sedang" : "rendah"}
                                </span>
                              </div>
                              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{item.rationale}</p>
                            </div>
                            <MilestoneStatus
                              id={item.id}
                              status={plan.progress[item.id] ?? "not_started"}
                              disabled={savingMilestone !== null}
                              onChange={(id, status) => void handleProgressChange(id, status)}
                            />
                          </div>
                          <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
                            {item.steps.map((step, index) => <li key={`${item.id}-${index}`}>{step}</li>)}
                          </ol>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="mt-5 rounded-2xl border border-line bg-paper-raised p-5 sm:p-7">
                  <SectionHeading
                    icon={BriefcaseBusiness}
                    title="Proyek portofolio"
                    description="Ide proyek yang bisa menunjukkan penerapan skill target role."
                  />
                  {plan.portfolioProjects.length === 0 ? (
                    <p className="text-sm text-ink-soft">Belum ada ide proyek untuk roadmap ini.</p>
                  ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {plan.portfolioProjects.map((project) => (
                        <article key={project.id} className="rounded-xl border border-line bg-paper p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold text-ink">{project.title}</h3>
                              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{project.rationale}</p>
                            </div>
                            <MilestoneStatus
                              id={project.id}
                              status={plan.progress[project.id] ?? "not_started"}
                              disabled={savingMilestone !== null}
                              onChange={(id, status) => void handleProgressChange(id, status)}
                            />
                          </div>
                          <p className="mt-3 text-xs font-semibold text-forest">{project.skills.join(" · ")}</p>
                          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                            {project.scope.map((scope, index) => <li key={`${project.id}-${index}`}>{scope}</li>)}
                          </ul>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="mt-5 rounded-2xl border border-line bg-paper-raised p-5 sm:p-7">
                  <SectionHeading
                    icon={Award}
                    title="Sertifikasi terkurasi"
                    description="Tautan mengarah ke halaman resmi penerbit; cek syarat dan biaya sebelum mendaftar."
                  />
                  {plan.certifications.length === 0 ? (
                    <p className="text-sm text-ink-soft">
                      Belum ada sertifikasi terverifikasi yang cocok dengan gap skill yang ditemukan.
                    </p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {plan.certifications.map((certification) => (
                        <article key={certification.id} className="rounded-xl border border-line bg-paper p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold text-ink">{certification.name}</h3>
                              <p className="mt-1 text-xs text-ink-soft">{certification.issuer}</p>
                            </div>
                            <MilestoneStatus
                              id={certification.id}
                              status={plan.progress[certification.id] ?? "not_started"}
                              disabled={savingMilestone !== null}
                              onChange={(id, status) => void handleProgressChange(id, status)}
                            />
                          </div>
                          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{certification.rationale}</p>
                          <a
                            href={certification.officialUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline"
                          >
                            Situs resmi <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {!plan && (
              <div className="mt-7 flex items-start gap-3 rounded-2xl border border-dashed border-line bg-paper-raised p-5 text-sm text-ink-soft">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-forest" />
                <p>
                  Analisis skill dapat dijalankan tanpa kuota AI. Setelah hasil tersedia,
                  buat roadmap personal; progress milestone akan tersimpan di akunmu.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
