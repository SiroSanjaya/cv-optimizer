import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  hasProductAnalyticsConsent,
  submitBetaFeedback,
  type BetaFeedback,
} from "../lib/api";
import { useAuth } from "../context/AuthContextValue";

type FeedbackFields = {
  feedbackDetail: string;
  qualityReviewConsent: boolean;
  applicationFrequency: BetaFeedback["applicationFrequency"] | "";
  valueRating: number | "";
  mainValue: BetaFeedback["mainValue"] | "";
  reuseIntent: BetaFeedback["reuseIntent"] | "";
  willingnessToPay: BetaFeedback["willingnessToPay"] | "";
  mainBlocker: BetaFeedback["mainBlocker"] | "";
  baselineMinutesBefore: number | "";
  estimatedApplicationsPerHourBefore: number | "";
};

const initialFeedback: FeedbackFields = {
  feedbackDetail: "",
  qualityReviewConsent: false,
  applicationFrequency: "",
  valueRating: "",
  mainValue: "",
  reuseIntent: "",
  willingnessToPay: "",
  mainBlocker: "",
  baselineMinutesBefore: "",
  estimatedApplicationsPerHourBefore: "",
};

export function BetaFeedbackCard() {
  const { refreshUser } = useAuth();
  const [feedback, setFeedback] = useState(initialFeedback);
  const [analyticsConsent, setAnalyticsConsent] = useState(hasProductAnalyticsConsent);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<Awaited<ReturnType<typeof submitBetaFeedback>> | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      feedback.feedbackDetail.trim().length < 30 ||
      !feedback.qualityReviewConsent ||
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
      feedbackDetail: feedback.feedbackDetail.trim(),
      qualityReviewConsent: true,
      applicationFrequency: feedback.applicationFrequency,
      valueRating: feedback.valueRating,
      mainValue: feedback.mainValue,
      reuseIntent: feedback.reuseIntent,
      willingnessToPay: feedback.willingnessToPay,
      mainBlocker: feedback.mainBlocker,
      ...(feedback.baselineMinutesBefore !== ""
        ? { baselineMinutesBefore: feedback.baselineMinutesBefore }
        : {}),
      ...(feedback.estimatedApplicationsPerHourBefore !== ""
        ? { estimatedApplicationsPerHourBefore: feedback.estimatedApplicationsPerHourBefore }
        : {}),
    };
    setIsSubmitting(true);
    setError(null);
    setSubmissionResult(null);
    try {
      const result = await submitBetaFeedback(answers, analyticsConsent);
      if (feedback.baselineMinutesBefore !== "") {
        localStorage.setItem(
          "cv_optimizer_baseline_minutes_before",
          String(feedback.baselineMinutesBefore)
        );
      }
      setSubmissionResult(result);
      setSubmitted(result.bonusGranted > 0 || result.alreadyRewarded);
      if (result.bonusGranted > 0) await refreshUser();
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
          <h2 className="font-semibold text-ink">
            {submissionResult?.bonusGranted
              ? `Feedback memenuhi syarat—${submissionResult.bonusGranted} kredit bonus ditambahkan!`
              : submissionResult?.alreadyRewarded
                ? "Makasih, feedback tambahanmu tersimpan."
                : "Makasih, feedback-mu tersimpan."}
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            {submissionResult?.tip}{" "}
            {submissionResult?.feedbackEligible && !submissionResult.alreadyRewarded
              ? `Sisa kredit bonus: ${submissionResult.bonusCredits ?? 0}.`
              : submissionResult?.alreadyRewarded
                ? "Bonus 2 kredit hanya diberikan satu kali per akun."
                : "Feedback tetap tersimpan, tetapi belum mendapat bonus. Kamu bisa memperbaiki masukan dan mengirim lagi."}{" "}
            Pilihan harga hanya untuk riset, bukan pembayaran atau langganan.
            Kamu bisa menghapus feedback dan data penggunaan dari{" "}
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
              Ceritakan hal spesifik yang kamu coba, masalah/kebutuhan yang muncul,
              dan perubahan yang kamu harapkan. Feedback konkret yang lolos penilaian
              AI mendapat 2 kredit bonus satu kali per akun.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
            {submissionResult && !submissionResult.feedbackEligible && !submissionResult.alreadyRewarded && (
              <p
                role="status"
                className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2"
              >
                Feedback tersimpan, tetapi belum memenuhi syarat bonus. {submissionResult.tip}
                {" "}Kamu bisa perbaiki masukan lalu kirim lagi.
              </p>
            )}
            <label className="text-sm font-semibold text-ink">
              Tanpa aplikasi ini, berapa menit rata-rata untuk menyiapkan satu lamaran?
              <input
                type="number"
                min={1}
                max={360}
                className={fieldClassName}
                value={feedback.baselineMinutesBefore}
                onChange={(event) =>
                  setFeedback({
                    ...feedback,
                    baselineMinutesBefore: event.target.value ? Number(event.target.value) : "",
                  })
                }
                placeholder="Contoh: 45"
              />
            </label>
            <label className="text-sm font-semibold text-ink">
              Berapa lamaran yang bisa kamu selesaikan per jam sebelum pakai aplikasi?
              <input
                type="number"
                min={0}
                max={60}
                className={fieldClassName}
                value={feedback.estimatedApplicationsPerHourBefore}
                onChange={(event) =>
                  setFeedback({
                    ...feedback,
                    estimatedApplicationsPerHourBefore: event.target.value ? Number(event.target.value) : "",
                  })
                }
                placeholder="Contoh: 2"
              />
            </label>
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

            <label className="text-sm font-semibold text-ink sm:col-span-2">
              Masukan spesifik untuk kami (minimal 30 karakter)
              <textarea
                className={`${fieldClassName} min-h-28`}
                required
                minLength={30}
                maxLength={1200}
                rows={4}
                value={feedback.feedbackDetail}
                onChange={(event) =>
                  setFeedback({ ...feedback, feedbackDetail: event.target.value })
                }
                placeholder="Contoh: Saat mengedit CV hasil optimasi, perubahan bullet tidak ikut tersimpan ketika saya kembali. Saya berharap draft terakhir tetap tersimpan agar tidak perlu mengulang."
              />
              <span className="mt-1 block text-xs font-normal text-ink-soft">
                {feedback.feedbackDetail.trim().length}/1200 karakter. Penilai AI
                akan menolak masukan terlalu umum seperti “CV perlu diperbaiki” dan
                memberi tahu detail yang perlu ditambahkan.
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm leading-5 text-ink-soft sm:col-span-2">
              <input
                type="checkbox"
                required
                checked={feedback.qualityReviewConsent}
                onChange={(event) =>
                  setFeedback({ ...feedback, qualityReviewConsent: event.target.checked })
                }
                className="mt-1 h-4 w-4 shrink-0 accent-forest"
              />
              <span>
                Saya setuju masukan teks ini dikirim ke Google Gemini untuk penilaian
                kualitas dan disimpan bersama akun saya. Saya tidak akan memasukkan
                nama, email, CV, atau informasi rahasia.
              </span>
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
              Bonus hanya bisa diklaim sekali per akun dan tidak dapat diuangkan.
              Pilihan harga hanya untuk riset; belum ada transaksi atau langganan.
            </p>

            {error && (
              <p role="alert" className="text-sm font-medium text-red-700 sm:col-span-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !feedback.qualityReviewConsent || feedback.feedbackDetail.trim().length < 30}
              className="min-h-11 rounded-lg bg-forest px-4 py-2 text-sm font-bold text-white transition hover:bg-forest-dark disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
            >
              {isSubmitting
                ? "Menilai dan mengirim..."
                : submissionResult && !submissionResult.feedbackEligible
                  ? "Kirim ulang feedback setelah diperbaiki"
                  : "Kirim feedback"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
