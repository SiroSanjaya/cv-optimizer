import { Link } from "react-router-dom";
import { Header } from "../components/Header";

export function TermsPage() {
  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 text-ink sm:px-6 sm:py-12">
        <Link to="/" className="text-sm font-semibold text-forest underline">
          Kembali ke beranda
        </Link>
        <h1 className="mt-6 font-serif text-3xl font-bold">Syarat penggunaan</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Dengan memakai satsetCV, kamu memahami bahwa alat ini membantu menyiapkan
          dokumen dan melacak lamaran, bukan menjamin hasil rekrutmen.
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="font-serif text-xl font-bold">Penggunaan yang diperbolehkan</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            Gunakan hanya untuk CV, profil, dan lowongan milikmu atau yang kamu
            berwenang mengelolanya. Jangan memasukkan informasi rahasia, dokumen
            milik orang lain tanpa izin, atau mencoba mengakses akun pengguna lain.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-serif text-xl font-bold">Batasan hasil AI</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            Skor kecocokan adalah estimasi berbasis bukti yang tercantum pada dokumen.
            Tujuh perspektif adalah simulasi review AI dan bukan keputusan perusahaan,
            penilaian ATS, prediksi wawancara, atau jaminan diterima kerja. Kamu wajib
            memeriksa dan mengoreksi setiap hasil sebelum digunakan.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-serif text-xl font-bold">Akun, kuota, dan pembayaran</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            Kuota bulanan dan bonus ditampilkan sebelum fitur AI dijalankan. Kredit
            adalah hak penggunaan aplikasi, bukan mata uang atau saldo yang dapat
            diuangkan. Jika aplikasi kemudian menawarkan langganan berbayar, harga,
            siklus tagihan, pembatalan, dan masa berlaku akan ditampilkan sebelum
            pembayaran disetujui.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-serif text-xl font-bold">Tanggung jawab pengguna</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            Kamu bertanggung jawab atas kebenaran CV, lamaran, dokumen pendukung,
            serta keputusan mengirim atau membatalkan lamaran. Jangan mengirim data
            sensitif ke prompt AI dan periksa tautan eksternal sebelum membukanya.
          </p>
        </section>

        <div className="mt-8 border-t border-line pt-5 text-sm">
          <Link to="/privacy" className="font-semibold text-forest underline">
            Baca privasi & penggunaan AI
          </Link>
        </div>
      </main>
    </div>
  );
}
