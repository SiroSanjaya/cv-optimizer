import { useCallback, useEffect, useState } from "react";
import { Header } from "../components/Header";
import { fetchAdminDashboard, type AdminDashboardData } from "../lib/api";
import {
  Activity,
  AlertTriangle,
  Coins,
  RefreshCw,
  Users,
  Zap,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const taskLabels: Record<string, string> = {
  "cv.analyze": "Analisis CV",
  "cv.generate": "CV tailored",
  "cv.cover-letter": "Cover letter",
  "cv.interview-prep": "Persiapan interview",
  "cv.interview-start": "Mulai interview",
  "cv.interview-evaluate": "Evaluasi interview",
  "career-development.plan": "Rencana karier",
  "profile.import": "Impor profil",
  "jobs.bulk-screen": "Screening CV",
  "feedback.quality": "Penilaian feedback",
  unattributed: "Belum teratribusi",
};

const eventLabels: Record<string, string> = {
  landing_viewed: "Landing page dibuka",
  optimize_opened: "Optimasi dibuka",
  analysis_completed: "Analisis selesai",
  optimization_completed: "CV tailored selesai",
  cv_exported: "CV diekspor",
  tracker_saved: "Tracker disimpan",
  optimization_restarted: "Optimasi diulang",
  beta_feedback: "Feedback beta",
  workflow_started: "Workflow dimulai",
  analysis_actionable: "Skor actionable tercapai",
  ai_output_accepted: "Hasil AI diekspor",
  application_submitted: "Lamaran dikirim",
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(value);
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <article className="rounded-xl border border-line bg-paper-raised p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
          <p className="mt-2 font-serif text-2xl font-bold text-ink">{value}</p>
        </div>
        <span className="rounded-lg bg-forest-tint p-2 text-forest">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-xs text-ink-soft">{detail}</p>
    </article>
  );
}

export function AdminDashboardPage() {
  const [period, setPeriod] = useState(30);
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDashboard(await fetchAdminDashboard(period));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Dashboard admin tidak dapat dimuat."
      );
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">
              Khusus admin
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold text-ink">
              Operasional SatsetCV
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
              Biaya AI adalah estimasi berdasarkan tarif server, bukan tagihan resmi
              Google. Pengukuran token baru tersedia sejak logging ini dideploy.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="admin-period" className="text-sm font-medium text-ink-soft">
              Periode
            </label>
            <select
              id="admin-period"
              value={period}
              onChange={(event) => setPeriod(Number(event.target.value))}
              className="min-h-10 rounded-lg border border-line bg-white px-3 text-sm text-ink"
            >
              <option value={7}>7 hari</option>
              <option value={30}>30 hari</option>
              <option value={90}>90 hari</option>
            </select>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={loading}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink hover:border-forest disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-rust/30 bg-rust-tint p-4 text-sm text-rust">
            <p className="font-semibold">{error}</p>
            <p className="mt-1">
              Pastikan kamu login dengan email yang tercantum di secret server{" "}
              <code>ADMIN_EMAILS</code>.
            </p>
            <button type="button" className="mt-2 font-semibold underline" onClick={() => void loadDashboard()}>
              Coba lagi
            </button>
          </div>
        )}

        {loading && !dashboard ? (
          <div className="py-20 text-center text-sm text-ink-soft" role="status">
            Memuat metrik operasional...
          </div>
        ) : dashboard ? (
          <>
            {!dashboard.ratesConfigured && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Tarif model belum dikonfigurasi</p>
                  <p className="mt-1 leading-5">
                    Token tetap tercatat, tetapi estimasi biaya akan nol sampai kamu
                    mengisi <code>AI_COST_INPUT_USD_PER_MILLION</code> dan{" "}
                    <code>AI_COST_OUTPUT_USD_PER_MILLION</code> dari harga model yang
                    aktif di Google AI Studio. Angka lama tidak bisa dibuat ulang.
                  </p>
                </div>
              </div>
            )}

            <section aria-label="Ringkasan AI" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Estimasi biaya AI"
                value={formatUsd(dashboard.ai.estimatedCostUsd)}
                detail={`${dashboard.periodDays} hari · tidak termasuk biaya di luar tarif token`}
                icon={Coins}
              />
              <MetricCard
                label="Panggilan model"
                value={formatNumber(dashboard.ai.requestCount)}
                detail={`${formatNumber(dashboard.ai.failedCount)} gagal · error ${dashboard.ai.failureRate}%`}
                icon={Zap}
              />
              <MetricCard
                label="Total token"
                value={formatNumber(dashboard.ai.totalTokens)}
                detail={`${formatNumber(dashboard.ai.promptTokens)} input · ${formatNumber(dashboard.ai.completionTokens)} output`}
                icon={Activity}
              />
              <MetricCard
                label="Pengguna"
                value={formatNumber(dashboard.totalUsers)}
                detail={`${formatNumber(dashboard.ai.usersWithAiUsage)} memakai AI dalam periode ini`}
                icon={Users}
              />
            </section>

            <section aria-label="Efektivitas beta" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Median waktu analisis"
                value={dashboard.betaEffectiveness.medianMinutes.analysis === null
                  ? "Belum ada data"
                  : `${dashboard.betaEffectiveness.medianMinutes.analysis} m`}
                detail={`${dashboard.betaEffectiveness.sampleSize.completedAnalyses} analisis selesai`}
                icon={Activity}
              />
              <MetricCard
                label="Median skor actionable"
                value={dashboard.betaEffectiveness.medianMinutes.actionableScore === null
                  ? "Belum ada data"
                  : `${dashboard.betaEffectiveness.medianMinutes.actionableScore} m`}
                detail={`${dashboard.betaEffectiveness.sampleSize.completedWorkflows} workflow selesai`}
                icon={Zap}
              />
              <MetricCard
                label="Hasil AI dapat dipakai"
                value={dashboard.betaEffectiveness.aiOutputUsabilityRate === null
                  ? "Belum ada data"
                  : `${dashboard.betaEffectiveness.aiOutputUsabilityRate}%`}
                detail={`${dashboard.betaEffectiveness.sampleSize.acceptedOutputs} dari ${dashboard.betaEffectiveness.sampleSize.exportedSessions} sesi ekspor`}
                icon={Users}
              />
              <MetricCard
                label="Interview dari lamaran"
                value={dashboard.betaEffectiveness.applicationOutcomes.interviewRate === null
                  ? "Belum ada data"
                  : `${dashboard.betaEffectiveness.applicationOutcomes.interviewRate}%`}
                detail={`${dashboard.betaEffectiveness.applicationOutcomes.interviewReached} interview · ${dashboard.betaEffectiveness.applicationOutcomes.totalSubmitted} lamaran`}
                icon={Coins}
              />
              <MetricCard
                label="Baseline sebelum aplikasi"
                value={dashboard.betaEffectiveness.baseline.medianMinutesBefore === null
                  ? "Belum ada data"
                  : `${dashboard.betaEffectiveness.baseline.medianMinutesBefore} m/lamaran`}
                detail={`${dashboard.betaEffectiveness.baseline.medianApplicationsPerHourBefore ?? "-"} lamaran/jam median · ${dashboard.betaEffectiveness.baseline.baselineResponses} respons`}
                icon={Users}
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <article className="rounded-xl border border-line bg-paper-raised p-4 shadow-sm lg:col-span-2">
                <h2 className="font-serif text-lg font-bold text-ink">Penggunaan dan biaya harian</h2>
                <p className="mt-1 text-xs text-ink-soft">
                  Estimasi biaya USD; biaya nol bisa berarti tarif belum disetel.
                </p>
                <div className="mt-4 h-72">
                  {dashboard.daily.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-ink-soft">
                      Belum ada panggilan AI tercatat pada periode ini.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dashboard.daily} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                        <XAxis dataKey="day" tickFormatter={formatDate} tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="requests" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 11 }} />
                        <Tooltip
                          labelFormatter={(label) => formatDate(String(label))}
                          formatter={(value, name) => [
                            name === "Estimasi biaya" ? formatUsd(Number(value)) : formatNumber(Number(value)),
                            name,
                          ]}
                        />
                        <Line yAxisId="requests" type="monotone" dataKey="requests" name="Panggilan" stroke="#164e63" strokeWidth={2} dot={false} />
                        <Line yAxisId="cost" type="monotone" dataKey="estimatedCostUsd" name="Estimasi biaya" stroke="#d97706" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </article>

              <article className="rounded-xl border border-line bg-paper-raised p-4 shadow-sm">
                <h2 className="font-serif text-lg font-bold text-ink">Kuota bulan ini</h2>
                <p className="mt-1 text-xs text-ink-soft">
                  Ringkasan kolektif akun, tidak mencakup task yang belum tercatat sebagai usage.
                </p>
                <dl className="mt-5 space-y-4">
                  <div className="flex justify-between gap-4 text-sm">
                    <dt className="text-ink-soft">Kuota per akun</dt>
                    <dd className="font-semibold text-ink">{dashboard.currentMonth.quotaPerUser}</dd>
                  </div>
                  <div className="flex justify-between gap-4 text-sm">
                    <dt className="text-ink-soft">Akun dengan catatan kuota</dt>
                    <dd className="font-semibold text-ink">{formatNumber(dashboard.currentMonth.usersWithUsageRecord)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 text-sm">
                    <dt className="text-ink-soft">Kuota bulanan terpakai</dt>
                    <dd className="font-semibold text-ink">{formatNumber(dashboard.currentMonth.monthlyCreditsConsumed)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 text-sm">
                    <dt className="text-ink-soft">Kredit bonus terpakai</dt>
                    <dd className="font-semibold text-ink">{formatNumber(dashboard.currentMonth.bonusCreditsConsumed)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 text-sm">
                    <dt className="text-ink-soft">Kredit bonus tersisa</dt>
                    <dd className="font-semibold text-ink">{formatNumber(dashboard.currentMonth.bonusCreditsRemaining)}</dd>
                  </div>
                </dl>
                <p className="mt-5 rounded-lg bg-paper p-3 text-xs leading-5 text-ink-soft">
                  Satu kredit bukan satu panggilan model. Satu task bisa memicu
                  beberapa panggilan, retry, atau fallback.
                </p>
              </article>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <article className="overflow-hidden rounded-xl border border-line bg-paper-raised shadow-sm">
                <div className="border-b border-line p-4">
                  <h2 className="font-serif text-lg font-bold text-ink">Biaya menurut fitur AI</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-paper text-ink-soft">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Fitur</th>
                        <th className="px-4 py-3 font-semibold">Panggilan</th>
                        <th className="px-4 py-3 font-semibold">Token</th>
                        <th className="px-4 py-3 font-semibold">Estimasi biaya</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {dashboard.byTaskType.map((row) => (
                        <tr key={row.taskType}>
                          <td className="px-4 py-3 font-medium text-ink">{taskLabels[row.taskType] ?? row.taskType}</td>
                          <td className="px-4 py-3 text-ink-soft">{formatNumber(row.requests)}</td>
                          <td className="px-4 py-3 text-ink-soft">{formatNumber(row.totalTokens)}</td>
                          <td className="px-4 py-3 text-ink-soft">{formatUsd(row.estimatedCostUsd)}</td>
                        </tr>
                      ))}
                      {dashboard.byTaskType.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-soft">Belum ada data.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="overflow-hidden rounded-xl border border-line bg-paper-raised shadow-sm">
                <div className="border-b border-line p-4">
                  <h2 className="font-serif text-lg font-bold text-ink">Penggunaan per akun</h2>
                  <p className="mt-1 text-xs text-ink-soft">50 akun teratas berdasarkan estimasi biaya · ID saja, tanpa email atau konten.</p>
                </div>
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-paper text-ink-soft">
                      <tr>
                        <th className="px-4 py-3 font-semibold">ID akun</th>
                        <th className="px-4 py-3 font-semibold">Panggilan</th>
                        <th className="px-4 py-3 font-semibold">Token</th>
                        <th className="px-4 py-3 font-semibold">Estimasi biaya</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {dashboard.usersByCost.map((row) => (
                        <tr key={row.userId ?? "unattributed"}>
                          <td className="max-w-40 break-all px-4 py-3 font-mono text-[10px] text-ink">{row.userId ?? "Tidak teratribusi"}</td>
                          <td className="px-4 py-3 text-ink-soft">{formatNumber(row.requests)}</td>
                          <td className="px-4 py-3 text-ink-soft">{formatNumber(row.totalTokens)}</td>
                          <td className="px-4 py-3 text-ink-soft">{formatUsd(row.estimatedCostUsd)}</td>
                        </tr>
                      ))}
                      {dashboard.usersByCost.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-soft">Belum ada data per akun. Logging mulai setelah versi baru berjalan.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-xl border border-line bg-paper-raised p-4 shadow-sm">
                <h2 className="font-serif text-lg font-bold text-ink">Event produk yang disetujui</h2>
                <p className="mt-1 text-xs text-ink-soft">
                  Ini hitungan event, bukan total traffic; hanya pengguna yang setuju analitik yang tercatat.
                </p>
                <ul className="mt-4 divide-y divide-line">
                  {dashboard.funnelEvents.map((event) => (
                    <li key={event.eventName} className="flex justify-between gap-4 py-2.5 text-sm">
                      <span className="text-ink-soft">{eventLabels[event.eventName] ?? event.eventName}</span>
                      <span className="font-semibold text-ink">{formatNumber(event.count)}</span>
                    </li>
                  ))}
                  {dashboard.funnelEvents.length === 0 && (
                    <li className="py-6 text-center text-sm text-ink-soft">Belum ada event dalam periode ini.</li>
                  )}
                </ul>
              </article>
              <article className="rounded-xl border border-line bg-paper-raised p-4 shadow-sm">
                <h2 className="font-serif text-lg font-bold text-ink">Catatan biaya & privasi</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-ink-soft">
                  <li>Token berasal dari usage metadata yang dilaporkan Gemini per panggilan, termasuk retry dan model fallback.</li>
                  <li>Estimasi USD memakai tarif input/output yang kamu konfigurasikan; samakan dengan model dan harga pada billing Google.</li>
                  <li>Angka tidak menggantikan laporan billing provider dan tidak mencakup pajak, cache, atau komponen harga lain.</li>
                  <li>Data penggunaan AI tidak memuat prompt, isi CV, jawaban interview, email, atau nama akun.</li>
                </ul>
              </article>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
