import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/Header";
import { useAuth } from "../context/AuthContextValue";
import { getSessionCvSkills } from "../lib/sessionProfile";
import {
  getApplicationMetrics,
  getApplications,
  getJobRecommendations,
  type ApplicationMetrics,
  type ApplicationItem,
  type RecommendedJob,
} from "../lib/api";
import {
  Sparkles,
  Briefcase,
  CheckCircle2,
  Clock,
  Building2,
  ChevronRight,
  BrainCircuit,
  BarChart3,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Trash2 } from "lucide-react";

export function DashboardPage() {
  const { user, deleteAccount } = useAuth();
  const [metrics, setMetrics] = useState<ApplicationMetrics | null>(null);
  const [metricsError, setMetricsError] = useState(false);
  const [recentApps, setRecentApps] = useState<ApplicationItem[]>([]);
  const [applicationsError, setApplicationsError] = useState(false);
  const [topJobs, setTopJobs] = useState<RecommendedJob[]>([]);
  const [jobsError, setJobsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const [mRes, aRes, jRes] = await Promise.allSettled([
          getApplicationMetrics(),
          getApplications(),
          getJobRecommendations({ keyword: "software", location: "all" }),
        ]);

        if (mRes.status === "fulfilled") setMetrics(mRes.value);
        else setMetricsError(true);
        if (aRes.status === "fulfilled") setRecentApps(aRes.value.slice(0, 5));
        else setApplicationsError(true);
        if (jRes.status === "fulfilled") setTopJobs(jRes.value.jobs.slice(0, 4));
        else setJobsError(true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [retryKey]);

  const retryDashboard = () => {
    setLoading(true);
    setMetricsError(false);
    setApplicationsError(false);
    setJobsError(false);
    setRetryKey((key) => key + 1);
  };

  const totalApps = metrics?.total ?? 0;
  const hasAnalyzedCv = Boolean(user?.id && getSessionCvSkills(user.id) !== undefined);
  const interviewingCount = metrics?.interviewing ?? 0;
  const offersCount = metrics?.offers ?? 0;
  const applicationStatusData = Object.entries(metrics?.byStatus ?? {}).map(([status, count]) => ({
    stage: {
      applied: "Terkirim",
      hr_interview: "Interview HR",
      user_interview: "Interview User",
      technical_test: "Tes Teknis",
      offer: "Offer",
      rejected: "Ditolak",
      ghosted: "Belum ada respons",
      withdrawn: "Ditarik",
    }[status] ?? status,
    count,
  }));
  const averageMatchScore = metrics?.avgMatchScore;

  const handleDeleteAccount = async () => {
    if (!window.confirm("Hapus akun dan seluruh data tracker serta CV tersimpan? Tindakan ini tidak dapat dibatalkan.")) {
      return;
    }
    if (window.prompt('Ketik "DELETE" untuk mengonfirmasi penghapusan akun.') !== "DELETE") {
      return;
    }

    try {
      await deleteAccount();
      window.location.replace("/");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus akun. Silakan coba lagi.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "offer":
        return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">Dapat Offer 🎉</span>;
      case "user_interview":
        return <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-800">Interview User</span>;
      case "hr_interview":
        return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">Interview HR</span>;
      case "technical_test":
        return <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-semibold text-purple-800">Tes Teknis</span>;
      case "rejected":
        return <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800">Ditolak</span>;
      default:
        return <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-700">Terkirim (Screening)</span>;
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-6 py-8 flex-1 space-y-8">
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-forest border-r-transparent mb-3" />
            <p className="text-xs text-ink-soft">Menghitung metrik analitik & statistik karier...</p>
          </div>
        ) : (
          <>
            {/* User Hero Banner */}
            <div className="rounded-2xl border border-line bg-gradient-to-r from-forest-tint/70 via-paper-raised to-paper-raised p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name || "User"}
                      className="h-16 w-16 rounded-full border-2 border-forest object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-forest text-2xl font-bold text-white shadow-sm">
                      {user?.name ? user.name[0].toUpperCase() : "U"}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-serif text-2xl font-bold text-ink">
                      {user?.name ? `Halo, ${user.name}!` : "Halo!"}
                    </h1>
                    <span className="rounded-full bg-forest px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                      Engineer Cockpit
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft max-w-xl">
                    Pantau progres lamaran, skor kecocokan CV, dan rekomendasi lowongan dari aktivitas akunmu.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  to="/interview"
                  className="flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-forest-dark hover:shadow cursor-pointer"
                >
                  <BrainCircuit className="h-4 w-4" />
                  <span>Latihan Wawancara AI</span>
                </Link>

                <Link
                  to="/optimize"
                  className="flex items-center gap-1.5 rounded-lg border border-line bg-paper-raised px-4 py-2.5 text-xs font-semibold text-ink shadow-sm transition-all hover:border-forest hover:text-forest"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Optimasi CV Baru</span>
                </Link>
              </div>
            </div>

            {!hasAnalyzedCv && totalApps === 0 && (
              <div className="flex flex-col gap-3 rounded-xl border border-line bg-paper-raised p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-ink">Mulai dengan data kamu sendiri</h2>
                  <p className="mt-1 max-w-2xl text-xs text-ink-soft">
                    Belum ada CV yang dianalisis di sesi ini atau lamaran tersimpan di tracker. Nama dan foto berasal dari Google; CV tidak diimpor otomatis.
                  </p>
                </div>
                <Link
                  to="/optimize"
                  className="inline-flex shrink-0 items-center justify-center rounded-lg bg-forest px-4 py-2 text-xs font-semibold text-white hover:bg-forest-dark"
                >
                  Upload atau impor CV
                </Link>
              </div>
            )}

            {/* Objective Key Metrics Row */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-xl border border-line bg-paper-raised p-5 shadow-sm">
                <div className="flex items-center justify-between text-ink-soft">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Lamaran</span>
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                    <Briefcase className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 font-serif text-3xl font-bold text-ink">
                  {metricsError ? "—" : totalApps}
                </p>
                <span className="mt-1 block text-[11px] text-ink-soft">
                  Lamaran yang tercatat di tracker
                </span>
              </div>

              <div className="rounded-xl border border-line bg-paper-raised p-5 shadow-sm">
                <div className="flex items-center justify-between text-ink-soft">
                  <span className="text-xs font-bold uppercase tracking-wider">Skor Kecocokan Rata-rata</span>
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 font-serif text-3xl font-bold text-emerald-600">
                  {metricsError || averageMatchScore == null ? "—" : `${averageMatchScore}%`}
                </p>
                <span className="mt-1 block text-[11px] text-ink-soft">
                  Kecocokan CV dengan lowongan; bukan peluang diterima.
                </span>
              </div>

              <div className="rounded-xl border border-line bg-paper-raised p-5 shadow-sm">
                <div className="flex items-center justify-between text-ink-soft">
                  <span className="text-xs font-bold uppercase tracking-wider">Tahap Wawancara Aktif</span>
                  <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 font-serif text-3xl font-bold text-indigo-600">
                  {metricsError ? "—" : interviewingCount}
                </p>
                <span className="mt-1 block text-[11px] text-ink-soft">
                  Berdasarkan status tracker
                </span>
              </div>

              <div className="rounded-xl border border-line bg-paper-raised p-5 shadow-sm">
                <div className="flex items-center justify-between text-ink-soft">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Offer</span>
                  <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 font-serif text-3xl font-bold text-ink">
                  {metricsError ? "—" : offersCount}
                </p>
                <span className="mt-1 block text-[11px] text-ink-soft">
                  Offer yang tercatat di tracker
                </span>
              </div>
            </div>

            {metricsError && (
              <div className="rounded-md border border-rust/30 bg-rust-tint px-4 py-3 text-xs text-rust" role="alert">
                Metrik lamaran tidak dapat dimuat.{" "}
                <button type="button" className="font-semibold underline" onClick={retryDashboard}>Coba lagi</button>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-12 rounded-2xl border border-line bg-paper-raised p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-forest" />
                      <h2 className="font-serif text-base font-bold text-ink">
                        Lamaran berdasarkan status
                      </h2>
                    </div>
                  </div>
                  <p className="text-xs text-ink-soft mt-1">
                    Distribusi aktual dari lamaran yang kamu simpan di tracker.
                  </p>
                </div>

                <div className="h-64 w-full mt-6">
                  {metricsError ? (
                    <div className="flex h-full items-center justify-center text-center text-sm text-ink-soft">
                      Data status lamaran belum tersedia.
                    </div>
                  ) : applicationStatusData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center text-sm text-ink-soft">
                      Belum ada data. Simpan lamaran di tracker untuk melihat distribusinya.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={applicationStatusData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tick={{ fill: "#475569", fontSize: 12, fontWeight: 600 }} width={130} />
                        <Tooltip
                          formatter={(value) => [`${value ?? 0} lamaran`, "Jumlah"]}
                          contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                        />
                        <Bar dataKey="count" fill="#164e63" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions & Recommended Live Jobs */}
            <div className="grid gap-8 lg:grid-cols-12">
              {/* Recent Applications (Col 7) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-serif text-lg font-bold text-ink">
                      Status Lamaran Aktif
                    </h2>
                    <p className="text-xs text-ink-soft">
                      Pantau posisi dan tahapan seleksi aktif kamu
                    </p>
                  </div>
                  <Link
                    to="/tracker"
                    className="flex items-center gap-1 text-xs font-semibold text-forest hover:underline"
                  >
                    <span>Lihat Semua ({metrics?.total || recentApps.length})</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="rounded-xl border border-line bg-paper-raised shadow-sm divide-y divide-line overflow-hidden">
                  {applicationsError ? (
                    <div className="p-8 text-center" role="alert">
                      <p className="text-sm font-semibold text-rust">Lamaran tidak dapat dimuat</p>
                      <p className="mt-1 text-xs text-ink-soft">Data belum bisa ditampilkan. Coba lagi sebentar.</p>
                      <button type="button" className="mt-3 text-xs font-semibold text-forest underline" onClick={retryDashboard}>Coba lagi</button>
                    </div>
                  ) : recentApps.length === 0 ? (
                    <div className="p-8 text-center">
                      <Briefcase className="mx-auto h-8 w-8 text-ink-soft/40" />
                      <p className="mt-2 text-sm font-semibold text-ink">Belum ada lamaran tersimpan</p>
                      <p className="text-xs text-ink-soft mt-1">
                        Simpan lowongan aktual langsung dari halaman Rekomendasi Loker ke tracker!
                      </p>
                      <Link
                        to="/jobs"
                        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-forest px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-forest-dark"
                      >
                        Cari lowongan
                      </Link>
                    </div>
                  ) : (
                    recentApps.map((app) => (
                      <div
                        key={app.id}
                        className="p-4 hover:bg-paper/40 transition-colors flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-ink truncate">
                              {app.position || "Posisi"}
                            </h3>
                            {app.matchScore != null && (
                              <span className="rounded bg-forest-tint px-1.5 py-0.5 text-[10px] font-bold text-forest">
                                {app.matchScore}% Match
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-ink-soft">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {app.company || "Perusahaan"}
                            </span>
                            <span>•</span>
                            <span>{new Date(app.appliedAt).toLocaleDateString("id-ID")}</span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-3">
                          {getStatusBadge(app.status)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recommended Jobs Quick Box (Col 5) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-serif text-lg font-bold text-ink">
                      Lowongan untuk Dieksplorasi
                    </h2>
                    <p className="text-xs text-ink-soft">
                      Listing dari sumber lowongan; belum tentu sesuai profilmu
                    </p>
                  </div>
                  <Link
                    to="/jobs"
                    className="flex items-center gap-1 text-xs font-semibold text-forest hover:underline"
                  >
                    <span>Jelajahi Loker</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {jobsError ? (
                    <div className="rounded-xl border border-line bg-paper-raised p-6 text-center text-xs text-ink-soft" role="status">
                      Lowongan tidak dapat dimuat saat ini. Coba kunjungi halaman lowongan lagi nanti.
                    </div>
                  ) : topJobs.length === 0 ? (
                    <div className="rounded-xl border border-line bg-paper-raised p-6 text-center text-xs text-ink-soft">
                      Belum ada listing untuk ditampilkan.
                    </div>
                  ) : (
                    topJobs.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-xl border border-line bg-paper-raised p-4 shadow-sm hover:border-forest/50 transition-all flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="rounded bg-paper px-1.5 py-0.2 text-[9px] font-bold uppercase text-ink-soft border border-line">
                                {job.source}
                              </span>
                              {job.remote && (
                                <span className="rounded bg-teal-50 px-1.5 py-0.2 text-[9px] font-semibold text-teal-700">
                                  Remote
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-ink truncate">{job.title}</h4>
                            <p className="text-[11px] text-ink-soft mt-0.5 truncate">{job.company} • {job.location}</p>
                          </div>

                        </div>

                        <div className="pt-2 border-t border-line/60 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-emerald-700 font-semibold truncate max-w-[150px]">
                            {job.salary || "Gaji tidak dicantumkan"}
                          </span>
                          <Link
                            to="/interview"
                            onClick={() => {
                              sessionStorage.setItem("interview_target_role", job.title);
                              sessionStorage.setItem("interview_target_job", `Posisi: ${job.title} di ${job.company}\nSkills: ${job.skills.join(", ")}`);
                            }}
                            className="flex items-center gap-1 text-forest font-semibold hover:underline text-[11px]"
                          >
                            <span>Latihan Wawancara</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {user && (
              <section className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h2 className="font-semibold text-red-900">Hapus akun dan data</h2>
                <p className="mt-1 text-sm text-red-800">
                  Menghapus akun akan menghapus data profil, CV tersimpan, kredit, dan tracker lamaran dari aplikasi.
                  Penghapusan ini tidak dapat dibatalkan.
                </p>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus akun saya
                </button>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
