import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/Header";
import { deleteProductData } from "../lib/api";

export function PrivacyPage() {
  const [deletionStatus, setDeletionStatus] = useState<string | null>(null);
  const [deletionError, setDeletionError] = useState<string | null>(null);

  const handleDeleteProductData = async () => {
    setDeletionStatus(null);
    setDeletionError(null);
    try {
      await deleteProductData();
      setDeletionStatus("Feedback dan data penggunaan anonim dari perangkat ini sudah dihapus.");
    } catch (error) {
      setDeletionError(
        error instanceof Error ? error.message : "Data belum berhasil dihapus. Silakan coba lagi."
      );
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 text-ink sm:px-6 sm:py-12">
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
            CV (PDF/DOCX atau teks profil), deskripsi pekerjaan, dan informasi yang
            kamu masukkan ke profil karier diproses untuk mengekstrak informasi,
            menganalisis kecocokan, dan menghasilkan dokumen. Jika menggunakan akun,
            profil karier, versi CV terstruktur, lowongan tersimpan, tracker lamaran,
            roadmap pengembangan karier beserta progress milestone, email, dan
            informasi profil Google disimpan oleh backend dan database.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-serif text-xl font-bold">Pemrosesan AI</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            Konten CV yang relevan, deskripsi pekerjaan, dan ringkasan profil untuk
            roadmap karier dikirim ke Google Gemini saat fitur AI digunakan.
            Pemrosesan tersebut tunduk pada ketentuan dan kebijakan Google yang
            berlaku. Jangan unggah informasi yang tidak ingin diproses oleh layanan
            AI pihak ketiga.
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
            deployment harus mengelola direktori sementara dan backup. Untuk akun
            yang masuk, profil karier, versi CV terstruktur hasil analisis atau
            optimasi, roadmap karier, dan progress milestone disimpan di database;
            lowongan tersimpan dan item tracker juga disimpan. Penghapusan akun
            melalui Dashboard menghapus data akun terkait di database. Job AI yang
            sedang mengantre dapat tetap berada di Redis sampai masa retensi job
            berakhir. Penghapusan ini tidak mengatur salinan atau kebijakan retensi
            Google Gemini.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-serif text-xl font-bold">Feedback beta dan analitik</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            Jawaban survei dan saran teks beta disimpan bersama akunmu. Jika kamu
            menyetujui penilaian bonus, saran teks dikirim ke Google Gemini untuk
            memeriksa apakah masukan cukup konkret; jangan sertakan nama, email, CV,
            deskripsi lowongan, atau informasi rahasia. Klaim bonus dicatat terpisah
            di akun agar bonus satu kali tidak dapat diklaim berulang. Menghapus
            feedback perangkat tidak menghapus catatan klaim bonus; menghapus akun
            menghapus keduanya. Aktivitas penggunaan seperti membuka alur optimasi,
            menyelesaikan analisis, mengunduh CV, dan menyimpan tracker hanya dicatat
            jika kamu menyetujuinya di survei. Aktivitas tersebut memakai ID acak
            perangkat dan tidak dihubungkan dengan akun.
          </p>
          <button
            type="button"
            onClick={handleDeleteProductData}
            className="min-h-10 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-paper-raised"
          >
            Hapus feedback dan data penggunaan perangkat ini
          </button>
          {deletionStatus && (
            <p role="status" className="text-sm text-emerald-800">{deletionStatus}</p>
          )}
          {deletionError && (
            <p role="alert" className="text-sm text-red-700">{deletionError}</p>
          )}
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
