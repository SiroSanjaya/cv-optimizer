import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { Button } from "../components/Button";
import { CareerOutcomeInsights } from "../components/CareerOutcomeInsights";
import { JobImporterModal } from "../components/JobImporterModal";
import {
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
  type ApplicationStatus,
  type ApplicationItem,
  type ImportedJob,
} from "../lib/api";
import {
  Briefcase,
  Plus,
  Building2,
  ExternalLink,
  Trash2,
  Table as TableIcon,
  LayoutGrid,
  X,
  Link2,
  TrendingUp,
} from "lucide-react";

interface StageConfig {
  key: ApplicationStatus;
  label: string;
  badge: string;
}

export function ApplicationsPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [jobImporterOpen, setJobImporterOpen] = useState(false);

  // Form states
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("applied");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load applications
  const loadApps = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getApplications();
      setApplications(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal memuat tracker lamaran.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    getApplications()
      .then((data) => {
        if (isMounted) setApplications(data);
      })
      .catch((err) => {
        if (isMounted) {
          setLoadError(err instanceof Error ? err.message : "Gagal memuat tracker lamaran.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !position) return;
    setIsSubmitting(true);
    try {
      await createApplication({
        company,
        position,
        jobUrl,
        status,
        notes,
      });
      setIsModalOpen(false);
      // Reset form
      setCompany("");
      setPosition("");
      setJobUrl("");
      setNotes("");
      await loadApps();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menambahkan lamaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveImportedJob = useCallback(async (job: ImportedJob) => {
    try {
      await createApplication({
        company: job.company,
        position: job.position,
        jobDescription: job.jobDescription,
        jobUrl: job.sourceUrl || undefined,
      });
      await loadApps();
    } catch {
      // silent fail
    }
  }, [loadApps]);

  const handleImportedOptimize = useCallback((job: ImportedJob) => {
    sessionStorage.setItem("imported_job", JSON.stringify({
      company: job.company,
      position: job.position,
      jobDescription: job.jobDescription,
      sourceUrl: job.sourceUrl,
      skills: job.skills,
    }));
    navigate("/optimize?from=importer");
  }, [navigate]);

  const handleStatusChange = async (id: string, newStatus: ApplicationStatus) => {
    try {
      const updatedApplication = await updateApplication(id, { status: newStatus });
      setApplications((prev) =>
        prev.map((app) => app.id === id ? updatedApplication : app)
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus riwayat lamaran ini?")) return;
    try {
      await deleteApplication(id);
      setApplications((prev) => prev.filter((app) => app.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus lamaran");
    }
  };

  const stages: StageConfig[] = [
    {
      key: "applied",
      label: "Lamaran Terkirim",
      badge: "bg-gray-100 text-gray-800 border-gray-200",
    },
    {
      key: "hr_interview",
      label: "Interview HR",
      badge: "bg-blue-100 text-blue-800 border-blue-200",
    },
    {
      key: "user_interview",
      label: "Interview User",
      badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
    },
    {
      key: "technical_test",
      label: "Tes Teknis",
      badge: "bg-purple-100 text-purple-800 border-purple-200",
    },
    {
      key: "offer",
      label: "Diterima / Offer 🎉",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    {
      key: "rejected",
      label: "Belum Berhasil",
      badge: "bg-rose-100 text-rose-800 border-rose-200",
    },
    {
      key: "ghosted",
      label: "Belum Ada Respons",
      badge: "bg-amber-100 text-amber-800 border-amber-200",
    },
    {
      key: "withdrawn",
      label: "Ditarik",
      badge: "bg-slate-100 text-slate-700 border-slate-200",
    },
  ];

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-6 py-8 flex-1">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-forest" />
              <h1 className="font-serif text-2xl font-bold text-ink">
                Tracker Status Lamaran Kerja
              </h1>
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              Rekap semua posisi yang kamu lamar, pantau tahapan interview HR & User, hingga offer diterima!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-line bg-paper-raised p-1 text-xs">
              <button
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1 rounded px-2.5 py-1.5 transition-colors ${
                  viewMode === "kanban"
                    ? "bg-forest text-white font-semibold shadow-sm"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Pipeline
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1 rounded px-2.5 py-1.5 transition-colors ${
                  viewMode === "table"
                    ? "bg-forest text-white font-semibold shadow-sm"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                Tabel
              </button>
            </div>

            <button
              id="open-job-importer-tracker"
              onClick={() => setJobImporterOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-paper-raised px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-forest/40 hover:bg-forest-tint"
            >
              <Link2 className="h-3.5 w-3.5 text-forest" />
              Impor Lowongan
            </button>

            <button
              id="toggle-career-insights"
              onClick={() => setShowInsights((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                showInsights
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-line bg-paper-raised text-ink hover:border-amber-200 hover:bg-amber-50"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Career Intelligence
            </button>

            <Button onClick={() => setIsModalOpen(true)} className="gap-1.5 text-xs py-2 px-3.5">
              <Plus className="h-4 w-4" />
              Tambah Lamaran
            </Button>
          </div>
        </div>

        {/* Career Outcome Intelligence Panel */}
        {showInsights && (
          <div className="mt-6">
            <CareerOutcomeInsights />
          </div>
        )}

        {/* View Content */}
        {loading ? (
          <div className="py-20 text-center text-xs text-ink-soft">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-forest border-r-transparent mb-2" />
            <p>Memuat pipeline lamaran...</p>
          </div>
        ) : loadError ? (
          <div className="mt-8 rounded-xl border border-rust/30 bg-rust-tint p-6 text-center" role="alert">
            <p className="text-sm font-semibold text-rust">Tracker gagal dimuat</p>
            <p className="mt-1 text-xs text-rust">{loadError}</p>
            <Button variant="secondary" onClick={() => void loadApps()} className="mt-4">
              Coba lagi
            </Button>
          </div>
        ) : viewMode === "kanban" ? (
          <div className="mt-8 overflow-x-auto pb-3">
            <div className="grid min-w-[1760px] grid-cols-8 gap-4 items-start">
              {stages.map((stage) => {
                const items = applications.filter((a) => a.status === stage.key);


                return (
                  <div
                    key={stage.key}
                    className="rounded-xl border border-line bg-paper-raised/80 p-3 shadow-sm min-h-[420px] flex flex-col"
                  >
                    <div className="flex items-center justify-between border-b border-line pb-2.5 mb-3">
                      <span className="font-serif text-xs font-bold text-ink">
                        {stage.label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${stage.badge}`}
                      >
                        {items.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1 overflow-y-auto">
                      {items.length === 0 ? (
                        <div className="py-8 text-center text-[11px] text-ink-soft/50 italic">
                          Kosong
                        </div>
                      ) : (
                        items.map((app) => (
                          <div
                            key={app.id}
                            className="rounded-lg border border-line bg-paper p-3 shadow-xs hover:border-forest/60 transition-all group"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="text-xs font-bold text-ink line-clamp-1">
                                {app.position}
                              </h4>
                              <button
                                onClick={() => handleDelete(app.id)}
                                className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-rose-600 transition-opacity p-0.5"
                                title="Hapus"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>

                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-soft">
                              <Building2 className="h-3 w-3 shrink-0" />
                              <span className="truncate">{app.company}</span>
                            </div>

                            {app.matchScore != null && (
                              <div className="mt-2 flex items-center gap-1">
                                <span className="rounded bg-forest-tint px-1.5 py-0.5 text-[9px] font-bold text-forest">
                                  {app.matchScore}% Match
                                </span>
                                {app.jobUrl && (
                                  <a
                                    href={app.jobUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-forest hover:underline flex items-center gap-0.5 ml-auto"
                                  >
                                    Link <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                )}
                              </div>
                            )}

                            {app.notes && (
                              <p className="mt-2 rounded bg-paper-raised p-1.5 text-[10px] text-ink-soft line-clamp-2 border border-line/40">
                                💬 {app.notes}
                              </p>
                            )}

                            <div className="mt-3 pt-2 border-t border-line/60">
                              <label className="block text-[9px] font-semibold text-ink-soft uppercase mb-1">
                                Pindah Tahap:
                              </label>
                              <select
                                value={app.status}
                                onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                                className="w-full rounded border border-line bg-paper-raised px-1.5 py-1 text-[10px] text-ink focus:border-forest focus:outline-none"
                              >
                                <option value="applied">Lamaran Terkirim</option>
                                <option value="hr_interview">Interview HR</option>
                                <option value="user_interview">Interview User</option>
                                <option value="technical_test">Tes Teknis</option>
                                <option value="offer">Offer Diterima 🎉</option>
                                <option value="rejected">Belum Berhasil</option>
                                <option value="ghosted">Belum Ada Respons</option>
                                <option value="withdrawn">Ditarik</option>
                              </select>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="mt-8 overflow-hidden rounded-xl border border-line bg-paper-raised shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-paper text-ink-soft">
                <tr>
                  <th className="px-4 py-3 font-semibold">Posisi & Perusahaan</th>
                  <th className="px-4 py-3 font-semibold">Tahap Saat Ini</th>
                  <th className="px-4 py-3 font-semibold">Skor kecocokan CV</th>
                  <th className="px-4 py-3 font-semibold">Catatan / Link</th>
                  <th className="px-4 py-3 font-semibold">Tanggal Lamar</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-ink-soft">
                      Belum ada data lamaran. Klik "+ Tambah Lamaran" di atas!
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => (
                    <tr key={app.id} className="hover:bg-paper/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-ink block">{app.position}</span>
                        <span className="text-ink-soft text-[11px]">{app.company}</span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                          className="rounded border border-line bg-paper px-2 py-1 text-xs font-semibold text-ink focus:border-forest"
                        >
                          <option value="applied">Lamaran Terkirim</option>
                          <option value="hr_interview">Interview HR</option>
                          <option value="user_interview">Interview User</option>
                          <option value="technical_test">Tes Teknis</option>
                          <option value="offer">Offer Diterima 🎉</option>
                          <option value="rejected">Belum Berhasil</option>
                          <option value="ghosted">Belum Ada Respons</option>
                          <option value="withdrawn">Ditarik</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-forest-tint px-2.5 py-0.5 text-[11px] font-bold text-forest">
                          {app.matchScore == null ? "—" : `${app.matchScore}%`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {app.notes || "-"}
                        {app.jobUrl && (
                          <a
                            href={app.jobUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-forest hover:underline flex items-center gap-1 mt-0.5 text-[11px]"
                          >
                            Buka Link Loker <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {new Date(app.appliedAt).toLocaleDateString("id-ID")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="rounded p-1 text-ink-soft hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Tambah Lamaran */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-2xl border border-line bg-paper-raised p-6 shadow-xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 rounded-full p-1 text-ink-soft hover:bg-paper hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-forest" />
                <h3 className="font-serif text-lg font-bold text-ink">
                  Tambah Riwayat Lamaran
                </h3>
              </div>
              <p className="mt-1 text-xs text-ink-soft">
                Catat lowongan yang baru kamu lamar agar tidak terlewat proses interviewnya.
              </p>

              <form onSubmit={handleCreate} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Nama Perusahaan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Tokopedia, BCA, GoTo"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full rounded-md border border-line bg-paper px-3 py-2 text-xs text-ink focus:border-forest focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Posisi / Role *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Frontend Developer, Product Designer"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full rounded-md border border-line bg-paper px-3 py-2 text-xs text-ink focus:border-forest focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Tahapan Awal
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                    className="w-full rounded-md border border-line bg-paper px-3 py-2 text-xs text-ink focus:border-forest focus:outline-none"
                  >
                    <option value="applied">Lamaran Terkirim (Screening)</option>
                    <option value="hr_interview">Interview HR</option>
                    <option value="user_interview">Interview User</option>
                    <option value="technical_test">Tes Teknis</option>
                    <option value="offer">Offer Diterima</option>
                    <option value="rejected">Belum Berhasil</option>
                    <option value="ghosted">Belum Ada Respons</option>
                    <option value="withdrawn">Ditarik</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Link Lowongan / URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://jobstreet.co.id/... atau linkedin.com/..."
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    className="w-full rounded-md border border-line bg-paper px-3 py-2 text-xs text-ink focus:border-forest focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Catatan Khusus (Ekspektasi Gaji, Jadwal, Pertanyaan)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Jadwal interview user hari Selasa jam 14:00..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-md border border-line bg-paper px-3 py-2 text-xs text-ink focus:border-forest focus:outline-none"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-line">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Menyimpan..." : "Simpan Lamaran"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-line py-6 text-center text-xs text-ink-soft">
        CV Optimizer Application Tracker — Bantu kamu organize lamaran hingga tanda tangan kontrak.
      </footer>

      {/* Job Importer Modal */}
      <JobImporterModal
        isOpen={jobImporterOpen}
        onClose={() => setJobImporterOpen(false)}
        onOptimize={handleImportedOptimize}
        onSaveToTracker={handleSaveImportedJob}
      />
    </div>
  );
}
