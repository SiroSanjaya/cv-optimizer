import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/Header";
import {
  ChevronDown,
  Sparkles,
  FileText,
  Brain,
  Download,
  Briefcase,
  Search,
  Mail,
  MessagesSquare,
  Award,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

const faqSections = [
  {
    icon: FileText,
    label: "Upload & Analisis CV",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    iconColor: "text-blue-600",
    items: [
      {
        q: "Format file CV apa saja yang didukung?",
        a: "CV Optimizer mendukung PDF (.pdf) dan Word (.docx / .doc). Ukuran maksimal file adalah 10 MB. Kami menyarankan PDF untuk hasil parsing terbaik.",
      },
      {
        q: "Bagaimana cara menganalisis CV saya?",
        a: "Upload file PDF/Word CV kamu di halaman Optimize, lalu paste deskripsi pekerjaan dari situs manapun (Glints, LinkedIn, Kalibrr, dll). Klik 'Analisa Kecocokan' dan AI kami akan memproses dalam 15–30 detik.",
      },
      {
        q: "Saya tidak punya file CV. Bisa tetap pakai?",
        a: "Tentu! Ada dua opsi: (1) Klik 'Import via Link LinkedIn' dan paste URL profil kamu. (2) Gunakan fitur Demo 1-Click untuk langsung melihat cara kerja AI tanpa upload apapun.",
      },
      {
        q: "Apa itu fitur 'Klaim Skill'?",
        a: "Setelah analisis, AI mungkin tidak menemukan skill tertentu di CV kamu meski kamu sebenarnya menguasainya. Cukup klik pill skill berwarna merah/kuning di halaman hasil — skill tersebut langsung ditambahkan ke draft CV dan skor naik otomatis secara real-time!",
      },
    ] as FaqItem[],
  },
  {
    icon: Brain,
    label: "Skor & Probabilitas",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    iconColor: "text-emerald-600",
    items: [
      {
        q: "Apa itu Job Match Score?",
        a: "Job Match Score adalah estimasi kecocokan CV kamu dengan job description yang kamu masukkan, dihitung berdasarkan: kecocokan skill teknis, pengalaman relevan, dan kata kunci industri. Skor ≥75% artinya peluang lolos ATS sangat tinggi.",
      },
      {
        q: "Kenapa skor saya rendah padahal saya berpengalaman?",
        a: "CV yang bagus secara konten belum tentu ATS-friendly. Kemungkinan penyebabnya: (1) Keyword di CV tidak cocok dengan yang ada di job description. (2) Format CV menggunakan tabel/kolom yang sulit dibaca parser ATS. (3) Ada skill yang relevan tapi belum ditulis di CV. Gunakan fitur Generate CV Tailored untuk memperbaiki semua ini.",
      },
      {
        q: "Apakah skor ini sama dengan ATS internal perusahaan?",
        a: "Tidak. Setiap perusahaan menggunakan sistem ATS berbeda (Workday, Greenhouse, dll) dengan algoritma sendiri. Skor kami adalah estimasi berbasis AI yang memberi gambaran seberapa relevan CV kamu — bukan jaminan pasti lolos/tidak.",
      },
      {
        q: "Bagaimana cara menaikkan skor saya?",
        a: "Tiga cara cepat: (1) Klik skill yang kamu kuasai tapi belum ada di CV (Skill Parsial/Belum Ditemukan). (2) Klik 'Generate CV Tailored' agar AI otomatis menyesuaikan semua keyword. (3) Pastikan job description yang kamu masukkan adalah versi lengkap dari perusahaan target.",
      },
    ] as FaqItem[],
  },
  {
    icon: Download,
    label: "Generate & Download CV",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    iconColor: "text-purple-600",
    items: [
      {
        q: "Apa bedanya CV Original dan CV Tailored?",
        a: "CV Original adalah hasil parsing dari file kamu yang sudah distrukturkan. CV Tailored adalah versi yang sudah dioptimasi AI: keyword disesuaikan dengan job description, urutan pengalaman diubah untuk menonjolkan yang paling relevan, dan phrasing diperbaiki dengan action verbs standar ATS.",
      },
      {
        q: "Apakah data di CV saya bisa berubah saat di-generate?",
        a: "Tidak pernah. AI kami hanya mengubah cara penyajian (bahasa, urutan, keyword) — bukan isi faktual. Nama perusahaan, tanggal, jabatan, dan pencapaian kamu 100% terjaga. Kami memiliki sistem anti-halusinasi yang ketat.",
      },
      {
        q: "Bagaimana cara download CV yang sudah di-generate?",
        a: "Di halaman hasil CV Tailored, scroll ke bawah preview CV dan cari tombol Download PDF atau Download Word (.docx). File siap pakai tanpa watermark.",
      },
    ] as FaqItem[],
  },
  {
    icon: Mail,
    label: "Surat Lamaran & Interview",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    iconColor: "text-rose-600",
    items: [
      {
        q: "Bagaimana cara membuat surat lamaran (cover letter) dengan AI?",
        a: "Setelah analisis selesai, klik tombol 'Buat Surat Lamaran AI' atau buka tab 'Surat Lamaran AI' di halaman CV Tailored. Pilih bahasa (Indonesia/Inggris) dan tone (Professional/Modern), lalu klik Generate.",
      },
      {
        q: "Apa itu Interview Prep Cheat Sheet?",
        a: "Setelah analisis CV, AI otomatis memprediksi pertanyaan interview yang kemungkinan besar akan ditanyakan recruiter — berdasarkan gap antara profilmu dan ekspektasi job description. Setiap pertanyaan dilengkapi panduan jawaban dengan metode STAR (Situation, Task, Action, Result).",
      },
      {
        q: "Bisakah saya menyimpan surat lamaran yang dibuat?",
        a: "Ya! Di bagian hasil surat lamaran, ada tombol Copy ke Clipboard dan Download sebagai TXT. Kamu juga bisa langsung edit teks sebelum menyalinnya.",
      },
    ] as FaqItem[],
  },
  {
    icon: Briefcase,
    label: "Tracker Lamaran",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    iconColor: "text-amber-600",
    items: [
      {
        q: "Apa itu Tracker Lamaran?",
        a: "Tracker Lamaran adalah kanban board untuk memantau semua lamaran kerjamu dalam satu tempat. Kamu bisa melacak status: Applied → HR Interview → User Interview → Technical Test → Offer. Lengkap dengan tanggal, catatan, dan skor kecocokan masing-masing lamaran.",
      },
      {
        q: "Bagaimana cara menambah lamaran ke tracker?",
        a: "Ada dua cara: (1) Otomatis — klik 'Simpan ke Tracker Lamaran' setelah analisis CV selesai. (2) Manual — buka halaman Tracker dan klik 'Tambah Lamaran Baru', isi form dengan detail perusahaan dan posisi.",
      },
      {
        q: "Apakah data tracker tersimpan permanen?",
        a: "Ya, data tersimpan di server dan bisa diakses kapanpun kamu login. Jika belum login, data disimpan sementara di browser lokal.",
      },
    ] as FaqItem[],
  },
  {
    icon: Search,
    label: "Rekomendasi Lowongan",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    iconColor: "text-cyan-600",
    items: [
      {
        q: "Bagaimana cara kerja rekomendasi lowongan?",
        a: "AI kami menganalisis skill dari CV yang sudah kamu upload/import, lalu mencari lowongan yang paling relevan dari berbagai platform (Indeed, Glints, Kalibrr, dan curated list). Setiap lowongan dilengkapi Match Score dan estimasi Hire Probability.",
      },
      {
        q: "Bisakah saya langsung apply dari sini?",
        a: "Klik 'Buka Lowongan' pada kartu lowongan — kamu akan diarahkan langsung ke halaman lamaran di platform asal (Indeed, LinkedIn, dll). Sebelum apply, kamu juga bisa klik 'Optimasi CV untuk Ini' untuk langsung mengisi job description ke halaman Optimize.",
      },
    ] as FaqItem[],
  },
  {
    icon: Award,
    label: "Viral Score Card & Share",
    color: "bg-orange-50 text-orange-700 border-orange-200",
    iconColor: "text-orange-600",
    items: [
      {
        q: "Apa itu Kartu Skor LinkedIn?",
        a: "Fitur 'Pamerkan Skor LinkedIn' membuat kartu visual berdesain premium (resolusi 1200×630 piksel) yang menampilkan nama, posisi, Job Match Score, dan skill terbaikmu. Cocok untuk dibagikan ke LinkedIn, Instagram, atau WhatsApp sebagai bukti kesiapanmu melamar.",
      },
      {
        q: "Bagaimana cara share scorecard?",
        a: "Klik tombol 'Pamerkan Skor LinkedIn 🚀' di halaman hasil. Kamu bisa download PNG resolusi tinggi, atau langsung share via link. Tambahkan hashtag #CVOptimizer agar lebih mudah ditemukan!",
      },
    ] as FaqItem[],
  },
  {
    icon: AlertCircle,
    label: "Quota & Akun",
    color: "bg-gray-50 text-gray-700 border-gray-200",
    iconColor: "text-gray-600",
    items: [
      {
        q: "Berapa batas penggunaan gratis per hari?",
        a: "Saat ini dalam masa beta, kamu mendapat 5 analisis CV gratis per hari. Batas ini direset otomatis setiap tengah malam WIB. Fitur generate CV Tailored, Cover Letter, dan Interview Prep tidak mengurangi kuota analisis.",
      },
      {
        q: "Apakah perlu akun/login untuk menggunakan?",
        a: "Tidak! Kamu bisa langsung pakai tanpa login. Login dengan Google hanya diperlukan untuk: (1) Menyimpan riwayat analisis di Dashboard. (2) Menggunakan Tracker Lamaran secara persisten. (3) Mendapat kredit tambahan.",
      },
      {
        q: "Data CV saya apakah aman?",
        a: "Sangat aman. File yang kamu upload diproses di server dan langsung dihapus setelah analisis selesai — tidak disimpan permanen. Kami tidak pernah menjual atau membagikan data CV ke pihak ketiga. Komunikasi menggunakan HTTPS terenkripsi.",
      },
    ] as FaqItem[],
  },
];

const quickSteps = [
  {
    icon: "📤",
    title: "Upload atau Import CV",
    desc: "PDF, Word, atau paste link LinkedIn",
    cta: "Mulai di sini",
    link: "/optimize",
  },
  {
    icon: "📋",
    title: "Paste Job Description",
    desc: "Dari Glints, LinkedIn, Kalibrr, atau mana saja",
    cta: null,
    link: null,
  },
  {
    icon: "🎯",
    title: "Lihat Skor & Gap Skill",
    desc: "Klaim skill yang kamu kuasai tapi belum tertulis",
    cta: null,
    link: null,
  },
  {
    icon: "✨",
    title: "Generate & Download",
    desc: "CV Tailored ATS + Cover Letter siap pakai",
    cta: null,
    link: null,
  },
];

function AccordionItem({ item, index }: { item: FaqItem; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border border-line rounded-xl overflow-hidden transition-all ${open ? "shadow-sm" : ""}`}>
      <button
        type="button"
        id={`faq-q-${index}`}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left hover:bg-paper-raised/70 transition-colors"
        aria-expanded={open}
      >
        <span className="font-semibold text-sm text-ink leading-snug">{item.q}</span>
        <ChevronDown
          className={`h-4 w-4 text-ink-soft shrink-0 mt-0.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-0 text-sm text-ink-soft leading-relaxed border-t border-line/50 bg-paper-raised/30">
          <p className="mt-3">{item.a}</p>
        </div>
      )}
    </div>
  );
}

export function FaqPage() {
  const [activeSection, setActiveSection] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-line bg-gradient-to-br from-forest-tint/60 via-paper to-paper py-16 sm:py-20">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-forest/5 blur-3xl translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-emerald-400/5 blur-2xl -translate-x-1/3 translate-y-1/3" />
          </div>
          <div className="relative mx-auto max-w-3xl px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-forest/30 bg-forest-tint px-4 py-1.5 text-xs font-bold text-forest uppercase tracking-wider">
              <MessagesSquare className="h-3.5 w-3.5" />
              Pusat Bantuan & FAQ
            </div>
            <h1 className="mt-5 font-serif text-4xl font-bold text-ink sm:text-5xl leading-tight">
              Ada Pertanyaan?<br />
              <span className="text-forest">Kami Jawab Semua.</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-ink-soft leading-relaxed max-w-xl mx-auto">
              Panduan lengkap menggunakan CV Optimizer — dari upload CV hingga share scorecard viral ke LinkedIn.
            </p>
          </div>
        </section>

        {/* Quick Start Guide */}
        <section className="py-12 sm:py-16 border-b border-line bg-paper-raised/40">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-forest">Mulai dalam 2 menit</span>
              <h2 className="mt-2 font-serif text-2xl font-bold text-ink">Cara Cepat Pakai CV Optimizer</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 relative">
              {quickSteps.map((step, i) => (
                <div key={i} className="relative">
                  {i < quickSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 right-0 translate-x-1/2 z-10">
                      <ArrowRight className="h-4 w-4 text-forest/40" />
                    </div>
                  )}
                  <div className="rounded-xl border border-line bg-paper p-5 shadow-xs hover:border-forest/40 hover:shadow-sm transition-all h-full flex flex-col">
                    <div className="text-3xl mb-3">{step.icon}</div>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-forest text-white text-[10px] font-bold mb-2">
                      {i + 1}
                    </span>
                    <h3 className="font-bold text-sm text-ink">{step.title}</h3>
                    <p className="mt-1 text-xs text-ink-soft flex-1">{step.desc}</p>
                    {step.cta && step.link && (
                      <Link
                        to={step.link}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-forest hover:text-forest-dark transition-colors"
                      >
                        {step.cta} →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link
                to="/optimize"
                className="inline-flex items-center gap-2 rounded-xl bg-forest px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-forest-dark transition-all hover:scale-105 active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                Coba Langsung Sekarang (Gratis)
              </Link>
              <p className="mt-2 text-[11px] text-ink-soft">Tidak perlu daftar • 5 analisis/hari gratis</p>
            </div>
          </div>
        </section>

        {/* FAQ Sections */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-forest">FAQ</span>
              <h2 className="mt-2 font-serif text-2xl font-bold text-ink">Pertanyaan yang Sering Ditanyakan</h2>
              <p className="mt-2 text-sm text-ink-soft">Klik kategori untuk langsung melompat ke topik yang relevan.</p>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2 justify-center mb-10">
              <button
                type="button"
                onClick={() => setActiveSection(null)}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeSection === null
                    ? "border-forest bg-forest text-white shadow-sm"
                    : "border-line text-ink-soft hover:border-forest/50 hover:text-ink"
                }`}
              >
                Semua Topik
              </button>
              {faqSections.map((sec, i) => {
                const Icon = sec.icon;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveSection(activeSection === i ? null : i)}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      activeSection === i
                        ? "border-forest bg-forest text-white shadow-sm"
                        : "border-line text-ink-soft hover:border-forest/50 hover:text-ink"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {sec.label}
                  </button>
                );
              })}
            </div>

            {/* FAQ Accordion */}
            <div className="space-y-10">
              {faqSections
                .filter((_, i) => activeSection === null || activeSection === i)
                .map((section, si) => {
                  const Icon = section.icon;
                  const realIdx = activeSection !== null ? activeSection : si;
                  return (
                    <div key={realIdx}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold ${section.color}`}>
                          <Icon className={`h-4 w-4 ${section.iconColor}`} />
                          {section.label}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {section.items.map((item, qi) => (
                          <AccordionItem
                            key={qi}
                            item={item}
                            index={realIdx * 100 + qi}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </section>

        {/* Still have questions CTA */}
        <section className="border-t border-line bg-gradient-to-b from-paper-raised/60 to-paper py-14 sm:py-16">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-tint text-forest text-2xl mb-4">
              💬
            </div>
            <h2 className="font-serif text-2xl font-bold text-ink">Masih Ada Pertanyaan?</h2>
            <p className="mt-3 text-sm text-ink-soft leading-relaxed">
              Belum menemukan jawaban yang kamu cari? Langsung coba fiturnya — atau hubungi kami lewat tombol di bawah.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/optimize"
                className="inline-flex items-center gap-2 rounded-xl bg-forest px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-forest-dark transition-all"
              >
                <Sparkles className="h-4 w-4" />
                Coba Langsung Sekarang
              </Link>
              <a
                href="mailto:hello@cvoptimizer.id"
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-paper px-6 py-3 text-sm font-semibold text-ink hover:border-forest hover:text-forest transition-all"
              >
                <Mail className="h-4 w-4" />
                Hubungi Kami
              </a>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-ink-soft/80">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-forest" /> Gratis selama masa beta
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-forest" /> Tanpa kartu kredit
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-forest" /> Data CV tidak disimpan
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8 text-center text-xs text-ink-soft bg-paper">
        CV Optimizer — Dibuat untuk para pencari kerja di Indonesia dan global.{" "}
        <Link to="/" className="font-semibold text-forest hover:underline">
          Kembali ke Beranda
        </Link>
      </footer>
    </div>
  );
}
