import { useState } from "react";
import {
  Mail,
  Copy,
  Check,
  Download,
  Sparkles,
  Loader2,
  Edit3,
  Eye,
  RefreshCw,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "./Button";
import { generateCoverLetter } from "../lib/api";
import type { CoverLetterResult, StructuredCv } from "../types/cv";

interface CoverLetterSectionProps {
  cvData: StructuredCv;
  jobDescription: string;
}

export function CoverLetterSection({
  cvData,
  jobDescription,
}: CoverLetterSectionProps) {
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [tone, setTone] = useState<"professional" | "modern">("professional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState<CoverLetterResult | null>(null);

  // Editable fields
  const [editableContent, setEditableContent] = useState("");
  const [editableSubject, setEditableSubject] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Feedback states
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateCoverLetter(cvData, jobDescription, {
        language,
        tone,
      });
      setCoverLetter(res.coverLetter);
      setEditableSubject(res.coverLetter.subject);
      setEditableContent(res.coverLetter.content);
      setIsEditing(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal membuat surat lamaran. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const textToCopy = `Subject: ${editableSubject}\n\nKepada: ${
      coverLetter?.recipient || "Hiring Team"
    }\n\n${editableContent}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownloadTxt = () => {
    const textToDownload = `Subject: ${editableSubject}\nKepada: ${
      coverLetter?.recipient || "Hiring Team"
    }\n\n${editableContent}\n\n---\nDibuat dengan CV Optimizer AI`;

    const blob = new Blob([textToDownload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const applicantName = cvData.personalInfo?.name || "Kandidat";
    link.download = `Cover_Letter_${applicantName.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-6 sm:p-8 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2 text-forest font-semibold text-xs tracking-wider uppercase">
            <Mail className="h-4 w-4" />
            <span>AI Cover Letter Generator</span>
          </div>
          <h3 className="mt-1 font-serif text-2xl font-bold text-ink">
            Surat Lamaran Kerja Terpersonalisasi
          </h3>
          <p className="mt-1 text-xs text-ink-soft">
            Dihubungkan secara cerdas antara pengalaman riil Anda dengan poin-poin yang diminta recruiter.
          </p>
        </div>

        {coverLetter && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1.5 gap-1.5 text-xs"
            >
              {isEditing ? (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Pratinjau
                </>
              ) : (
                <>
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit Teks
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={handleCopy}
              className="px-3 py-1.5 gap-1.5 text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Tersalin!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Salin Teks
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={handleDownloadTxt}
              className="px-3 py-1.5 gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Download .txt
            </Button>
          </div>
        )}
      </div>

      {/* Control Bar: Language & Tone */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-paper p-4 border border-line/70">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Language Selector */}
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-ink-soft" />
            <span className="font-semibold text-ink">Bahasa:</span>
            <div className="inline-flex rounded-lg border border-line bg-paper-raised p-0.5">
              <button
                type="button"
                onClick={() => setLanguage("id")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  language === "id"
                    ? "bg-forest text-white shadow-xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                🇮🇩 Indonesia
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  language === "en"
                    ? "bg-forest text-white shadow-xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                🇬🇧 English
              </button>
            </div>
          </div>

          {/* Tone Selector */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-ink-soft" />
            <span className="font-semibold text-ink">Gaya Bahasa:</span>
            <div className="inline-flex rounded-lg border border-line bg-paper-raised p-0.5">
              <button
                type="button"
                onClick={() => setTone("professional")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  tone === "professional"
                    ? "bg-forest text-white shadow-xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                👔 Formal & Profesional
              </button>
              <button
                type="button"
                onClick={() => setTone("modern")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  tone === "modern"
                    ? "bg-forest text-white shadow-xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                🚀 Modern & Startup
              </button>
            </div>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="px-4 py-2 gap-2 text-xs"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Menyusun Surat...
            </>
          ) : coverLetter ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate Surat
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Buat Surat Lamaran Sekarang
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rust/30 bg-rust-tint p-3 text-xs text-rust">
          {error}
        </div>
      )}

      {/* Main Content Area */}
      {!coverLetter && !loading && (
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-line py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-tint text-forest">
            <Mail className="h-6 w-6" />
          </div>
          <h4 className="mt-3 font-semibold text-ink">Belum Ada Surat Lamaran</h4>
          <p className="mt-1 max-w-md text-xs text-ink-soft">
            Klik tombol <strong>"Buat Surat Lamaran Sekarang"</strong> di atas untuk membuat cover letter yang dirancang khusus memikat recruiter posisi ini.
          </p>
        </div>
      )}

      {loading && (
        <div className="mt-8 flex flex-col items-center justify-center py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-forest" />
          <p className="mt-3 text-sm font-semibold text-ink">
            AI sedang menganalisis kecocokan dan menulis surat lamaran...
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Menghubungkan pencapaian di CV Anda dengan tantangan di deskripsi pekerjaan.
          </p>
        </div>
      )}

      {coverLetter && !loading && (
        <div className="mt-6 space-y-4">
          {/* Highlights Chips */}
          {coverLetter.keyHighlights && coverLetter.keyHighlights.length > 0 && (
            <div className="rounded-xl border border-forest/20 bg-forest-tint/40 p-4">
              <div className="text-xs font-bold text-forest-dark uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-forest" />
                <span>Poin Kekuatan Lamaran Ini</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {coverLetter.keyHighlights.map((hl, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-md bg-paper-raised px-2.5 py-1 text-xs font-medium text-ink border border-line shadow-2xs"
                  >
                    ✨ {hl}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Letter Document Preview */}
          <div className="rounded-xl border border-line bg-paper p-6 sm:p-8 font-sans shadow-xs">
            {/* Subject Line */}
            <div className="border-b border-line pb-4 mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block">
                Subjek Email / Surat:
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={editableSubject}
                  onChange={(e) => setEditableSubject(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-paper-raised px-3 py-1.5 text-sm font-semibold text-ink focus:outline-hidden focus:border-forest"
                />
              ) : (
                <p className="mt-0.5 text-sm font-semibold text-ink">{editableSubject}</p>
              )}
            </div>

            {/* Recipient */}
            <div className="mb-4">
              <p className="text-xs text-ink-soft">
                {coverLetter.recipient || "Yth. Tim Rekrutmen"}
              </p>
            </div>

            {/* Letter Body */}
            {isEditing ? (
              <div>
                <label className="text-[11px] font-semibold text-ink-soft block mb-1">
                  Isi Surat (Bisa Anda edit sesuka hati):
                </label>
                <textarea
                  rows={14}
                  value={editableContent}
                  onChange={(e) => setEditableContent(e.target.value)}
                  className="w-full rounded-lg border border-line bg-paper-raised p-3 text-sm leading-relaxed text-ink focus:outline-hidden focus:border-forest"
                />
              </div>
            ) : (
              <div className="space-y-4 text-sm leading-relaxed text-ink whitespace-pre-line">
                {editableContent}
              </div>
            )}

            {/* Signature Preview */}
            <div className="mt-6 border-t border-line/60 pt-4 text-xs text-ink-soft">
              <p>Hormat saya,</p>
              <p className="mt-1 font-semibold text-ink">
                {cvData.personalInfo?.name || "Nama Pelamar"}
              </p>
              {cvData.personalInfo?.phone && <p>{cvData.personalInfo.phone}</p>}
              {cvData.personalInfo?.email && <p>{cvData.personalInfo.email}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
