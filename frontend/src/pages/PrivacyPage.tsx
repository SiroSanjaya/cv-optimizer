import { Link } from "react-router-dom";
import { Header } from "../components/Header";

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-12 text-ink">
        <Link to="/" className="text-sm font-semibold text-forest underline">
          Kembali ke beranda
        </Link>
        <h1 className="mt-6 font-serif text-3xl font-bold">Privasi & penggunaan AI</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Informasi ini menjelaskan pemrosesan data pada versi aplikasi ini. Perbarui
          keterangan ini sebelum peluncuran publik agar sesuai dengan operator,
          penyedia, lokasi pemrosesan, dan kebijakan retensi yang benar.
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="font-serif text-xl font-bold">Data yang diproses</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            CV (PDF/DOCX atau teks profil) dan deskripsi pekerjaan yang kamu kirim
            diproses untuk mengekstrak informasi, menganalisis kecocokan, dan
            menghasilkan dokumen. Jika menggunakan akun, email dan informasi profil
            Google serta data tracker lamaran juga diproses oleh backend dan database.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-serif text-xl font-bold">Pemrosesan AI</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            Konten CV yang relevan dan deskripsi pekerjaan dikirim ke Google Gemini
            untuk menjalankan fitur AI. Pemrosesan tersebut tunduk pada ketentuan dan
            kebijakan Google yang berlaku. Jangan unggah informasi yang tidak ingin
            diproses oleh layanan AI pihak ketiga.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-serif text-xl font-bold">Latihan wawancara suara</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            Jika kamu memilih mode suara, browser atau perangkat mengenali ucapan
            melalui fitur speech recognition yang tersedia. Pemrosesan audio oleh
            browser dapat mengikuti kebijakan penyedia browser/perangkat. Aplikasi
            menerima dan mengirim transkrip jawaban ke Google Gemini untuk evaluasi;
            aplikasi tidak mengirim rekaman audio mentah ke Gemini. Periksa transkrip
            sebelum mengirim dan hindari menyebut informasi sensitif.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-serif text-xl font-bold">Penyimpanan dan penghapusan</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            File unggahan disimpan sementara di backend dan aplikasi mencoba
            menghapusnya setelah setiap permintaan selesai. Jika proses server
            terhenti sebelum pembersihan, file sementara mungkin tertinggal; operator
            deployment harus mengelola direktori sementara dan backup. CV hasil
            ekstraksi pada alur optimasi tidak disimpan permanen oleh endpoint
            analisis, tetapi akun dan item tracker disimpan di database. Kamu dapat
            menghapus akun dan data terkait melalui Dashboard. Penghapusan ini tidak
            mengatur salinan atau kebijakan retensi Google Gemini.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-serif text-xl font-bold">Batasan hasil</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            Analisis AI dapat keliru dan bukan jaminan lolos ATS, mendapatkan
            wawancara, atau diterima kerja. Periksa dan koreksi setiap hasil sebelum
            digunakan dalam lamaran.
          </p>
        </section>

        <p className="mt-8 border-t border-line pt-4 text-xs leading-relaxed text-ink-soft">
          Catatan untuk operator: lengkapi identitas dan kontak pengelola, dasar
          pemrosesan, lokasi hosting, masa retensi
          log/backup, dan konfigurasi pemrosesan Google sebelum layanan dibuka untuk
          pengguna publik.
        </p>
      </main>
    </div>
  );
}
