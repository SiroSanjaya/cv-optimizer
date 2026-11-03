import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Building2, CalendarClock, ExternalLink, MapPin, Save, Sparkles } from "lucide-react";
import { Header } from "../components/Header";
import { Button } from "../components/Button";
import { useAuth } from "../context/AuthContextValue";
import { getSavedJobs, saveJob, type RecommendedJob } from "../lib/api";

function isRecommendedJob(value: unknown, expectedId: string): value is RecommendedJob {
  if (!value || typeof value !== "object") return false;
  const job = value as Partial<RecommendedJob>;
  if (
    job.id !== expectedId ||
    typeof job.title !== "string" ||
    typeof job.company !== "string" ||
    typeof job.url !== "string" ||
    typeof job.description !== "string" ||
    !Array.isArray(job.skills)
  ) return false;
  const supportedSources = ["Kalibrr", "Remotive", "Arbeitnow", "Jooble", "RemoteOK", "Himalayas"];
  if (!supportedSources.includes(job.source || "")) return false;
  try {
    const url = new URL(job.url);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function deadlineText(deadline?: string): { label: string; expired: boolean } | null {
  if (!deadline) return null;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return null;
  const expired = date.getTime() < Date.now();
  return {
    label: new Intl.DateTimeFormat("id-ID", {
      dateStyle: "long",
      timeZone: "Asia/Jakarta",
    }).format(date),
    expired,
  };
}

export function JobDetailPage() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("jobId") ?? "";
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const stateJob = (location.state as { job?: unknown } | null)?.job;
  const [job, setJob] = useState<RecommendedJob | null>(
    isRecommendedJob(stateJob, jobId) ? stateJob : null
  );
  const [loading, setLoading] = useState(Boolean(jobId) && !isRecommendedJob(stateJob, jobId));
  const [error, setError] = useState<string | null>(
    jobId ? null : "ID lowongan tidak valid."
  );
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId || job) return;
    let active = true;

    async function loadJob() {
      const storageKey = `job_detail:${jobId}`;
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed: unknown = JSON.parse(stored);
          if (isRecommendedJob(parsed, jobId)) {
            if (active) setJob(parsed);
            return;
          }
          sessionStorage.removeItem(storageKey);
        } catch (loadError) {
          console.error("Could not read the cached job listing.", loadError);
          sessionStorage.removeItem(storageKey);
        }
      }

      if (user) {
        try {
          const savedJobs = await getSavedJobs();
          const saved = savedJobs.find((candidate) => candidate.externalId === jobId);
          if (saved && active) {
            setJob({ ...saved, id: saved.externalId });
            return;
          }
        } catch (loadError) {
          if (active) {
            setError(loadError instanceof Error ? loadError.message : "Gagal memuat lowongan tersimpan.");
          }
          return;
        }
      }

      if (active) setError("Detail lowongan tidak tersedia di sesi ini. Cari kembali dari daftar lowongan.");
    }

    void loadJob().finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [jobId, job, user]);

  const handleSave = async () => {
    if (!job) return;
    if (!user) {
      navigate("/login", { state: { from: `/jobs/detail?jobId=${encodeURIComponent(job.id)}` } });
      return;
    }

    setSaving(true);
    setSaveMessage(null);
    try {
      await saveJob(job);
      setSaveMessage("Lowongan tersimpan.");
    } catch (saveError) {
      setSaveMessage(saveError instanceof Error ? saveError.message : "Gagal menyimpan lowongan.");
    } finally {
      setSaving(false);
    }
  };

  const deadline = deadlineText(job?.applicationDeadline);

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          to="/jobs"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-forest hover:text-forest-dark"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke pencarian
        </Link>

        {loading ? (
          <div className="py-20 text-center text-sm text-ink-soft" role="status">
            Memuat detail lowongan...
          </div>
        ) : !job ? (
          <section className="rounded-2xl border border-line bg-paper-raised p-8 text-center">
            <h1 className="font-serif text-xl font-bold text-ink">Detail tidak tersedia</h1>
            <p className="mt-2 text-sm text-ink-soft">{error}</p>
            <Button className="mt-5" onClick={() => navigate("/jobs")}>Cari lowongan</Button>
          </section>
        ) : (
          <article className="overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-sm">
            <header className="border-b border-line bg-gradient-to-br from-forest-tint/60 via-paper-raised to-paper-raised p-5 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-forest/20 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase text-forest">
                  {job.source}
                </span>
                {job.remote && (
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold text-teal-800">
                    Remote
                  </span>
                )}
              </div>
              <h1 className="mt-4 font-serif text-2xl font-bold leading-tight text-ink sm:text-3xl">
                {job.title}
              </h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
                <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                  <Building2 className="h-4 w-4" />
                  {job.company}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </span>
                {job.type && <span>{job.type}</span>}
                {job.industry && <span>{job.industry}</span>}
                {job.experienceLevel && <span>Pengalaman: {job.experienceLevel}</span>}
              </div>
              {job.salary && <p className="mt-4 text-sm font-bold text-emerald-800">{job.salary}</p>}
              {deadline ? (
                <p className={`mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
                  deadline.expired ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-900"
                }`}>
                  <CalendarClock className="h-4 w-4" />
                  {deadline.expired ? "Deadline terlewat" : "Batas lamaran"}: {deadline.label}
                </p>
              ) : (
                <p className="mt-3 text-xs text-ink-soft">
                  Sumber lowongan tidak mencantumkan deadline. Periksa halaman sumber untuk informasi terbaru.
                </p>
              )}
            </header>

            <div className="space-y-7 p-5 sm:p-8">
              <section>
                <h2 className="font-serif text-lg font-bold text-ink">Deskripsi lowongan</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink-soft">{job.description}</p>
              </section>

              {job.skills.length > 0 && (
                <section>
                  <h2 className="font-serif text-lg font-bold text-ink">Kualifikasi yang terdeteksi</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {job.skills.map((skill) => (
                      <span key={skill} className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink">
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <section className="rounded-xl border border-forest/20 bg-forest-tint/30 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-forest" />
                  <div>
                    <h2 className="font-serif text-lg font-bold text-ink">Kecocokan dengan profil</h2>
                    {job.matchScore == null ? (
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                        Belum ada skor. Hubungkan CV atau lengkapi profil karier untuk membandingkan persyaratan lowongan.
                      </p>
                    ) : (
                      <>
                        <p className="mt-1 text-sm font-semibold text-forest">
                          Skor kecocokan {job.matchScore}%
                          {job.applyRecommendation && ` · ${
                            job.applyRecommendation === "apply"
                              ? "Layak dipertimbangkan"
                              : job.applyRecommendation === "consider"
                                ? "Tinjau persyaratan"
                                : "Prioritas rendah"
                          }`}
                        </p>
                        {job.recommendationReason && (
                          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{job.recommendationReason}</p>
                        )}
                        {job.matchReasons && job.matchReasons.length > 0 && (
                          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-relaxed text-ink-soft">
                            {job.matchReasons.map((reason) => <li key={reason}>{reason}</li>)}
                          </ul>
                        )}
                      </>
                    )}
                    {job.matchingSkills && job.matchingSkills.length > 0 && (
                      <p className="mt-3 text-xs text-emerald-800">
                        Kualifikasi cocok: {job.matchingSkills.join(", ")}
                      </p>
                    )}
                    {job.missingSkills && job.missingSkills.length > 0 && (
                      <p className="mt-1 text-xs text-amber-900">
                        Gap skill terdeteksi: {job.missingSkills.join(", ")}
                      </p>
                    )}
                    <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
                      Skor merupakan perbandingan aturan transparan terhadap skill dan preferensi profil yang tersedia, bukan jaminan lolos seleksi. Periksa kualifikasi wajib lengkap di sumber.
                    </p>
                  </div>
                </div>
              </section>

              <p className="text-xs leading-relaxed text-ink-soft">
                Listing diterima dari integrasi API {job.source}. Status aktif dan detail terbaru perlu dikonfirmasi di situs sumber.
                {job.postedAt ? ` Dipublikasikan: ${job.postedAt}.` : ""}
              </p>

              {saveMessage && (
                <p className="text-sm text-forest" role="status">{saveMessage}</p>
              )}
              {error && <p className="text-sm text-rust" role="alert">{error}</p>}

              <div className="flex flex-wrap gap-3 border-t border-line pt-5">
                <Button onClick={() => void handleSave()} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Menyimpan..." : "Simpan lowongan"}
                </Button>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-dark"
                >
                  Buka sumber lowongan
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
