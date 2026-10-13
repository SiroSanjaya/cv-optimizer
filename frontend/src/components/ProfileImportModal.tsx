import React, { useState } from "react";
import { Link2, FileCode, AlignLeft, X, Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "./Button";
import { importProfile, type AnalyzeResponse } from "../lib/api";

interface ProfileImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobDescription?: string;
  onImportSuccess: (data: AnalyzeResponse) => void;
}

export const ProfileImportModal: React.FC<ProfileImportModalProps> = ({
  isOpen,
  onClose,
  jobDescription = "",
  onImportSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<"url" | "text" | "json">("url");
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = async () => {
    setError(null);
    setIsLoading(true);

    try {
      let payload: { type: "url" | "text" | "json"; url?: string; content?: string; jobDescription?: string };

      if (activeTab === "url") {
        if (!urlInput.trim() || !urlInput.includes("http")) {
          throw new Error("Masukkan URL lengkap (misal: https://linkedin.com/in/username atau profil JobStreet).");
        }
        payload = { type: "url", url: urlInput.trim(), jobDescription };
      } else if (activeTab === "json") {
        if (!jsonInput.trim()) {
          throw new Error("Silakan paste isi file JSON export profil kamu.");
        }
        payload = { type: "json", content: jsonInput.trim(), jobDescription };
      } else {
        if (!textInput.trim() || textInput.trim().length < 40) {
          throw new Error("Silakan paste teks profil/CV kamu minimal 40 karakter.");
        }
        payload = { type: "text", content: textInput.trim(), jobDescription };
      }

      const res = await importProfile(payload);
      onImportSuccess(res);
      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal mengimpor profil. Coba opsi paste teks manual.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInput(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-line bg-paper-raised p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-ink-soft hover:bg-paper hover:text-ink"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-forest" />
          <h2 className="font-serif text-xl font-semibold text-ink">
            Import dari LinkedIn / Web
          </h2>
        </div>
        <p className="mt-1 text-xs text-ink-soft">
          Ekstrak profil dan pengalaman kamu secara otomatis tanpa perlu upload file dokumen.
        </p>

        {/* Tab Selection */}
        <div className="mt-5 grid grid-cols-3 gap-1 rounded-lg border border-line bg-paper p-1 text-xs font-medium">
          <button
            onClick={() => { setActiveTab("url"); setError(null); }}
            className={`flex items-center justify-center gap-1.5 rounded-md py-2 transition-all ${
              activeTab === "url"
                ? "bg-paper-raised text-forest font-semibold shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <Link2 className="h-3.5 w-3.5" />
            Link URL
          </button>
          <button
            onClick={() => { setActiveTab("text"); setError(null); }}
            className={`flex items-center justify-center gap-1.5 rounded-md py-2 transition-all ${
              activeTab === "text"
                ? "bg-paper-raised text-forest font-semibold shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <AlignLeft className="h-3.5 w-3.5" />
            Paste Teks
          </button>
          <button
            onClick={() => { setActiveTab("json"); setError(null); }}
            className={`flex items-center justify-center gap-1.5 rounded-md py-2 transition-all ${
              activeTab === "json"
                ? "bg-paper-raised text-forest font-semibold shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            JSON Export
          </button>
        </div>

        {/* Content based on tab */}
        <div className="mt-4">
          {activeTab === "url" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  URL Profil Publik (LinkedIn / JobStreet / Portfolio / Github)
                </label>
                <input
                  type="url"
                  placeholder="https://www.linkedin.com/in/username"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none"
                />
              </div>
              <div className="rounded-md bg-paper p-3 text-[11px] text-ink-soft leading-relaxed border border-line/50">
                <span className="font-semibold text-ink">Catatan:</span> Beberapa situs membatasi akses otomatis. Jika URL tidak dapat diakses, gunakan tab <strong>"Paste Teks"</strong> agar kamu bisa memasukkan informasi profil secara langsung.
              </div>
            </div>
          )}

          {activeTab === "text" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Copy & Paste Bagian About, Pengalaman, dan Skill
                </label>
                <textarea
                  rows={5}
                  placeholder="Paste ringkasan profil, riwayat pekerjaan, pendidikan, dan keahlian kamu di sini. AI akan otomatis menstrukturkannya..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="w-full rounded-md border border-line bg-paper p-3 text-xs text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-ink-soft">
                Metode paling fleksibel: bisa dari format biodata apapun, profil JobStreet, atau draft CV.
              </p>
            </div>
          )}

          {activeTab === "json" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Upload atau Paste LinkedIn Data Export (.json)
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-forest-tint file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-forest hover:file:bg-forest/20"
                />
              </div>
              <textarea
                rows={4}
                placeholder='Atau paste isi JSON langsung: { "firstName": "...", "positions": [...] }'
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full rounded-md border border-line bg-paper p-3 text-xs font-mono text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button onClick={handleImport} disabled={isLoading} className="gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Mengekstrak dengan AI...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Ekstrak & Gunakan Profil
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
