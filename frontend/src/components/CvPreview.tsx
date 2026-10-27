import { useState } from "react";
import {
  Check,
  Download,
  Edit3,
  FileText,
  Plus,
  Trash2,
  Printer,
  Copy,
  Sparkles,
  MapPin,
  Mail,
  Phone,
  Globe,
  Calendar,
  Building2,
  Eye,
  Sliders,
} from "lucide-react";
import type { EducationEntry, StructuredCv } from "../types/cv";
import { downloadCvFile } from "../lib/api";
import { Button } from "./Button";

interface CvPreviewProps {
  cv: StructuredCv;
  onChange: (cv: StructuredCv) => void;
}

type TemplateStyle = "executive" | "classic" | "tech";
type Density = "spacious" | "compact";

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function CvPreview({ cv, onChange }: CvPreviewProps) {
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [template, setTemplate] = useState<TemplateStyle>("executive");
  const [density, setDensity] = useState<Density>("spacious");
  const [copiedPlainText, setCopiedPlainText] = useState(false);

  const handleDownload = async (format: "pdf" | "docx") => {
    setDownloading(format);
    setError(null);
    try {
      const blob = await downloadCvFile(
        cv,
        format,
        format === "pdf" ? { template, density } : undefined
      );
      const name = (cv.personalInfo.name || "CV").replace(/\s+/g, "_");
      triggerBrowserDownload(blob, `${name}_Optimized.${format}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunduh berkas CV.");
    } finally {
      setDownloading(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyPlainText = async () => {
    const text = [
      cv.personalInfo.name || "Curriculum Vitae",
      [
        cv.personalInfo.email,
        cv.personalInfo.phone,
        cv.personalInfo.location,
        cv.personalInfo.linkedin,
        cv.personalInfo.github,
      ]
        .filter(Boolean)
        .join(" | "),
      "",
      cv.summary ? `SUMMARY\n${cv.summary}\n` : "",
      cv.skills.length ? `SKILLS\n${cv.skills.join(", ")}\n` : "",
      cv.experience.length
        ? `WORK EXPERIENCE\n` +
          cv.experience
            .map(
              (e) =>
                `${e.position} - ${e.company} (${e.startDate} - ${e.endDate})\n` +
                e.bullets.map((b) => `• ${b}`).join("\n")
            )
            .join("\n\n") +
          "\n"
        : "",
      cv.projects.length
        ? `KEY PROJECTS\n` +
          cv.projects
            .map(
              (p) =>
                `${p.name}${p.technologies.length ? ` [${p.technologies.join(", ")}]` : ""}\n${p.description ? p.description + "\n" : ""}` +
                p.bullets.map((b) => `• ${b}`).join("\n")
            )
            .join("\n\n") +
          "\n"
        : "",
      cv.education.length
        ? `EDUCATION\n` +
          cv.education
            .map(
              (ed) =>
                `${ed.degree}${ed.field ? `, ${ed.field}` : ""} - ${ed.institution} (${ed.startDate} - ${ed.endDate})`
            )
            .join("\n")
        : "",
      cv.certifications.length
        ? `\nCERTIFICATIONS\n${cv.certifications.join(", ")}`
        : "",
    ]
      .filter((line) => line !== "")
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopiedPlainText(true);
      setTimeout(() => setCopiedPlainText(false), 2000);
    } catch {}
  };

  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-4 sm:p-7 shadow-sm">
      {/* Top Header & Actions Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest/10 text-forest">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-ink">
              CV Tailored Siap Kirim
            </h3>
            <p className="text-[11px] text-ink-soft">
              Diformat khusus agar mudah dipindai HR dalam 6 detik & lolos ATS
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Plaintext Copy */}
          <button
            type="button"
            onClick={handleCopyPlainText}
            title="Salin teks bersih untuk form ATS online"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink-soft hover:text-ink hover:border-forest/40 transition-all cursor-pointer"
          >
            {copiedPlainText ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedPlainText ? "Tersalin!" : "Salin ATS Text"}</span>
          </button>

          {/* Edit Button */}
          <Button
            variant="secondary"
            onClick={() => setEditing((value) => !value)}
            disabled={downloading !== null}
            className="text-xs py-1.5 px-3"
          >
            {editing ? <Check className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
            {editing ? "Selesai Edit" : "Edit Butir CV"}
          </Button>

          {/* Browser Print / Save PDF */}
          <button
            type="button"
            onClick={handlePrint}
            title="Cetak langsung atau simpan via Print Dialog"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink-soft hover:text-ink hover:border-forest/40 transition-all cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-ink-soft" />
            <span>Cetak</span>
          </button>

          {/* DOCX Download */}
          <Button
            variant="secondary"
            onClick={() => handleDownload("docx")}
            disabled={downloading !== null}
            className="text-xs py-1.5 px-3"
          >
            <Download className="h-3.5 w-3.5" />
            {downloading === "docx" ? "Memproses..." : "Unduh DOCX"}
          </Button>

          {/* PDF Download */}
          <Button
            onClick={() => handleDownload("pdf")}
            disabled={downloading !== null}
            className="text-xs py-1.5 px-3.5"
          >
            <Download className="h-3.5 w-3.5" />
            {downloading === "pdf" ? "Memproses..." : "Unduh PDF ATS"}
          </Button>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-rust font-medium">{error}</p>}

      {/* Style & Layout Controls Bar */}
      {!editing && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-forest-tint/40 border border-forest/15 px-4 py-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-forest uppercase tracking-wider flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> Tema Tampilan:
            </span>
            <div className="inline-flex rounded-lg bg-paper p-0.5 border border-line shadow-2xs">
              <button
                type="button"
                onClick={() => setTemplate("executive")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  template === "executive"
                    ? "bg-forest text-white shadow-xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Executive Modern (HR Fav)
              </button>
              <button
                type="button"
                onClick={() => setTemplate("classic")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  template === "classic"
                    ? "bg-forest text-white shadow-xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Corporate Classic
              </button>
              <button
                type="button"
                onClick={() => setTemplate("tech")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  template === "tech"
                    ? "bg-forest text-white shadow-xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Tech Minimalist
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-ink-soft flex items-center gap-1">
              <Sliders className="h-3.5 w-3.5" /> Kerapatan:
            </span>
            <div className="inline-flex rounded-lg bg-paper p-0.5 border border-line shadow-2xs text-xs">
              <button
                type="button"
                onClick={() => setDensity("spacious")}
                className={`rounded-md px-2 py-0.5 font-semibold transition-all ${
                  density === "spacious" ? "bg-emerald-100 text-emerald-900" : "text-ink-soft hover:text-ink"
                }`}
                title="Format lega: jarak baris optimal, mata HR tidak lelah"
              >
                Lega & Nyaman (HR Recommended)
              </button>
              <button
                type="button"
                onClick={() => setDensity("compact")}
                className={`rounded-md px-2 py-0.5 font-semibold transition-all ${
                  density === "compact" ? "bg-emerald-100 text-emerald-900" : "text-ink-soft hover:text-ink"
                }`}
                title="Format padat untuk 1 halaman ringkas"
              >
                Kompak 1-Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor or Document Sheet Preview */}
      {editing ? (
        <CvEditForm cv={cv} onChange={onChange} />
      ) : (
        <div className="mt-5 flex justify-center bg-paper/60 p-2 sm:p-5 rounded-xl border border-line/50 overflow-x-auto">
          {/* A4 Paper Canvas */}
          <div
            id="printable-cv"
            className={`w-full max-w-[820px] bg-white text-slate-800 shadow-md rounded-xl border border-slate-200 transition-all ${
              density === "spacious" ? "p-8 sm:p-12 space-y-6" : "p-6 sm:p-9 space-y-4"
            } ${template === "classic" ? "font-serif" : "font-sans"}`}
          >
            {/* Header Section */}
            <div
              className={`border-b pb-5 ${
                template === "executive"
                  ? "border-emerald-600/30 pl-4 border-l-4 border-l-emerald-600"
                  : template === "tech"
                  ? "border-slate-800 pb-4"
                  : "border-slate-300 text-center"
              }`}
            >
              <h1
                className={`font-bold tracking-tight text-slate-900 ${
                  template === "classic" ? "text-2xl sm:text-3xl font-serif" : "text-2xl sm:text-3xl font-sans"
                }`}
              >
                {cv.personalInfo.name || "Nama Lengkap"}
              </h1>

              {/* Contact Information Bar */}
              <div
                className={`mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600 ${
                  template === "classic" ? "justify-center" : "items-center"
                }`}
              >
                {cv.personalInfo.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{cv.personalInfo.email}</span>
                  </span>
                )}
                {cv.personalInfo.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{cv.personalInfo.phone}</span>
                  </span>
                )}
                {cv.personalInfo.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>{cv.personalInfo.location}</span>
                  </span>
                )}
                {cv.personalInfo.linkedin && (
                  <span className="inline-flex items-center gap-1 text-emerald-800 font-medium">
                    <Globe className="h-3.5 w-3.5 text-emerald-700" />
                    <span>in/{cv.personalInfo.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "")}</span>
                  </span>
                )}
                {cv.personalInfo.github && (
                  <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                    <Globe className="h-3.5 w-3.5 text-slate-500" />
                    <span>gh/{cv.personalInfo.github.replace(/^https?:\/\/(www\.)?github\.com\//i, "")}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Professional Summary */}
            {cv.summary && (
              <CvSection title="Ringkasan Profesional" template={template}>
                <p
                  className={`text-slate-700 ${
                    density === "spacious"
                      ? "text-sm leading-relaxed"
                      : "text-xs leading-normal"
                  }`}
                >
                  {cv.summary}
                </p>
              </CvSection>
            )}

            {/* Skills Badges / Chips */}
            {cv.skills.length > 0 && (
              <CvSection title="Keahlian & Kompetensi Utama" template={template}>
                <div className="flex flex-wrap gap-1.5">
                  {cv.skills.map((skill, index) => (
                    <span
                      key={index}
                      className={`inline-flex items-center rounded-md border font-medium ${
                        template === "tech"
                          ? "bg-slate-100 text-slate-800 border-slate-300 font-mono text-[11px] px-2 py-0.5"
                          : template === "classic"
                          ? "bg-stone-50 text-stone-800 border-stone-200 text-xs px-2.5 py-0.5"
                          : "bg-emerald-50 text-emerald-900 border-emerald-200 text-xs px-2.5 py-0.5"
                      }`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </CvSection>
            )}

            {/* Work Experience */}
            {cv.experience.length > 0 && (
              <CvSection title="Pengalaman Kerja" template={template}>
                <div className={density === "spacious" ? "space-y-5" : "space-y-3.5"}>
                  {cv.experience.map((exp, i) => (
                    <div key={i} className="group">
                      {/* Role Header Row */}
                      <div className="flex flex-wrap items-baseline justify-between gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                            {exp.position}
                          </h4>
                          <span className="text-slate-400 font-normal">di</span>
                          <span className="font-semibold text-emerald-800 text-sm flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                            {exp.company}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>
                            {exp.startDate} – {exp.endDate || "Sekarang"}
                          </span>
                        </div>
                      </div>

                      {/* Bullet points */}
                      {exp.bullets && exp.bullets.length > 0 && (
                        <ul
                          className={`mt-2 space-y-1.5 ${
                            density === "spacious" ? "pl-2" : "pl-1"
                          }`}
                        >
                          {exp.bullets.map((bullet, j) => (
                            <li
                              key={j}
                              className={`flex items-start gap-2.5 text-slate-700 ${
                                density === "spacious"
                                  ? "text-xs sm:text-sm leading-relaxed"
                                  : "text-xs leading-normal"
                              }`}
                            >
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </CvSection>
            )}

            {/* Projects */}
            {cv.projects.length > 0 && (
              <CvSection title="Proyek Unggulan" template={template}>
                <div className={density === "spacious" ? "space-y-4" : "space-y-3"}>
                  {cv.projects.map((proj, i) => (
                    <div key={i}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-bold text-slate-900 text-sm">
                          {proj.name}
                        </p>
                        {proj.technologies && proj.technologies.length > 0 && (
                          <span className="text-[11px] font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {proj.technologies.join(" · ")}
                          </span>
                        )}
                      </div>

                      {proj.description && (
                        <p className="mt-1 text-xs sm:text-sm text-slate-700 leading-relaxed">
                          {proj.description}
                        </p>
                      )}

                      {proj.bullets && proj.bullets.length > 0 && (
                        <ul className="mt-1.5 space-y-1 pl-2">
                          {proj.bullets.map((bullet, j) => (
                            <li
                              key={j}
                              className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 leading-relaxed"
                            >
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </CvSection>
            )}

            {/* Education */}
            {cv.education.length > 0 && (
              <CvSection title="Pendidikan" template={template}>
                <div className="space-y-2.5">
                  {cv.education.map((edu, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-baseline justify-between gap-1"
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          {edu.degree}
                          {edu.field ? `, ${edu.field}` : ""}
                        </p>
                        <p className="text-xs text-slate-600">{edu.institution}</p>
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        {edu.startDate} – {edu.endDate}
                      </span>
                    </div>
                  ))}
                </div>
              </CvSection>
            )}

            {/* Certifications */}
            {cv.certifications.length > 0 && (
              <CvSection title="Sertifikasi & Lisensi" template={template}>
                <div className="flex flex-wrap gap-2">
                  {cv.certifications.map((cert, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800"
                    >
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      {cert}
                    </span>
                  ))}
                </div>
              </CvSection>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CvSection({
  title,
  template,
  children,
}: {
  title: string;
  template: TemplateStyle;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div
        className={`flex items-center gap-2 border-b pb-1.5 ${
          template === "executive"
            ? "border-emerald-600/30"
            : template === "tech"
            ? "border-slate-800"
            : "border-slate-300"
        }`}
      >
        <h3
          className={`font-bold tracking-wider uppercase text-xs sm:text-sm ${
            template === "executive"
              ? "text-emerald-800"
              : template === "tech"
              ? "text-slate-900 font-mono"
              : "text-slate-800"
          }`}
        >
          {title}
        </h3>
      </div>
      <div className="pt-1">{children}</div>
    </section>
  );
}

function CvEditForm({
  cv,
  onChange,
}: {
  cv: StructuredCv;
  onChange: (cv: StructuredCv) => void;
}) {
  const updateExperience = (
    index: number,
    field: "company" | "position" | "startDate" | "endDate",
    value: string
  ) => {
    onChange({
      ...cv,
      experience: cv.experience.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    });
  };

  const updateEducation = (
    index: number,
    field: keyof EducationEntry,
    value: string
  ) => {
    onChange({
      ...cv,
      education: cv.education.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    });
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl bg-forest-tint/60 border border-forest/30 p-3 text-xs text-forest-dark flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-forest" />
        <span>
          Semua perubahan di form ini langsung sinkron ke pratinjau dan file PDF/DOCX yang diunduh.
        </span>
      </div>

      <FormSection title="Informasi Kontak & Profil">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Nama Lengkap"
            value={cv.personalInfo.name}
            onChange={(name) =>
              onChange({ ...cv, personalInfo: { ...cv.personalInfo, name } })
            }
          />
          <TextField
            label="Email"
            value={cv.personalInfo.email}
            onChange={(email) =>
              onChange({ ...cv, personalInfo: { ...cv.personalInfo, email } })
            }
          />
          <TextField
            label="Nomor Telepon"
            value={cv.personalInfo.phone}
            onChange={(phone) =>
              onChange({ ...cv, personalInfo: { ...cv.personalInfo, phone } })
            }
          />
          <TextField
            label="Domisili / Lokasi"
            value={cv.personalInfo.location}
            onChange={(location) =>
              onChange({ ...cv, personalInfo: { ...cv.personalInfo, location } })
            }
          />
          <TextField
            label="Profil LinkedIn"
            value={cv.personalInfo.linkedin}
            onChange={(linkedin) =>
              onChange({ ...cv, personalInfo: { ...cv.personalInfo, linkedin } })
            }
          />
          <TextField
            label="Profil GitHub / Portofolio"
            value={cv.personalInfo.github}
            onChange={(github) =>
              onChange({ ...cv, personalInfo: { ...cv.personalInfo, github } })
            }
          />
        </div>
      </FormSection>

      <FormSection title="Professional Summary">
        <TextAreaField
          label="Ringkasan Profesional (2-3 Kalimat Padat)"
          value={cv.summary}
          onChange={(summary) => onChange({ ...cv, summary })}
          rows={3}
        />
      </FormSection>

      <FormSection title="Keahlian & Kata Kunci (Skills)">
        <TextAreaField
          label="Daftar Keahlian (Pisahkan dengan koma atau baris baru)"
          value={cv.skills.join(", ")}
          onChange={(val) =>
            onChange({
              ...cv,
              skills: val
                .split(/[\n,]/)
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          rows={3}
        />
      </FormSection>

      <FormSection title="Pengalaman Kerja">
        <div className="space-y-4">
          {cv.experience.map((exp, i) => (
            <div key={i} className="rounded-xl border border-line bg-paper p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Posisi / Jabatan"
                  value={exp.position}
                  onChange={(val) => updateExperience(i, "position", val)}
                />
                <TextField
                  label="Nama Perusahaan"
                  value={exp.company}
                  onChange={(val) => updateExperience(i, "company", val)}
                />
                <TextField
                  label="Tanggal Mulai"
                  value={exp.startDate}
                  onChange={(val) => updateExperience(i, "startDate", val)}
                />
                <TextField
                  label="Tanggal Selesai"
                  value={exp.endDate}
                  onChange={(val) => updateExperience(i, "endDate", val)}
                />
              </div>
              <div className="mt-3">
                <TextAreaField
                  label="Pencapaian & Tugas (1 butir per baris)"
                  value={exp.bullets.join("\n")}
                  onChange={(val) =>
                    onChange({
                      ...cv,
                      experience: cv.experience.map((item, idx) =>
                        idx === i ? { ...item, bullets: parseLines(val) } : item
                      ),
                    })
                  }
                  rows={4}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...cv,
                    experience: cv.experience.filter((_, idx) => idx !== i),
                  })
                }
                className="mt-2 inline-flex items-center gap-1 text-xs text-rust hover:underline cursor-pointer"
              >
                <Trash2 className="h-3 w-3" /> Hapus Pekerjaan Ini
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...cv,
                experience: [
                  ...cv.experience,
                  {
                    company: "",
                    position: "",
                    startDate: "",
                    endDate: "",
                    bullets: [],
                  },
                ],
              })
            }
            className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:text-forest-dark cursor-pointer"
          >
            <Plus className="h-4 w-4" /> + Tambah Pengalaman Baru
          </button>
        </div>
      </FormSection>

      <FormSection title="Pendidikan">
        <div className="space-y-3">
          {cv.education.map((edu, i) => (
            <div key={i} className="rounded-xl border border-line bg-paper p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Institusi / Universitas"
                  value={edu.institution}
                  onChange={(val) => updateEducation(i, "institution", val)}
                />
                <TextField
                  label="Gelar / Jenjang"
                  value={edu.degree}
                  onChange={(val) => updateEducation(i, "degree", val)}
                />
                <TextField
                  label="Jurusan / Bidang Studi"
                  value={edu.field}
                  onChange={(val) => updateEducation(i, "field", val)}
                />
                <TextField
                  label="Tahun Lulus"
                  value={edu.endDate}
                  onChange={(val) => updateEducation(i, "endDate", val)}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...cv,
                    education: cv.education.filter((_, idx) => idx !== i),
                  })
                }
                className="mt-2 inline-flex items-center gap-1 text-xs text-rust hover:underline cursor-pointer"
              >
                <Trash2 className="h-3 w-3" /> Hapus Pendidikan
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...cv,
                education: [
                  ...cv.education,
                  { institution: "", degree: "", field: "", startDate: "", endDate: "" },
                ],
              })
            }
            className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:text-forest-dark cursor-pointer"
          >
            <Plus className="h-4 w-4" /> + Tambah Pendidikan
          </button>
        </div>
      </FormSection>
    </div>
  );
}

function parseLines(value: string): string[] {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-paper-raised p-5 shadow-2xs space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-forest">
        {title}
      </h4>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-medium text-ink-soft">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink focus:border-forest focus:outline-hidden"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block text-xs font-medium text-ink-soft">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs leading-relaxed text-ink focus:border-forest focus:outline-hidden"
      />
    </label>
  );
}
