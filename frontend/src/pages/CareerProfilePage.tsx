import { useEffect, useState } from "react";
import { Header } from "../components/Header";
import {
  getCareerProfile,
  getCvVersions,
  saveCareerProfile,
  type CareerProfile,
  type CvVersionItem,
} from "../lib/api";
import type {
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  StructuredCv,
} from "../types/cv";
import { CheckCircle2, Plus, Save, Sparkles, Trash2 } from "lucide-react";

const emptyCv = (): StructuredCv => ({
  personalInfo: {
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
  },
  summary: "",
  skills: [],
  experience: [],
  projects: [],
  education: [],
  certifications: [],
});

const emptyProfile = (): CareerProfile => ({
  structuredCv: emptyCv(),
  languages: [],
  targetRoles: [],
  preferredIndustries: [],
  preferredLocations: [],
  employmentPreferences: [],
  expectedSalaryMin: null,
  expectedSalaryMax: null,
  salaryCurrency: "IDR",
});

function parseList(value: string): string[] {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-ink">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-forest focus:outline-none"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-ink">{label}</span>
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm leading-relaxed text-ink placeholder:text-ink-soft/60 focus:border-forest focus:outline-none"
      />
    </label>
  );
}

function ListField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
}) {
  return (
    <TextAreaField
      label={label}
      value={value.join("\n")}
      onChange={(text) => onChange(parseList(text))}
      placeholder={placeholder}
      rows={3}
    />
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-line bg-paper-raised p-4 shadow-sm sm:p-6">
      <div>
        <h2 className="font-serif text-lg font-bold text-ink">{title}</h2>
        {description && <p className="mt-1 text-xs leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function CareerProfilePage() {
  const [profile, setProfile] = useState<CareerProfile>(emptyProfile);
  const [versions, setVersions] = useState<CvVersionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getCareerProfile(), getCvVersions()])
      .then(([savedProfile, cvVersions]) => {
        if (!active) return;
        if (savedProfile) setProfile(savedProfile);
        setVersions(cvVersions);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "Gagal memuat profil karier.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const updateCv = <K extends keyof StructuredCv>(key: K, value: StructuredCv[K]) => {
    setProfile((current) => ({
      ...current,
      structuredCv: { ...current.structuredCv, [key]: value },
    }));
    setSaved(false);
  };

  const updatePersonalInfo = (
    key: keyof StructuredCv["personalInfo"],
    value: string
  ) => {
    updateCv("personalInfo", { ...profile.structuredCv.personalInfo, [key]: value });
  };

  const updateExperience = (index: number, patch: Partial<ExperienceEntry>) => {
    updateCv(
      "experience",
      profile.structuredCv.experience.map((entry, itemIndex) =>
        itemIndex === index ? { ...entry, ...patch } : entry
      )
    );
  };

  const updateEducation = (index: number, patch: Partial<EducationEntry>) => {
    updateCv(
      "education",
      profile.structuredCv.education.map((entry, itemIndex) =>
        itemIndex === index ? { ...entry, ...patch } : entry
      )
    );
  };

  const updateProject = (index: number, patch: Partial<ProjectEntry>) => {
    updateCv(
      "projects",
      profile.structuredCv.projects.map((entry, itemIndex) =>
        itemIndex === index ? { ...entry, ...patch } : entry
      )
    );
  };

  const updateList = (
    key: "languages" | "targetRoles" | "preferredIndustries" | "preferredLocations",
    value: string[]
  ) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const addSavedCvToProfile = () => {
    if (!versions[0]) return;
    if (!window.confirm("Impor CV tersimpan akan mengganti bagian data CV pada formulir. Preferensi karier tidak berubah. Lanjutkan?")) {
      return;
    }
    setProfile((current) => ({ ...current, structuredCv: versions[0].structured }));
    setSaved(false);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const result = await saveCareerProfile({
        structuredCv: profile.structuredCv,
        languages: profile.languages,
        targetRoles: profile.targetRoles,
        preferredIndustries: profile.preferredIndustries,
        preferredLocations: profile.preferredLocations,
        employmentPreferences: profile.employmentPreferences,
        expectedSalaryMin: profile.expectedSalaryMin,
        expectedSalaryMax: profile.expectedSalaryMax,
        salaryCurrency: profile.salaryCurrency,
      });
      setProfile(result);
      setSaved(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Gagal menyimpan profil karier.");
    } finally {
      setSaving(false);
    }
  };

  const toggleEmploymentPreference = (preference: "remote" | "hybrid" | "onsite") => {
    setProfile((current) => ({
      ...current,
      employmentPreferences: current.employmentPreferences.includes(preference)
        ? current.employmentPreferences.filter((item) => item !== preference)
        : [...current.employmentPreferences, preference],
    }));
    setSaved(false);
  };

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-forest-tint px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-forest">
              <Sparkles className="h-3.5 w-3.5" /> Profil karier
            </p>
            <h1 className="mt-2 font-serif text-2xl font-bold text-ink sm:text-3xl">
              Satu profil untuk perjalanan kariermu
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
              Informasi ini disimpan di akunmu dan menjadi konteks untuk rekomendasi lowongan serta persiapan lamaran.
            </p>
          </div>
          {versions[0] && (
            <button
              type="button"
              onClick={addSavedCvToProfile}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-forest/40 bg-paper-raised px-3 py-2 text-xs font-semibold text-forest hover:bg-forest-tint"
            >
              <Sparkles className="h-4 w-4" />
              Isi dari CV tersimpan
            </button>
          )}
        </header>

        {loading ? (
          <div className="py-16 text-center text-sm text-ink-soft" role="status">Memuat profil...</div>
        ) : loadError ? (
          <div className="rounded-xl border border-rust/30 bg-rust-tint p-4 text-sm text-rust" role="alert">
            {loadError}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {versions.length > 0 && (
              <p className="text-xs text-ink-soft">
                {versions.length} versi CV tersimpan. Versi terbaru: {versions[0].label || "CV"} ·{" "}
                {new Date(versions[0].createdAt).toLocaleDateString("id-ID")}
              </p>
            )}

            <Section title="Informasi pribadi">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Nama lengkap" value={profile.structuredCv.personalInfo.name} onChange={(value) => updatePersonalInfo("name", value)} />
                <TextField label="Email" type="email" value={profile.structuredCv.personalInfo.email} onChange={(value) => updatePersonalInfo("email", value)} />
                <TextField label="Nomor telepon" value={profile.structuredCv.personalInfo.phone} onChange={(value) => updatePersonalInfo("phone", value)} />
                <TextField label="Kota / domisili" value={profile.structuredCv.personalInfo.location} onChange={(value) => updatePersonalInfo("location", value)} />
                <TextField label="LinkedIn" type="url" value={profile.structuredCv.personalInfo.linkedin} onChange={(value) => updatePersonalInfo("linkedin", value)} placeholder="https://linkedin.com/in/..." />
                <TextField label="GitHub / portofolio" type="url" value={profile.structuredCv.personalInfo.github} onChange={(value) => updatePersonalInfo("github", value)} placeholder="https://..." />
              </div>
              <TextAreaField label="Ringkasan profesional" value={profile.structuredCv.summary} onChange={(value) => updateCv("summary", value)} placeholder="Ringkas pengalaman, kekuatan, dan arah kariermu." />
            </Section>

            <Section title="Pendidikan">
              {profile.structuredCv.education.map((education, index) => (
                <div key={index} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-2">
                  <TextField label="Institusi" value={education.institution} onChange={(value) => updateEducation(index, { institution: value })} />
                  <TextField label="Gelar" value={education.degree} onChange={(value) => updateEducation(index, { degree: value })} />
                  <TextField label="Jurusan / bidang" value={education.field} onChange={(value) => updateEducation(index, { field: value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <TextField label="Mulai" value={education.startDate} onChange={(value) => updateEducation(index, { startDate: value })} placeholder="2021" />
                    <TextField label="Selesai" value={education.endDate} onChange={(value) => updateEducation(index, { endDate: value })} placeholder="2025 / Sekarang" />
                  </div>
                  <button type="button" onClick={() => updateCv("education", profile.structuredCv.education.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-rust hover:underline">
                    <Trash2 className="h-3.5 w-3.5" /> Hapus pendidikan
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => updateCv("education", [...profile.structuredCv.education, { institution: "", degree: "", field: "", startDate: "", endDate: "" }])} className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:underline">
                <Plus className="h-4 w-4" /> Tambah pendidikan
              </button>
            </Section>

            <Section title="Pengalaman kerja dan magang" description="Cantumkan pengalaman kerja, magang, organisasi, atau aktivitas relevan.">
              {profile.structuredCv.experience.map((experience, index) => (
                <div key={index} className="space-y-3 rounded-xl border border-line p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField label="Perusahaan / organisasi" value={experience.company} onChange={(value) => updateExperience(index, { company: value })} />
                    <TextField label="Posisi" value={experience.position} onChange={(value) => updateExperience(index, { position: value })} />
                    <TextField label="Mulai" value={experience.startDate} onChange={(value) => updateExperience(index, { startDate: value })} placeholder="2023" />
                    <TextField label="Selesai" value={experience.endDate} onChange={(value) => updateExperience(index, { endDate: value })} placeholder="2025 / Sekarang" />
                  </div>
                  <TextAreaField label="Pencapaian dan tanggung jawab (satu per baris)" value={experience.bullets.join("\n")} onChange={(value) => updateExperience(index, { bullets: parseList(value) })} />
                  <button type="button" onClick={() => updateCv("experience", profile.structuredCv.experience.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex items-center gap-1 text-xs font-semibold text-rust hover:underline">
                    <Trash2 className="h-3.5 w-3.5" /> Hapus pengalaman
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => updateCv("experience", [...profile.structuredCv.experience, { company: "", position: "", startDate: "", endDate: "", bullets: [] }])} className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:underline">
                <Plus className="h-4 w-4" /> Tambah pengalaman
              </button>
            </Section>

            <Section title="Proyek dan portofolio">
              {profile.structuredCv.projects.map((project, index) => (
                <div key={index} className="space-y-3 rounded-xl border border-line p-3">
                  <TextField label="Nama proyek" value={project.name} onChange={(value) => updateProject(index, { name: value })} />
                  <TextAreaField label="Deskripsi" value={project.description} onChange={(value) => updateProject(index, { description: value })} />
                  <ListField label="Teknologi (satu per baris)" value={project.technologies} onChange={(value) => updateProject(index, { technologies: value })} placeholder="React&#10;TypeScript" />
                  <TextAreaField label="Kontribusi / hasil (satu per baris)" value={project.bullets.join("\n")} onChange={(value) => updateProject(index, { bullets: parseList(value) })} />
                  <button type="button" onClick={() => updateCv("projects", profile.structuredCv.projects.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex items-center gap-1 text-xs font-semibold text-rust hover:underline">
                    <Trash2 className="h-3.5 w-3.5" /> Hapus proyek
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => updateCv("projects", [...profile.structuredCv.projects, { name: "", description: "", technologies: [], bullets: [] }])} className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:underline">
                <Plus className="h-4 w-4" /> Tambah proyek
              </button>
            </Section>

            <Section title="Keahlian dan bahasa">
              <div className="grid gap-4 sm:grid-cols-2">
                <ListField label="Keahlian (satu per baris)" value={profile.structuredCv.skills} onChange={(value) => updateCv("skills", value)} placeholder="Excel&#10;Customer service&#10;Python" />
                <ListField label="Bahasa dan tingkat kemahiran" value={profile.languages} onChange={(value) => updateList("languages", value)} placeholder="Bahasa Indonesia — Native&#10;English — Intermediate" />
                <ListField label="Sertifikasi (satu per baris)" value={profile.structuredCv.certifications} onChange={(value) => updateCv("certifications", value)} placeholder="Nama sertifikasi — penerbit — tahun" />
              </div>
            </Section>

            <Section title="Preferensi karier" description="Preferensi ini membantu menyusun rekomendasi yang lebih relevan.">
              <div className="grid gap-4 sm:grid-cols-2">
                <ListField label="Posisi yang diminati (satu per baris)" value={profile.targetRoles} onChange={(value) => updateList("targetRoles", value)} placeholder="Customer service&#10;Account manager" />
                <ListField label="Industri pilihan (satu per baris)" value={profile.preferredIndustries} onChange={(value) => updateList("preferredIndustries", value)} placeholder="Perbankan&#10;Teknologi" />
                <ListField label="Lokasi kerja pilihan (satu per baris)" value={profile.preferredLocations} onChange={(value) => updateList("preferredLocations", value)} placeholder="Jakarta&#10;Bandung&#10;Remote" />
              </div>
              <fieldset>
                <legend className="text-xs font-semibold text-ink">Preferensi cara kerja</legend>
                <div className="mt-2 flex flex-wrap gap-3">
                  {([
                    ["remote", "Remote"],
                    ["hybrid", "Hybrid"],
                    ["onsite", "Onsite"],
                  ] as const).map(([value, label]) => (
                    <label key={value} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs text-ink">
                      <input type="checkbox" checked={profile.employmentPreferences.includes(value)} onChange={() => toggleEmploymentPreference(value)} className="accent-forest" />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-[150px_1fr_1fr]">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-ink">Mata uang</span>
                  <select value={profile.salaryCurrency} onChange={(event) => { setProfile((current) => ({ ...current, salaryCurrency: event.target.value as CareerProfile["salaryCurrency"] })); setSaved(false); }} className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink">
                    <option value="IDR">IDR / Rupiah</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
                <TextField label="Ekspektasi minimum / bulan" type="number" value={profile.expectedSalaryMin?.toString() ?? ""} onChange={(value) => { setProfile((current) => ({ ...current, expectedSalaryMin: value ? Number(value) : null })); setSaved(false); }} />
                <TextField label="Ekspektasi maksimum / bulan" type="number" value={profile.expectedSalaryMax?.toString() ?? ""} onChange={(value) => { setProfile((current) => ({ ...current, expectedSalaryMax: value ? Number(value) : null })); setSaved(false); }} />
              </div>
            </Section>

            {saveError && <p className="rounded-lg border border-rust/30 bg-rust-tint px-3 py-2 text-sm text-rust" role="alert">{saveError}</p>}
            {saved && <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700" role="status"><CheckCircle2 className="h-4 w-4" /> Profil karier tersimpan.</p>}
            <div className="flex justify-end pb-4">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-forest-dark disabled:cursor-not-allowed disabled:opacity-50">
                <Save className="h-4 w-4" /> {saving ? "Menyimpan..." : "Simpan profil"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
