import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
  FileCheck2,
  FileText,
  Search,
  Send,
} from "lucide-react";
import { Header } from "../components/Header";
import { HeroDocument } from "../components/HeroDocument";
import { trackProductEvent } from "../lib/api";

const trustPoints = [
  { icon: CheckCircle2, label: "Isi CV tetap berdasarkan pengalamanmu" },
  { icon: ShieldCheck, label: "Kamu yang cek dan kirim lamaran" },
];

const workspaces = [
  {
    number: "01",
    icon: Search,
    title: "Cari posisi",
    description:
      "Mulai dari posisi yang kamu incar atau jelajahi lowongan yang tersedia.",
    href: "/jobs",
    action: "Buka lowongan",
  },
  {
    number: "02",
    icon: FileCheck2,
    title: "Siapkan lamaran",
    description:
      "Sesuaikan CV dan buat surat lamaran. Periksa dulu sebelum dipakai.",
    href: "/optimize",
    action: "Mulai dari CV",
  },
  {
    number: "03",
    icon: CalendarCheck2,
    title: "Ingat tindak lanjut",
    description:
      "Simpan lamaran dan catat tahap berikutnya supaya nggak kelewat.",
    href: "/tracker",
    action: "Buka tracker",
  },
];

const steps = [
  {
    title: "Tentukan posisi",
    body: "Pilih lowongan atau tempel deskripsi posisi yang kamu incar.",
  },
  {
    title: "Cek pengalamanmu",
    body: "Lihat bagian CV yang mendukung posisi dan hal yang perlu dilengkapi.",
  },
  {
    title: "Edit sebelum kirim",
    body: "Tinjau CV dan surat lamaran. Tidak ada yang dikirim otomatis.",
  },
  {
    title: "Catat progres",
    body: "Simpan posisi di tracker dan atur tindak lanjutmu sendiri.",
  },
];

export function LandingPage() {
  useEffect(() => {
    void trackProductEvent("landing_viewed");
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#101638] via-[#17204b] to-[#0d253d]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-40 h-[30rem] w-[30rem] rounded-full border border-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-[22rem] w-[22rem] rounded-full border border-white/10" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-7 px-4 py-8 sm:gap-10 sm:px-8 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-12 lg:py-20">
            <div className="min-w-0">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-semibold leading-4 text-white/90 backdrop-blur sm:text-xs">
                <BriefcaseBusiness className="h-3.5 w-3.5" />
                <span>Untuk profesional yang aktif melamar</span>
              </div>

              <h1 className="mt-4 max-w-2xl font-sans text-[1.9rem] font-extrabold leading-[1.08] tracking-tight text-white sm:mt-6 sm:text-5xl lg:text-6xl">
                Cari kerja nggak perlu berantakan.
              </h1>

              <p className="mt-3 max-w-xl text-[13px] leading-6 text-white/75 sm:mt-5 sm:text-base sm:leading-7">
                Mulai dari lowongan yang kamu incar, cek kecocokan CV, siapkan
                dokumen lamaran, lalu catat progresnya. Kamu tetap meninjau dan
                mengirim sendiri.
              </p>

              <div className="mt-5 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:items-center">
                <Link
                  to="/optimize"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white bg-white px-5 py-3 text-sm font-bold text-[#17204b] shadow-lg transition hover:bg-[#eaf9fd] sm:w-auto"
                >
                  <FileText className="h-4 w-4 shrink-0" />
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
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#55d8ef]" />
                    <span className="text-[10px] font-medium leading-4 text-white/80 sm:text-xs">{label}</span>
                  </div>
                ))}
              </dl>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:hidden" aria-label="Alur singkat produk">
              {[
                { label: "Cari posisi", icon: Search },
                { label: "Sesuaikan CV", icon: FileText },
                { label: "Pantau proses", icon: CheckCircle2 },
              ].map(({ label, icon: Icon }, index) => (
                <div
                  key={label}
                  className="flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-2 py-3 text-center backdrop-blur"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[#55d8ef]">
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

        <section className="bg-[#f3f6fb] py-12 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-14">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#118dbb]">
                Bukan cuma file CV
              </p>
              <h2 className="mt-3 max-w-md font-sans text-3xl font-extrabold leading-tight tracking-tight text-[#17204b] sm:text-4xl">
                Satu posisi. Semua persiapannya kelihatan.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-[#56617a]">
                Biar kamu tahu posisi mana yang lagi dikejar, materi apa yang
                sudah siap, dan apa langkah berikutnya.
              </p>
              <Link
                to="/tracker"
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#17204b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#26356c]"
              >
                Lihat ruang lamaran
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#dce3ee] bg-white shadow-[0_24px_70px_-35px_rgba(23,32,75,0.35)]">
              <div className="flex items-center justify-between border-b border-[#e8edf4] px-4 py-3.5 sm:px-6">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/icons.png"
                    alt=""
                    className="h-6 w-7 object-cover object-top"
                  />
                  <span className="text-sm font-bold text-[#17204b]">Ruang lamaran</span>
                </div>
                <span className="rounded-full bg-[#edfaff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#138cb7]">
                  Contoh tampilan
                </span>
              </div>

              <div className="grid gap-0 sm:grid-cols-[1.05fr_0.95fr]">
                <div className="p-4 sm:border-r sm:border-[#e8edf4] sm:p-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8791a5]">
                    Posisi yang dituju
                  </p>
                  <h3 className="mt-2 text-xl font-bold tracking-tight text-[#17204b]">
                    Lowongan pilihanmu
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[#66718a]">
                    <BriefcaseBusiness className="h-3.5 w-3.5" />
                    Posisi dan detail dari lowongan yang kamu pilih
                  </p>

                  <div className="mt-5 rounded-xl bg-[#f5f8fc] p-3.5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e6f9fd] text-[#078dbb]">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-[#17204b]">CV untuk posisi ini</p>
                        <p className="mt-1 text-[11px] leading-4 text-[#66718a]">
                          Tinjau pengalaman yang relevan sebelum dipakai.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {["Pengalaman", "Skill", "Pencapaian"].map((item) => (
                        <span
                          key={item}
                          className="rounded-md border border-[#dce5ef] bg-white px-2 py-1 text-[10px] font-medium text-[#526078]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#e8edf4] bg-[#fbfcfe] p-4 sm:border-t-0 sm:p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8791a5]">
                      Sebelum melamar
                    </p>
                    <ClipboardCheck className="h-4 w-4 text-[#138cb7]" />
                  </div>
                  <ol className="mt-4 space-y-4">
                    {[
                      { icon: Search, title: "Pahami kebutuhan posisi", done: true },
                      { icon: FileCheck2, title: "Periksa CV dan surat", done: true },
                      { icon: Send, title: "Kirim sendiri saat siap", done: false },
                    ].map(({ icon: Icon, title, done }, index) => (
                      <li key={title} className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            done
                              ? "bg-[#e6f9fd] text-[#078dbb]"
                              : "border border-dashed border-[#b8c2d2] text-[#8490a5]"
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <span className="text-[10px] font-bold">{index + 1}</span>
                          )}
                        </span>
                        <div className="flex min-w-0 items-center gap-2">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-[#738099]" />
                          <span className="text-xs font-semibold text-[#303c57]">{title}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-5 border-t border-[#e8edf4] pt-3 text-[10px] leading-4 text-[#79849a]">
                    Kamu yang mengoreksi dan mengirim lamaran. Tidak ada
                    pengiriman otomatis.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-12 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col justify-between gap-4 border-b border-[#e6eaf0] pb-6 sm:flex-row sm:items-end">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#118dbb]">
                  Pakai yang kamu perlukan
                </p>
                <h2 className="mt-2 max-w-xl font-sans text-2xl font-extrabold tracking-tight text-[#17204b] sm:text-3xl">
                  Nggak harus melakukan semuanya sekaligus.
                </h2>
              </div>
              <p className="max-w-sm text-xs leading-5 text-[#66718a] sm:text-sm">
                Mulai dari langkah yang paling kamu butuhkan hari ini.
              </p>
            </div>

            <div className="divide-y divide-[#e6eaf0]">
              {workspaces.map(({ number, icon: Icon, title, description, href, action }) => (
                <Link
                  key={number}
                  to={href}
                  className="group grid gap-3 py-5 transition-colors hover:bg-[#f8fbff] sm:grid-cols-[64px_1fr_auto] sm:items-center sm:gap-5 sm:px-3"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edfaff] text-[#078dbb]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-base font-bold text-[#17204b]">{title}</span>
                    <span className="mt-1 block max-w-2xl text-xs leading-5 text-[#66718a] sm:text-sm">
                      {description}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#078dbb] sm:justify-self-end">
                    {action}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-[#f3f6fb] py-12 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#118dbb]">
                Cara kerjanya
              </p>
              <h2 className="mt-2 font-sans text-2xl font-extrabold leading-tight tracking-tight text-[#17204b] sm:text-3xl">
                Dari lowongan yang menarik sampai lamaran terkirim.
              </h2>
            </div>

            <ol className="mt-8 grid gap-6 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {steps.map((step, index) => (
                <li key={step.title} className="relative border-l-2 border-[#b7eaf4] pl-4 sm:border-l-0 sm:pl-0">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#17204b] text-xs font-bold text-white shadow-[0_0_0_5px_#e2f8fc] sm:h-10 sm:w-10">
                    0{index + 1}
                  </span>
                  <h3 className="mt-3 text-sm font-bold text-[#17204b]">{step.title}</h3>
                  <p className="mt-1.5 max-w-xs text-xs leading-5 text-[#66718a] sm:text-sm">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-white px-4 py-10 sm:px-6 sm:py-16 lg:py-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 overflow-hidden rounded-3xl bg-[#17204b] px-5 py-8 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2">
                <img
                  src="/icons.png"
                  alt=""
                  className="h-7 w-8 object-cover object-top"
                />
                <span className="text-sm font-extrabold tracking-tight">
                  satset<span className="text-[#55d8ef]">CV</span>
                </span>
              </div>
              <h2 className="mt-4 font-sans text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
                Sudah nemu lowongan?
                <br className="hidden sm:block" /> Siapkan lamarannya di sini.
              </h2>
              <p className="mt-2 max-w-lg text-xs leading-5 text-white/70 sm:text-sm">
                Cek lowongan atau langsung sesuaikan CV. Kamu tetap punya
                keputusan terakhir sebelum mengirim.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:min-w-48">
              <Link
                to="/optimize"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#55d8ef] px-5 py-2.5 text-sm font-bold text-[#101638] transition hover:bg-[#a2effa]"
              >
                Mulai dari CV
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/jobs"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Cari lowongan
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-paper px-4 py-6 pb-24 text-center text-xs text-ink-soft sm:px-6 sm:py-8 sm:pb-24 xl:pb-8">
        <p>satsetCV — cari, siapkan, dan pantau lamaran kerja.</p>
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
