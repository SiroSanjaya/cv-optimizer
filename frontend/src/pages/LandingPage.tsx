import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Briefcase,
  TrendingUp,
  Layers,
  Search,
  MessageSquareText,
  Map,
  FileText,
} from "lucide-react";
import { Header } from "../components/Header";
import { HeroDocument } from "../components/HeroDocument";

const trustPoints = [
  { icon: CheckCircle2, label: "Berangkat dari pengalaman kerjamu" },
  { icon: ShieldCheck, label: "Kamu tetap pegang kendali atas hasilnya" },
];

const features = [
  {
    icon: TrendingUp,
    title: "CV sesuai lowongan",
    description:
      "Lihat pengalaman yang relevan dan bagian yang perlu diperjelas.",
    color: "bg-forest-tint text-forest",
  },
  {
    icon: Map,
    title: "Cari lowongan",
    description:
      "Jelajahi pilihan profesi dan periksa detail di sumber lowongan.",
    color: "bg-amber-tint text-amber",
  },
  {
    icon: Layers,
    title: "Tracker lamaran",
    description:
      "Catat posisi, tahap seleksi, dan jadwal tindak lanjut.",
    color: "bg-blue-50 text-blue-700",
  },
  {
    icon: MessageSquareText,
    title: "Latihan interview",
    description:
      "Berlatih dengan pertanyaan berdasarkan pengalaman dan role.",
    color: "bg-rust-tint text-rust",
  },
];

const steps = [
  {
    number: "01",
    title: "Mulai dari CV dan role",
    body: "Unggah CV, lalu pilih lowongan atau tempel deskripsi posisi yang kamu incar.",
  },
  {
    number: "02",
    title: "Tinjau kecocokan",
    body: "Periksa pengalaman dan skill yang relevan maupun yang belum terlihat di CV.",
  },
  {
    number: "03",
    title: "Siapkan materi lamaran",
    body: "Buat draf CV dan cover letter untuk posisi itu, lalu koreksi sebelum digunakan.",
  },
  {
    number: "04",
    title: "Pantau prosesnya",
    body: "Simpan lamaran di tracker dan latihan menjelang wawancara berikutnya.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative isolate overflow-hidden bg-gradient-to-br from-forest-dark via-forest to-ink">
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-40 h-[30rem] w-[30rem] rounded-full border border-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-[22rem] w-[22rem] rounded-full border border-white/10" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-7 px-4 py-8 sm:gap-10 sm:px-8 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-12 lg:py-20">
            <div className="min-w-0">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-semibold leading-4 text-white/90 backdrop-blur sm:text-xs">
                <Briefcase className="h-3.5 w-3.5" />
                <span>Untuk perjalanan karier berikutnya</span>
              </div>

              <h1 className="mt-4 max-w-2xl font-serif text-[2rem] font-semibold leading-[1.12] tracking-tight text-white sm:mt-6 sm:text-5xl lg:text-6xl">
                Bikin pengalamanmu lebih terlihat di lamaran berikutnya.
              </h1>

              <p className="mt-3 max-w-xl text-[13px] leading-6 text-white/75 sm:mt-5 sm:text-base sm:leading-7">
                Temukan lowongan, sesuaikan CV, dan pantau lamaran dalam satu
                alur. Kamu tetap meninjau semuanya sebelum dikirim.
              </p>

              <div className="mt-5 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:items-center">
                <Link
                  to="/optimize"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white bg-white px-5 py-3 text-sm font-bold text-forest-dark shadow-lg transition hover:bg-forest-tint sm:w-auto"
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  Siapkan CV untuk lowongan
                </Link>
                <Link
                  to="/jobs"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
                >
                  <Search className="h-4 w-4" />
                  Lihat lowongan dulu
                </Link>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-2 border-t border-white/15 pt-4 sm:mt-8 sm:flex sm:gap-8 sm:pt-6">
                {trustPoints.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                    <span className="text-[10px] font-medium leading-4 text-white/80 sm:text-xs">{label}</span>
                  </div>
                ))}
              </dl>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:hidden" aria-label="Alur singkat produk">
              {[
                { label: "Cari role", icon: Search },
                { label: "Sesuaikan CV", icon: FileText },
                { label: "Pantau proses", icon: CheckCircle2 },
              ].map(({ label, icon: Icon }, index) => (
                <div
                  key={label}
                  className="flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-2 py-3 text-center backdrop-blur"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-emerald-100">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-[10px] font-semibold leading-4 text-white/90">
                    {String(index + 1).padStart(2, "0")} · {label}
                  </span>
                </div>
              ))}
            </div>

            <div className="hidden rounded-3xl border border-white/15 bg-white/5 p-3 shadow-2xl backdrop-blur-sm sm:block sm:p-6">
              <HeroDocument />
              <p className="mt-3 text-center text-[11px] text-white/55">
                Ilustrasi alur produk — bukan hasil penilaian kandidat.
              </p>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="border-y border-line bg-paper-raised py-10 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-forest">
                Semua langkah dalam satu tempat
              </span>
              <h2 className="mt-2 font-serif text-2xl font-bold leading-tight text-ink sm:text-3xl">
                Dari cari lowongan sampai siap melamar.
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-xs leading-5 text-ink-soft sm:text-sm sm:leading-6">
                Pakai pengalamanmu sebagai dasar, sesuaikan materi untuk tiap
                posisi, dan tentukan sendiri apa yang akan dikirim.
              </p>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-5 lg:grid-cols-4">
              {features.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="group rounded-2xl border border-line bg-paper p-3.5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-forest/40 hover:shadow-lg sm:p-5"
                  >
                    <div className={`inline-flex rounded-xl p-2.5 ${item.color} sm:p-3`}>
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-3 font-serif text-sm font-bold leading-5 text-ink transition-colors group-hover:text-forest sm:mt-4 sm:text-lg sm:leading-6">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-[11px] leading-[1.35rem] text-ink-soft sm:mt-2 sm:text-sm sm:leading-6">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Step-by-Step Flow */}
        <section id="how-it-works" className="border-t border-line bg-paper py-10 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-xl text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-forest">
                Cara kerja
              </span>
              <h2 className="mt-2 font-serif text-2xl font-bold leading-tight text-ink sm:text-3xl">
                Langkahnya jelas, kamu tetap pegang kendali.
              </h2>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-5 lg:grid-cols-4">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="rounded-2xl border border-line bg-paper-raised p-3.5 shadow-sm sm:p-5"
                >
                  <span className="font-serif text-2xl font-bold text-forest/50 sm:text-3xl">
                    {step.number}
                  </span>
                  <h3 className="mt-2 font-serif text-xs font-bold leading-5 text-ink sm:mt-3 sm:text-sm">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-[11px] leading-5 text-ink-soft sm:mt-2 sm:text-xs sm:leading-relaxed">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-line bg-forest-tint/50 px-4 py-10 text-center sm:px-6 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-2xl font-bold leading-tight text-ink sm:text-4xl">
              Satu langkah kecil menuju lamaran yang lebih siap.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-xs leading-5 text-ink-soft sm:text-sm sm:leading-relaxed">
              Mulai dari CV atau cari posisi yang ingin kamu incar.
            </p>
            <div className="mx-auto mt-6 flex max-w-md flex-col justify-center gap-2.5 sm:mt-8 sm:flex-row sm:gap-3">
              <Link to="/optimize">
                <span className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-forest px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-dark sm:w-auto">
                  <Sparkles className="h-4 w-4" />
                  Siapkan CV
                </span>
              </Link>
              <Link
                to="/jobs"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-paper px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-forest hover:text-forest"
              >
                Cari lowongan
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-paper px-4 py-6 pb-24 text-center text-xs text-ink-soft sm:px-6 sm:py-8 sm:pb-24 xl:pb-8">
        <p>CV Optimizer — ruang kerja pencarian karier untuk profesional Indonesia.</p>
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
