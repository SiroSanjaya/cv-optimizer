import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck2,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Header } from "../components/Header";
import { HeroDocument } from "../components/HeroDocument";
import { trackProductEvent } from "../lib/api";

const benefits = [
  {
    icon: Search,
    title: "Mulai dari posisi yang kamu incar",
    description: "Cari lowongan atau bawa deskripsi pekerjaan yang sudah kamu temukan.",
  },
  {
    icon: FileCheck2,
    title: "Siapkan dokumen yang relevan",
    description: "Tinjau CV dan surat lamaran yang disesuaikan untuk posisi tersebut.",
  },
  {
    icon: CalendarCheck2,
    title: "Jangan kehilangan jejak",
    description: "Simpan lowongan dan catat status serta tindak lanjut lamaranmu.",
  },
];

const steps = [
  { title: "Pilih lowongan", description: "Cari posisi atau tempel deskripsi pekerjaan." },
  { title: "Sesuaikan CV", description: "Tinjau kecocokan dan edit materi lamaranmu." },
  { title: "Kirim sendiri", description: "Periksa semuanya, lalu kirim lewat situs resmi." },
  { title: "Catat progres", description: "Simpan posisi dan atur pengingat tindak lanjut." },
];

export function LandingPage() {
  useEffect(() => {
    void trackProductEvent("landing_viewed");
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <Header />

      <main>
        <section className="relative isolate overflow-hidden border-b border-line bg-paper-raised">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-36 -top-32 h-[28rem] w-[28rem] rounded-full border border-forest/10 sm:-right-20"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-16 h-[20rem] w-[20rem] rounded-full border border-forest/10 sm:right-0"
          />

          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-12 lg:py-20">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-forest/15 bg-forest-tint px-3 py-1.5 text-[11px] font-bold text-forest">
                <BriefcaseBusiness className="h-3.5 w-3.5" />
                Ruang kerja untuk pencari kerja
              </span>

              <h1 className="mt-5 max-w-2xl font-serif text-[2.35rem] font-semibold leading-[1.06] tracking-tight text-ink sm:mt-6 sm:text-5xl lg:text-6xl">
                Persiapan lamaran, lebih tertata.
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-7 text-ink-soft sm:text-base">
                Satukan lowongan yang kamu incar, CV yang sudah disesuaikan, dan
                progres lamaran dalam satu tempat. Kamu tetap memeriksa dan
                mengirim sendiri.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/jobs"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-forest-dark"
                >
                  Cari lowongan
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/optimize"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-forest/50 hover:bg-paper"
                >
                  <FileText className="h-4 w-4 text-forest" />
                  Mulai dari CV
                </Link>
              </div>

              <div className="mt-7 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:gap-6">
                <p className="flex items-start gap-2 text-xs leading-5 text-ink-soft">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                  Isi CV tetap berdasarkan pengalamanmu
                </p>
                <p className="flex items-start gap-2 text-xs leading-5 text-ink-soft">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                  Tidak ada lamaran yang dikirim otomatis
                </p>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl rounded-3xl border border-line bg-paper p-3 shadow-[0_28px_70px_-38px_rgba(23,33,58,0.35)] sm:p-5">
              <HeroDocument />
              <div className="absolute -bottom-4 left-4 flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 shadow-lg sm:-left-5 sm:bottom-8">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-tint text-forest">
                  <Check className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-semibold text-ink">Kamu tetap pegang kendali</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-8 sm:py-20 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-forest">
              Satu proses, lebih tertata
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
              Fokus ke lamaran berikutnya, bukan cari file yang tercecer.
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:mt-10 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, description }, index) => (
              <article
                key={title}
                className="group rounded-2xl border border-line bg-paper-raised p-5 transition duration-200 hover:-translate-y-1 hover:border-forest/30 hover:shadow-lg sm:p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-tint text-forest">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-serif text-sm font-semibold text-ink-soft/60">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-line bg-paper-raised">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16 lg:px-12">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-forest">
                Alur yang tetap di tanganmu
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
                Dari lowongan yang menarik sampai tindak lanjut.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-ink-soft">
                SatsetCV membantu menyiapkan dan mengingat. Keputusan akhir dan
                pengiriman lamaran tetap milikmu.
              </p>
              <Link
                to="/tracker"
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-dark"
              >
                Lihat tracker lamaran
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <ol className="grid gap-3 sm:grid-cols-2">
              {steps.map(({ title, description }, index) => (
                <li
                  key={title}
                  className="flex gap-4 rounded-2xl border border-line bg-paper p-4 sm:p-5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-bold text-white">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-ink">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-ink-soft">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-8 sm:py-16 lg:px-12">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-3xl bg-forest px-5 py-8 text-white sm:px-10 sm:py-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-white/70">Langkah kecil berikutnya</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight sm:text-3xl">
                Sudah tahu posisi yang kamu incar?
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/75">
                Mulai dari lowongan, atau siapkan CV yang sudah kamu punya.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Link
                to="/jobs"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-forest transition hover:bg-forest-tint"
              >
                Cari lowongan
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/optimize"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Siapkan CV
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-paper px-4 py-6 pb-24 text-center text-xs text-ink-soft sm:px-6 sm:py-8 sm:pb-24 xl:pb-8">
        <p>satsetCV — cari, siapkan, dan pantau lamaran kerja.</p>
        <div className="mt-2 flex justify-center gap-4">
          <Link to="/privacy" className="font-semibold text-forest underline">
            Privasi & penggunaan AI
          </Link>
          <Link to="/faq" className="font-semibold text-forest underline">
            Pusat Bantuan
          </Link>
        </div>
      </footer>
    </div>
  );
}
