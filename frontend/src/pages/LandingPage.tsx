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
  { icon: Sparkles, label: "Kuota gratis selama beta" },
  { icon: CheckCircle2, label: "Estimasi relevansi CV" },
  { icon: UploadCloud, label: "Analisis berbantuan AI" },
  { icon: ShieldCheck, label: "Periksa hasil sebelum digunakan" },
];

const features = [
  {
    icon: TrendingUp,
    title: "Estimasi Kecocokan CV",
    description:
      "Bandingkan skill dan pengalaman yang terbaca pada CV dengan persyaratan lowongan. Skor adalah panduan, bukan prediksi hasil seleksi.",
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    icon: Link2,
    title: "Import Profil atau Tempel Teks",
    description:
      "Coba impor profil publik yang dapat diakses, atau tempel teks profil untuk membantu menyusun CV.",
    color: "bg-blue-50 text-blue-700",
  },
  {
    icon: Search,
    title: "Rekomendasi Loker Otomatis",
    description:
      "Jelajahi lowongan dari sumber yang tersedia dan periksa kembali detail serta statusnya pada situs penyedia.",
    color: "bg-amber-50 text-amber-700",
  },
  {
    icon: Layers,
    title: "Tracker Lamaran",
    description:
      "Catat lowongan dan pantau perubahan status lamaran di satu tempat.",
    color: "bg-purple-50 text-purple-700",
  },
];

const steps = [
  {
    number: "01",
    title: "Upload CV atau Tempel Profil",
    body: "Upload PDF/Word, coba impor profil publik, atau tempel teks profil agar AI membantu menstrukturkan informasi.",
  },
  {
    number: "02",
    title: "Masukkan Posisi Impian",
    body: "Paste job description dari JobStreet, LinkedIn, Glints, atau portal karier perusahaan yang kamu incar.",
  },
  {
    number: "03",
    title: "Tinjau Kecocokan & Gap Skill",
    body: "Lihat estimasi kecocokan, skill yang belum terdeteksi, dan saran untuk ditinjau.",
  },
  {
    number: "04",
    title: "Generate & Pantau di Tracker",
    body: "Tinjau dan unduh draf CV (PDF/Word), lalu catat progres lamaran di tracker.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 sm:px-6 sm:py-24 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-forest/30 bg-forest-tint px-3 py-1 text-xs font-semibold text-forest">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Alat bantu untuk proses pencarian kerja</span>
            </div>

            <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">
              Siapkan CV dan kelola progres lamaran dengan lebih teratur.
            </h1>

            <p className="mt-5 max-w-lg text-sm sm:text-base leading-relaxed text-ink-soft">
              Sesuaikan CV dengan lowongan yang dituju, tinjau kecocokan skill, catat progres lamaran, dan siapkan diri untuk wawancara. Skor dan saran AI hanya panduan—bukan jaminan lolos seleksi.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/optimize">
                <Button className="px-6 py-3 text-sm gap-2 shadow-md">
                  <Sparkles className="h-4 w-4" />
                  Coba Optimasi CV
                </Button>
              </Link>
              <Link
                to="/tracker"
                className="flex items-center gap-1.5 rounded-lg border border-line bg-paper-raised px-5 py-3 text-xs font-bold text-ink shadow-xs hover:border-forest hover:text-forest transition-colors"
              >
                <Briefcase className="h-4 w-4" />
                Lihat Tracker Lamaran
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
                Fitur Utama
              </span>
              <h2 className="mt-2 font-serif text-2xl font-bold text-ink sm:text-3xl">
                Dukungan Praktis untuk Proses Melamar Kerja
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
              Siap Menyiapkan Lamaran Berikutnya?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-xs sm:text-sm text-ink-soft leading-relaxed">
              Sesuaikan CV dengan pekerjaan yang dituju, tinjau rekomendasi, dan
              siapkan diri untuk proses seleksi berikutnya.
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
        <p>CV Optimizer — Dibuat untuk para pencari kerja di Indonesia dan global.</p>
        <Link to="/privacy" className="mt-2 inline-block font-semibold text-forest underline">
          Privasi & penggunaan AI
        </Link>
        <span className="mx-2 text-ink-soft" aria-hidden="true">·</span>
        <Link to="/faq" className="mt-2 inline-block font-semibold text-forest underline">
          Pusat Bantuan
        </Link>
      </footer>
    </div>
  );
}
