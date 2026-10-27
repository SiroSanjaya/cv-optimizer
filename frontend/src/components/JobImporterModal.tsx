import { useState, useCallback } from "react";
import {
  importJobFromUrl,
  importJobFromText,
  type ImportedJob,
} from "../lib/api";
import {
  Link2,
  ClipboardPaste,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  Briefcase,
  ChevronRight,
  Sparkles,
  Plus,
  ExternalLink,
} from "lucide-react";

interface JobImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when user clicks "Optimize for This Job" */
  onOptimize: (job: ImportedJob) => void;
  /** Called when user clicks "Simpan ke Tracker" */
  onSaveToTracker?: (job: ImportedJob) => void;
}

type ImportMode = "url" | "text";
type ImportState = "idle" | "loading" | "success" | "error";

const SUPPORTED_PLATFORMS = [
  { name: "LinkedIn", domain: "linkedin.com" },
  { name: "Glints", domain: "glints.com" },
  { name: "JobStreet", domain: "jobstreet.co.id" },
  { name: "Kalibrr", domain: "kalibrr.com" },
  { name: "Indeed", domain: "indeed.com" },
];

export function JobImporterModal({
  isOpen,
  onClose,
  onOptimize,
  onSaveToTracker,
}: JobImporterModalProps) {
  const [mode, setMode] = useState<ImportMode>("url");
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [sourceUrlInput, setSourceUrlInput] = useState("");
  const [importState, setImportState] = useState<ImportState>("idle");
  const [importedJob, setImportedJob] = useState<ImportedJob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedToTracker, setSavedToTracker] = useState(false);

  const reset = useCallback(() => {
    setImportState("idle");
    setImportedJob(null);
    setErrorMsg(null);
    setUrlInput("");
    setTextInput("");
    setSourceUrlInput("");
    setSavedToTracker(false);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleImport = async () => {
    setImportState("loading");
    setErrorMsg(null);
    try {
      let job: ImportedJob;
      if (mode === "url") {
        if (!urlInput.trim()) throw new Error("Masukkan URL lowongan terlebih dahulu.");
        job = await importJobFromUrl(urlInput.trim());
      } else {
        if (!textInput.trim()) throw new Error("Tempel job description terlebih dahulu.");
        job = await importJobFromText(textInput.trim(), sourceUrlInput.trim() || undefined);
      }
      setImportedJob(job);
      setImportState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal memproses lowongan.");
      setImportState("error");
    }
  };

  const handleSaveToTracker = () => {
    if (!importedJob || !onSaveToTracker) return;
    onSaveToTracker(importedJob);
    setSavedToTracker(true);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-line bg-paper-raised shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper-raised/95 backdrop-blur-sm p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-tint">
              <Sparkles className="h-5 w-5 text-forest" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Impor Lowongan</h2>
              <p className="text-xs text-ink-soft">
                Dari URL atau copy-paste — langsung siap dioptimasi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-paper hover:text-ink"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {importState !== "success" && (
            <>
              {/* Mode Toggle */}
              <div className="flex gap-1 rounded-xl bg-paper p-1">
                <button
                  type="button"
                  onClick={() => { setMode("url"); setErrorMsg(null); }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    mode === "url"
                      ? "bg-paper-raised text-ink shadow-sm"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  <Link2 className="h-4 w-4" />
                  Import dari URL
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("text"); setErrorMsg(null); }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    mode === "text"
                      ? "bg-paper-raised text-ink shadow-sm"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  <ClipboardPaste className="h-4 w-4" />
                  Paste Teks JD
                </button>
              </div>

              {/* URL Mode */}
              {mode === "url" && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      URL Lowongan
                    </label>
                    <input
                      type="url"
                      id="job-import-url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://www.linkedin.com/jobs/view/..."
                      className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-forest focus:outline-none"
                      onKeyDown={(e) => e.key === "Enter" && handleImport()}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-xs text-ink-soft">Platform didukung:</span>
                    {SUPPORTED_PLATFORMS.map((p) => (
                      <span
                        key={p.domain}
                        className="rounded-full border border-line bg-paper px-2.5 py-0.5 text-xs text-ink-soft"
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-ink-soft/70">
                    Hanya halaman lowongan publik yang dapat diakses. Gunakan mode Paste Teks
                    jika halaman membutuhkan login.
                  </p>
                </div>
              )}

              {/* Text Paste Mode */}
              {mode === "text" && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Job Description
                      <span className="ml-1 text-xs font-normal text-ink-soft">(copy-paste dari platform manapun)</span>
                    </label>
                    <textarea
                      id="job-import-text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Paste seluruh teks job description di sini, termasuk kualifikasi, tanggung jawab, dan persyaratan..."
                      rows={8}
                      className="w-full resize-none rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-forest focus:outline-none"
                    />
                    <p className="mt-1 text-right text-xs text-ink-soft">
                      {textInput.length} karakter
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      URL Sumber
                      <span className="ml-1 text-xs font-normal text-ink-soft">(opsional)</span>
                    </label>
                    <input
                      type="url"
                      id="job-import-source-url"
                      value={sourceUrlInput}
                      onChange={(e) => setSourceUrlInput(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-forest focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {importState === "error" && errorMsg && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-sm text-red-700">{errorMsg}</p>
                </div>
              )}

              {/* Import Button */}
              <button
                type="button"
                id="job-import-submit"
                onClick={handleImport}
                disabled={importState === "loading"}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-dark disabled:opacity-60"
              >
                {importState === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI sedang memproses lowongan...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Proses Lowongan
                  </>
                )}
              </button>
            </>
          )}

          {/* Success: Preview Parsed Job */}
          {importState === "success" && importedJob && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">Lowongan berhasil diimpor!</p>
                  <p className="text-xs text-emerald-600">
                    AI berhasil mengekstrak detail dari {importedJob.sourcePlatform}.
                  </p>
                </div>
              </div>

              {/* Job card preview */}
              <div className="rounded-xl border border-line bg-paper p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-ink">{importedJob.position}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {importedJob.company}
                      </span>
                      {importedJob.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {importedJob.location}
                        </span>
                      )}
                      {importedJob.jobType && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5" />
                          {importedJob.jobType}
                        </span>
                      )}
                    </div>
                  </div>
                  {importedJob.sourceUrl && (
                    <a
                      href={importedJob.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-lg border border-line p-2 text-ink-soft transition-colors hover:text-ink"
                      title="Buka halaman asli"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>

                {importedJob.salaryRange && (
                  <p className="text-sm font-medium text-forest">{importedJob.salaryRange}</p>
                )}

                {/* Skills */}
                {importedJob.skills.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-soft">
                      Skills Terdeteksi
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {importedJob.skills.slice(0, 10).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-forest/20 bg-forest-tint px-2.5 py-0.5 text-xs text-forest"
                        >
                          {skill}
                        </span>
                      ))}
                      {importedJob.skills.length > 10 && (
                        <span className="text-xs text-ink-soft">
                          +{importedJob.skills.length - 10} lainnya
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* JD Preview */}
                {importedJob.jobDescription && (
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-medium text-forest hover:text-forest-dark">
                      Lihat Job Description ({importedJob.jobDescription.length} karakter)
                    </summary>
                    <p className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-paper p-3 text-xs text-ink-soft whitespace-pre-line">
                      {importedJob.jobDescription.slice(0, 1200)}
                      {importedJob.jobDescription.length > 1200 && "..."}
                    </p>
                  </details>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  id="job-import-optimize"
                  onClick={() => { onOptimize(importedJob); handleClose(); }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-dark"
                >
                  <Sparkles className="h-4 w-4" />
                  Optimasi CV untuk Lowongan Ini
                  <ChevronRight className="h-4 w-4" />
                </button>
                {onSaveToTracker && (
                  <button
                    type="button"
                    id="job-import-save-tracker"
                    onClick={handleSaveToTracker}
                    disabled={savedToTracker}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors sm:w-auto ${
                      savedToTracker
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-line bg-paper text-ink hover:border-forest/30 hover:bg-forest-tint"
                    }`}
                  >
                    {savedToTracker ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Tersimpan
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Simpan ke Tracker
                      </>
                    )}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={reset}
                className="w-full text-center text-sm text-ink-soft underline-offset-2 hover:underline"
              >
                Impor lowongan lain
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
