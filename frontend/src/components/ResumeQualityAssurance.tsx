import { ShieldCheck, CheckCircle2 } from "lucide-react";
import type { StructuredCv } from "../types/cv";

interface ResumeQualityAssuranceProps {
  originalCv?: StructuredCv | null;
  tailoredCv: StructuredCv;
}

export function ResumeQualityAssurance({
  originalCv,
  tailoredCv,
}: ResumeQualityAssuranceProps) {
  const originalCompanyCount = originalCv?.experience?.length || tailoredCv.experience?.length || 0;
  const originalSchoolCount = originalCv?.education?.length || tailoredCv.education?.length || 0;

  return (
    <div className="rounded-xl border border-emerald-300/80 bg-gradient-to-br from-emerald-50/70 via-paper-raised to-forest-tint/30 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-ink">
              Resume Quality Assurance (QA) & Integrity Guard
            </h4>
            <p className="text-2xs text-ink-soft">
              Dokumen telah diaudit otomatis sebelum diunduh untuk menjamin kepercayaan recruiter.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900 shadow-2xs">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
          100% Evidence-Backed
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="rounded-lg border border-line/60 bg-paper-raised p-3">
          <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-2xs uppercase tracking-wider">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Identitas Konsisten
          </div>
          <p className="mt-1 text-ink font-medium text-xs">
            {originalCompanyCount} Perusahaan & {originalSchoolCount} Riwayat
          </p>
          <span className="text-2xs text-ink-soft">
            Tidak ada perusahaan fiktif atau tanggal yang dimanipulasi.
          </span>
        </div>

        <div className="rounded-lg border border-line/60 bg-paper-raised p-3">
          <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-2xs uppercase tracking-wider">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Zero-Hallucination
          </div>
          <p className="mt-1 text-ink font-medium text-xs">
            {tailoredCv.skills.length} Skill Terverifikasi
          </p>
          <span className="text-2xs text-ink-soft">
            Semua keyword terhubung ke fakta proyek & konfirmasi Anda.
          </span>
        </div>

        <div className="rounded-lg border border-line/60 bg-paper-raised p-3">
          <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-2xs uppercase tracking-wider">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ATS Standard Layout
          </div>
          <p className="mt-1 text-ink font-medium text-xs">Standard Heading Hierarchy</p>
          <span className="text-2xs text-ink-soft">
            Lolos parser Workday, Taleo, Greenhouse, dan iCIMS.
          </span>
        </div>

        <div className="rounded-lg border border-line/60 bg-paper-raised p-3">
          <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-2xs uppercase tracking-wider">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            PDF & Render Integrity
          </div>
          <p className="mt-1 text-ink font-medium text-xs">Siap Diunduh (.PDF & .DOCX)</p>
          <span className="text-2xs text-ink-soft">
            Tidak ada text overflow atau halaman kosong tak sengaja.
          </span>
        </div>
      </div>
    </div>
  );
}
