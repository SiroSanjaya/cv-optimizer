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
} from "lucide-react";
import { Header } from "../components/Header";
import { HeroDocument } from "../components/HeroDocument";
import { Button } from "../components/Button";

const trustPoints = [
  { icon: CheckCircle2, label: "Berangkat dari pengalaman kerjamu" },
  { icon: ShieldCheck, label: "Kamu tetap pegang kendali atas hasilnya" },
];

const features = [
  {
    icon: TrendingUp,
    title: "Cocokkan pengalaman dengan role",
    description:
      "Lihat skill dan persyaratan yang terdeteksi dari lowongan, lalu tinjau bagian CV yang relevan. Skor hanya panduan, bukan prediksi lolos.",
    color: "bg-forest-tint text-forest",
  },
  {
    icon: Map,
    title: "Temukan lowongan yang relevan",
    description:
      "Jelajahi lowongan Indonesia, regional, dan remote dari sumber yang tersedia. Periksa detailnya di situs penyedia sebelum melamar.",
    color: "bg-amber-tint text-amber",
  },
  {
    icon: Layers,
    title: "Jaga semua lamaran tetap rapi",
    description:
      "Catat perusahaan, posisi, tahap seleksi, dan tindak lanjut tanpa harus mengandalkan banyak spreadsheet.",
    color: "bg-blue-50 text-blue-700",
  },
  {
    icon: MessageSquareText,
    title: "Siapkan diri untuk tahap berikutnya",
    description:
      "Latihan wawancara dengan pertanyaan sesuai role dan pengalamanmu. Gunakan feedback sebagai bahan latihan, bukan penilaian perekrut.",
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
    <div className="min-h-screen bg-paper flex flex-col justify-between">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative isolate overflow-hidden bg-gradient-to-br from-forest-dark via-forest to-ink">
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-40 h-[30rem] w-[30rem] rounded-full border border-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-[22rem] w-[22rem] rounded-full border border-white/10" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-12 lg:py-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur">
                <Briefcase className="h-3.5 w-3.5" />
                <span>Untuk profesional yang sedang mencari langkah berikutnya</span>
              </div>

              <h1 className="mt-6 max-w-2xl font-serif text-4xl font-semibold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Pengalamanmu sudah banyak. Bikin lebih mudah terlihat di lamaran berikutnya.
              </h1>

              <p className="mt-6 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
                Cocokkan CV dengan posisi yang dituju, siapkan materi lamaran,
                dan pantau prosesnya dalam satu alur. Kamu yang memeriksa dan
                memutuskan apa yang akan dikirim.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/optimize">
                  <Button className="w-full border border-white bg-white px-6 py-3 text-sm text-forest-dark shadow-lg transition hover:bg-forest-tint sm:w-auto">
                    <Sparkles className="h-4 w-4" />
                    Sesuaikan CV untuk lowongan
                  </Button>
                </Link>
                <Link
                  to="/jobs"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <Search className="h-4 w-4" />
                  Cari lowongan
                </Link>
              </div>

              <dl className="mt-10 flex flex-col gap-3 border-t border-white/15 pt-6 sm:flex-row sm:gap-8">
                {trustPoints.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0 text-emerald-200" />
                    <span className="text-xs font-medium text-white/80">{label}</span>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/5 p-3 shadow-2xl backdrop-blur-sm sm:p-6">
              <HeroDocument />
              <p className="mt-3 text-center text-[11px] text-white/55">
                Ilustrasi alur produk — bukan hasil penilaian kandidat.
              </p>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="border-y border-line bg-paper-raised py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-forest">
                Satu alur pencarian kerja
              </span>
              <h2 className="mt-2 font-serif text-2xl font-bold text-ink sm:text-3xl">
                Bukan cuma edit CV. Kelola langkah setelahnya juga.
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
                Gunakan pengalaman dan pencapaianmu sebagai dasar. Sesuaikan
                materi untuk setiap posisi, lalu tetap pegang kendali sebelum
                mengirim lamaran.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="group rounded-2xl border border-line bg-paper p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-forest/40 hover:shadow-lg"
                  >
                    <div className={`inline-flex rounded-xl p-3 ${item.color}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-5 font-serif text-lg font-bold text-ink transition-colors group-hover:text-forest">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Step-by-Step Flow */}
        <section id="how-it-works" className="border-t border-line bg-paper py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center max-w-xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-forest">
                Alur kerja
              </span>
              <h2 className="mt-1 font-serif text-2xl font-bold text-ink sm:text-3xl">
                Dari lowongan sampai siap wawancara
              </h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="rounded-2xl border border-line bg-paper-raised p-6 shadow-sm"
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
        <section className="border-t border-line bg-forest-tint/50 py-16 text-center sm:py-20">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="font-serif text-3xl font-bold text-ink sm:text-4xl">
              Siap mengincar posisi berikutnya?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-xs sm:text-sm text-ink-soft leading-relaxed">
              Mulai dengan satu lowongan. Tinjau kecocokan, rapikan materi,
              dan lanjutkan prosesnya dengan lebih teratur.
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
