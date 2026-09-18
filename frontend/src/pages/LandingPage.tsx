import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Briefcase,
  TrendingUp,
  Layers,
  Link2,
  Search,
} from "lucide-react";
import { Header } from "../components/Header";
import { HeroDocument } from "../components/HeroDocument";
import { Button } from "../components/Button";

const trustPoints = [
  { icon: Sparkles, label: "Gratis selama masa beta" },
  { icon: CheckCircle2, label: "Format standar ATS 100%" },
  { icon: UploadCloud, label: "Analisa Gemini AI Cerdas" },
  { icon: ShieldCheck, label: "Anti-halusinasi data CV" },
];

const features = [
  {
    icon: TrendingUp,
    title: "Probabilitas Lolos Screening",
    description:
      "Ketahui persis persentase kemungkinan CV kamu lolos filter ATS dan recruiter sebelum mengirimkan lamaran.",
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    icon: Link2,
    title: "Import Link LinkedIn & Web",
    description:
      "Tinggal paste URL profil LinkedIn, JobStreet, atau teks bio kamu — AI kami otomatis menstrukturkannya jadi CV rapi.",
    color: "bg-blue-50 text-blue-700",
  },
  {
    icon: Search,
    title: "Rekomendasi Loker Otomatis",
    description:
      "Temukan puluhan lowongan aktif di Indonesia (Indeed, Kalibrr, tech ecosystem) yang paling cocok dengan skill kamu.",
    color: "bg-amber-50 text-amber-700",
  },
  {
    icon: Layers,
    title: "Application Pipeline Tracker",
    description:
      "Kelola semua lamaran dalam kanban board terpadu: pantau tahap screening, Interview HR, User, hingga penawaran offer.",
    color: "bg-purple-50 text-purple-700",
  },
];

const steps = [
  {
    number: "01",
    title: "Upload CV atau Tempel Link",
    body: "Upload file PDF/Word, atau cukup paste link profil LinkedIn kamu. AI kami mengekstrak keahlian dan pengalaman kerja.",
  },
  {
    number: "02",
    title: "Masukkan Posisi Impian",
    body: "Paste job description dari JobStreet, LinkedIn, Glints, atau portal karier perusahaan yang kamu incar.",
  },
  {
    number: "03",
    title: "Cek Probabilitas & Gap Skill",
    body: "Lihat visualisasi skor kecocokan, keyword yang kurang, serta rekomendasi penyesuaian poin pengalamanmu.",
  },
  {
    number: "04",
    title: "Generate & Pantau di Tracker",
    body: "Unduh CV versi ATS terbaikmu (PDF/Word) dan langsung simpan ke dashboard pipeline lamaran kerja!",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 sm:py-24 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-forest/30 bg-forest-tint px-3 py-1 text-xs font-semibold text-forest">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Platform Pencari Kerja All-in-One #1 di Indonesia</span>
            </div>

            <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">
              Optimasi CV & Pantau Interview Sampai Diterima Kerja.
            </h1>

            <p className="mt-5 max-w-lg text-sm sm:text-base leading-relaxed text-ink-soft">
              Bukan sekadar pembuat CV biasa. Ukur <strong>probabilitas keterima</strong>, sesuaikan keyword dengan standar ATS, pantau tahapan interview HR & User, dan dapatkan rekomendasi lowongan yang paling cocok dengan skill kamu.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/optimize">
                <Button className="px-6 py-3 text-sm gap-2 shadow-md">
                  <Sparkles className="h-4 w-4" />
                  Mulai Optimasi Sekarang (Gratis)
                </Button>
              </Link>
              <Link
                to="/tracker"
                className="flex items-center gap-1.5 rounded-lg border border-line bg-paper-raised px-5 py-3 text-xs font-bold text-ink shadow-xs hover:border-forest hover:text-forest transition-colors"
              >
                <Briefcase className="h-4 w-4" />
                Buka Pipeline Tracker
              </Link>
            </div>

            {/* Trust points */}
            <dl className="mt-10 grid grid-cols-2 gap-4 border-t border-line/70 pt-6">
              {trustPoints.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-forest" />
                  <span className="text-xs font-medium text-ink-soft">{label}</span>
                </div>
              ))}
            </dl>
          </div>

          <HeroDocument />
        </section>

        {/* Feature Highlights Grid */}
        <section className="border-y border-line bg-paper-raised py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-forest">
                Fitur Lengkap Modern
              </span>
              <h2 className="mt-2 font-serif text-2xl font-bold text-ink sm:text-3xl">
                Semua yang Kamu Butuhkan untuk Lolos Seleksi Kerja
              </h2>
              <p className="mt-2 text-xs text-ink-soft">
                Dibangun dengan teknologi Google Gemini AI untuk memaksimalkan setiap kesempatan interview.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-line bg-paper p-6 shadow-xs hover:border-forest/50 transition-all group"
                  >
                    <div className={`inline-flex rounded-lg p-2.5 ${item.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-serif text-base font-bold text-ink group-hover:text-forest transition-colors">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Step-by-Step Flow */}
        <section id="how-it-works" className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center max-w-xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-forest">
                Langkah Cepat
              </span>
              <h2 className="mt-1 font-serif text-2xl font-bold text-ink sm:text-3xl">
                Cara Kerja CV Optimizer
              </h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="rounded-xl border border-line bg-paper-raised p-6 shadow-xs"
                >
                  <span className="font-serif text-3xl font-bold text-forest/40">
                    {step.number}
                  </span>
                  <h3 className="mt-3 font-serif text-sm font-bold text-ink">{step.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-line bg-paper-raised py-16 text-center sm:py-20">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="font-serif text-3xl font-bold text-ink sm:text-4xl">
              Siap Lolos ke Tahap Interview Berikutnya?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-xs sm:text-sm text-ink-soft leading-relaxed">
              Bergabung dengan ribuan pencari kerja yang telah meningkatkan peluang lolos screening hingga 3x lipat dengan CV terarah.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/optimize">
                <Button className="px-8 py-3 text-sm gap-2">
                  <Sparkles className="h-4 w-4" />
                  Optimasi CV Sekarang
                </Button>
              </Link>
              <Link
                to="/jobs"
                className="rounded-md border border-line bg-paper px-6 py-3 text-xs font-semibold text-ink hover:border-forest hover:text-forest transition-colors"
              >
                Eksplor Lowongan Kerja
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8 text-center text-xs text-ink-soft bg-paper">
        CV Optimizer — Dibuat untuk para pencari kerja di Indonesia dan global.
      </footer>
    </div>
  );
}
