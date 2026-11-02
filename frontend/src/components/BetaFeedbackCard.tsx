import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  hasProductAnalyticsConsent,
  submitBetaFeedback,
  type BetaFeedback,
} from "../lib/api";

type FeedbackFields = {
  applicationFrequency: BetaFeedback["applicationFrequency"] | "";
  valueRating: number | "";
  mainValue: BetaFeedback["mainValue"] | "";
  reuseIntent: BetaFeedback["reuseIntent"] | "";
  willingnessToPay: BetaFeedback["willingnessToPay"] | "";
  mainBlocker: BetaFeedback["mainBlocker"] | "";
};

const initialFeedback: FeedbackFields = {
  applicationFrequency: "",
  valueRating: "",
  mainValue: "",
  reuseIntent: "",
  willingnessToPay: "",
  mainBlocker: "",
};

export function BetaFeedbackCard() {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [analyticsConsent, setAnalyticsConsent] = useState(hasProductAnalyticsConsent);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !feedback.applicationFrequency ||
      feedback.valueRating === "" ||
      !feedback.mainValue ||
      !feedback.reuseIntent ||
      !feedback.willingnessToPay ||
      !feedback.mainBlocker
    ) {
      return;
    }

    const answers: BetaFeedback = {
      applicationFrequency: feedback.applicationFrequency,
      valueRating: feedback.valueRating,
      mainValue: feedback.mainValue,
      reuseIntent: feedback.reuseIntent,
      willingnessToPay: feedback.willingnessToPay,
      mainBlocker: feedback.mainBlocker,
    };
    setIsSubmitting(true);
    setError(null);
    try {
      await submitBetaFeedback(answers, analyticsConsent);
      setSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Gagal mengirim feedback."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClassName =
    "mt-1.5 min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15";

  return (
    <section className="rounded-2xl border border-line bg-paper-raised p-4 sm:p-6">
      {submitted ? (
        <div role="status">
          <h2 className="font-semibold text-ink">Makasih, feedback-mu tersimpan.</h2>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            Pilihan harga hanya untuk riset; belum ada transaksi atau langganan.
            Kamu bisa menghapus jawaban dan data penggunaan berbasis ID acak dari{" "}
            <Link to="/privacy" className="font-semibold text-forest underline">
              halaman privasi
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-forest">
              Uji coba beta · opsional
            </p>
            <h2 className="mt-1 font-serif text-xl font-bold text-ink">
              Bantu kami bikin alur lamar kerja lebih berguna
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              Jawab singkat setelah mencoba hasilnya. Jangan kirim nama perusahaan,
              CV, atau informasi pribadi.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-ink">
              Seberapa sering kamu melamar?
              <select
                className={fieldClassName}
                required
                value={feedback.applicationFrequency}
                onChange={(event) =>
                  setFeedback({ ...feedback, applicationFrequency: event.target.value as FeedbackFields["applicationFrequency"] })
                }
              >
                <option value="">Pilih frekuensi</option>
                <option value="three_plus_weekly">3 kali atau lebih per minggu</option>
                <option value="one_to_two_weekly">1–2 kali per minggu</option>
                <option value="monthly">Beberapa kali sebulan</option>
                <option value="exploring">Belum aktif melamar</option>
              </select>
            </label>

            <label className="text-sm font-semibold text-ink">
              Seberapa membantu hasilnya? (1–5)
              <select
                className={fieldClassName}
                required
                value={feedback.valueRating}
                onChange={(event) =>
                  setFeedback({
                    ...feedback,
                    valueRating: event.target.value ? Number(event.target.value) : "",
                  })
                }
              >
                <option value="">Pilih nilai</option>
                <option value="1">1 · Tidak membantu</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5 · Sangat membantu</option>
              </select>
            </label>

            <label className="text-sm font-semibold text-ink">
              Bagian mana yang paling membantu?
              <select
                className={fieldClassName}
                required
                value={feedback.mainValue}
                onChange={(event) =>
                  setFeedback({ ...feedback, mainValue: event.target.value as FeedbackFields["mainValue"] })
                }
              >
                <option value="">Pilih jawaban</option>
                <option value="cv_tailoring">Menyesuaikan isi CV</option>
                <option value="match_analysis">Analisis kecocokan CV</option>
                <option value="cover_letter">Membuat surat lamaran</option>
                <option value="application_tracker">Mencatat progres lamaran</option>
                <option value="job_search">Menemukan lowongan</option>
              </select>
            </label>

            <label className="text-sm font-semibold text-ink">
              Mau pakai lagi untuk lamaran berikutnya?
              <select
                className={fieldClassName}
                required
                value={feedback.reuseIntent}
                onChange={(event) =>
                  setFeedback({ ...feedback, reuseIntent: event.target.value as FeedbackFields["reuseIntent"] })
                }
              >
                <option value="">Pilih jawaban</option>
                <option value="yes">Ya</option>
                <option value="maybe">Mungkin</option>
                <option value="no">Tidak</option>
              </select>
            </label>

            <label className="text-sm font-semibold text-ink">
              Harga bulanan yang terasa layak?
              <select
                className={fieldClassName}
                required
                value={feedback.willingnessToPay}
                onChange={(event) =>
                  setFeedback({ ...feedback, willingnessToPay: event.target.value as FeedbackFields["willingnessToPay"] })
                }
              >
                <option value="">Pilih jawaban</option>
                <option value="free_only">Hanya mau pakai yang gratis</option>
                <option value="under_25k">Di bawah Rp25.000</option>
                <option value="25k_to_50k">Rp25.000–Rp50.000</option>
                <option value="50k_to_100k">Rp50.000–Rp100.000</option>
                <option value="over_100k">Di atas Rp100.000</option>
                <option value="one_time">Lebih suka bayar sekali</option>
                <option value="not_sure">Belum tahu</option>
              </select>
            </label>

            <label className="text-sm font-semibold text-ink sm:col-span-2">
              Hal yang paling menghambat?
              <select
                className={fieldClassName}
                required
                value={feedback.mainBlocker}
                onChange={(event) =>
                  setFeedback({ ...feedback, mainBlocker: event.target.value as FeedbackFields["mainBlocker"] })
                }
              >
                <option value="">Pilih jawaban</option>
                <option value="too_much_effort">Masih terlalu banyak langkah</option>
                <option value="results_not_trustworthy">Hasil belum cukup bisa dipercaya</option>
                <option value="job_sources">Pilihan/sumber lowongan kurang</option>
                <option value="missing_workflow">Fitur penting belum tersedia</option>
                <option value="price">Harga</option>
                <option value="other">Hal lain</option>
              </select>
            </label>

            <label className="flex items-start gap-2 text-sm leading-5 text-ink-soft sm:col-span-2">
              <input
                type="checkbox"
                checked={analyticsConsent}
                onChange={(event) => setAnalyticsConsent(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-forest"
              />
              <span>
                Saya setuju aktivitas penggunaan berikutnya dicatat memakai ID acak
                perangkat ini untuk mengukur penyelesaian dan penggunaan ulang.
                Persetujuan ini opsional dan bisa dicabut di halaman{" "}
                <Link to="/privacy" className="font-semibold text-forest underline">
                  privasi
                </Link>
                .
              </span>
            </label>

            <p className="text-xs leading-5 text-ink-soft sm:col-span-2">
              Feedback tidak menyertakan CV, deskripsi lowongan, nama, atau email.
              Pilihan harga hanya riset, bukan penawaran atau pembayaran.
            </p>

            {error && (
              <p role="alert" className="text-sm font-medium text-red-700 sm:col-span-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-11 rounded-lg bg-forest px-4 py-2 text-sm font-bold text-white transition hover:bg-forest-dark disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
            >
              {isSubmitting ? "Mengirim..." : "Kirim feedback"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
