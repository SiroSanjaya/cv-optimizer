import { useState } from "react";
import {
  X,
  TrendingUp,
  ShieldCheck,
  Copy,
  Check,
  Calculator,
} from "lucide-react";


interface SalaryBenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SALARY_BENCHMARKS: Record<string, Record<string, { idr: [number, number]; usd: [number, number]; thpRate: number }>> = {
  frontend: {
    junior: { idr: [8000000, 13000000], usd: [2000, 3500], thpRate: 0.92 },
    mid: { idr: [14000000, 22000000], usd: [3500, 5500], thpRate: 0.88 },
    senior: { idr: [23000000, 36000000], usd: [5500, 8500], thpRate: 0.84 },
    lead: { idr: [35000000, 52000000], usd: [8500, 12000], thpRate: 0.80 },
  },
  backend: {
    junior: { idr: [9000000, 14000000], usd: [2200, 3800], thpRate: 0.92 },
    mid: { idr: [15000000, 25000000], usd: [3800, 6000], thpRate: 0.88 },
    senior: { idr: [25000000, 40000000], usd: [6000, 9500], thpRate: 0.84 },
    lead: { idr: [38000000, 58000000], usd: [9500, 13500], thpRate: 0.80 },
  },
  fullstack: {
    junior: { idr: [9000000, 15000000], usd: [2200, 4000], thpRate: 0.92 },
    mid: { idr: [16000000, 26000000], usd: [4000, 6500], thpRate: 0.88 },
    senior: { idr: [26000000, 42000000], usd: [6500, 10000], thpRate: 0.84 },
    lead: { idr: [40000000, 60000000], usd: [10000, 14000], thpRate: 0.80 },
  },
  devops: {
    junior: { idr: [10000000, 16000000], usd: [2500, 4200], thpRate: 0.92 },
    mid: { idr: [17000000, 28000000], usd: [4200, 7000], thpRate: 0.88 },
    senior: { idr: [28000000, 45000000], usd: [7000, 11000], thpRate: 0.84 },
    lead: { idr: [42000000, 65000000], usd: [11000, 15000], thpRate: 0.80 },
  },
  data: {
    junior: { idr: [9000000, 14000000], usd: [2200, 3800], thpRate: 0.92 },
    mid: { idr: [15000000, 24000000], usd: [3800, 6000], thpRate: 0.88 },
    senior: { idr: [24000000, 38000000], usd: [6000, 9000], thpRate: 0.84 },
    lead: { idr: [36000000, 55000000], usd: [9000, 13000], thpRate: 0.80 },
  },
};

export function SalaryBenchmarkModal({ isOpen, onClose }: SalaryBenchmarkModalProps) {
  const [role, setRole] = useState("frontend");
  const [level, setLevel] = useState("mid");
  const [currency, setCurrency] = useState<"IDR" | "USD">("IDR");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const data = SALARY_BENCHMARKS[role]?.[level] || SALARY_BENCHMARKS.frontend.mid;
  const isIdr = currency === "IDR";

  const minSalary = isIdr ? data.idr[0] : data.usd[0];
  const maxSalary = isIdr ? data.idr[1] : data.usd[1];

  const formatMoney = (val: number) => {
    return isIdr
      ? "Rp " + val.toLocaleString("id-ID")
      : "$" + val.toLocaleString("en-US");
  };

  const estimatedThpMin = Math.round(minSalary * data.thpRate);
  const estimatedThpMax = Math.round(maxSalary * data.thpRate);

  const negotiationScript = `Saat HR bertanya: "Berapa ekspektasi gaji Anda untuk posisi ini?"

Contoh Jawaban Strategis:
"Berdasarkan riset pasar untuk level ${level.toUpperCase()} dan tanggung jawab teknis yang dipaparkan, ekspektasi kompensasi saya berada di rentang ${formatMoney(minSalary)} hingga ${formatMoney(maxSalary)} gross per bulan. Namun demikian, saya sangat fleksibel untuk mendiskusikan keseluruhan paket kompensasi termasuk bonus kinerja, asuransi, dan fasilitas pengembangan profesional yang disediakan."`;

  const handleCopy = () => {
    navigator.clipboard.writeText(negotiationScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-2xl border border-line bg-paper-raised p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest text-white">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-ink">
                Kalkulator Gaji & Benchmark Industri Tech
              </h2>
              <p className="text-[11px] text-ink-soft">
                Data kompensasi objektif Indonesia (IDR) & Remote Global (USD)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-soft hover:bg-paper hover:text-ink cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Controls */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-ink uppercase mb-1">
              Bidang / Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-forest"
            >
              <option value="frontend">Frontend Developer</option>
              <option value="backend">Backend Engineer</option>
              <option value="fullstack">Full Stack Developer</option>
              <option value="devops">DevOps & Cloud</option>
              <option value="data">Data Engineer</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink uppercase mb-1">
              Pengalaman
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-forest"
            >
              <option value="junior">Junior (0 - 2 tahun)</option>
              <option value="mid">Mid-Level (2 - 5 tahun)</option>
              <option value="senior">Senior (5+ tahun)</option>
              <option value="lead">Lead / Principal</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink uppercase mb-1">
              Mata Uang
            </label>
            <div className="flex items-center gap-1 rounded-lg border border-line bg-paper p-1">
              <button
                onClick={() => setCurrency("IDR")}
                className={`flex-1 rounded py-1 text-center text-xs font-bold transition-colors ${
                  currency === "IDR" ? "bg-forest text-white" : "text-ink-soft hover:text-ink"
                }`}
              >
                🇮🇩 IDR (Indo)
              </button>
              <button
                onClick={() => setCurrency("USD")}
                className={`flex-1 rounded py-1 text-center text-xs font-bold transition-colors ${
                  currency === "USD" ? "bg-forest text-white" : "text-ink-soft hover:text-ink"
                }`}
              >
                🌐 USD (Remote)
              </button>
            </div>
          </div>
        </div>

        {/* Results Card */}
        <div className="mt-6 rounded-xl border border-forest/30 bg-gradient-to-br from-forest-tint/40 to-paper-raised p-5">
          <span className="text-xs font-bold text-forest uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="h-4 w-4" /> Rentang Gaji Pasar (Gross Monthly)
          </span>

          <p className="mt-2 font-serif text-3xl font-bold text-ink">
            {formatMoney(minSalary)} - {formatMoney(maxSalary)}
            <span className="text-xs font-normal text-ink-soft"> /bulan</span>
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-forest/20 text-xs">
            <div>
              <span className="text-ink-soft block text-[11px]">Estimasi Take Home Pay (Netto):</span>
              <span className="font-bold text-emerald-700">
                {formatMoney(estimatedThpMin)} - {formatMoney(estimatedThpMax)}
              </span>
              <span className="block text-[10px] text-ink-soft/70">Setelah estimasi BPJS & PPh 21</span>
            </div>

            <div>
              <span className="text-ink-soft block text-[11px]">Tingkat Permintaan Rekruter:</span>
              <span className="font-bold text-ink">Tinggi (High Demand)</span>
              <span className="block text-[10px] text-ink-soft/70">Berdasarkan data Kalibrr & Remotive</span>
            </div>
          </div>
        </div>

        {/* Tactical Negotiation Script */}
        <div className="mt-6 rounded-xl border border-line bg-paper p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-ink flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-forest" />
              Taktik Menjawab Pertanyaan Gaji ke HR:
            </span>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded bg-paper-raised px-2 py-1 text-[11px] font-semibold text-forest border border-line hover:border-forest"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Tersalin!" : "Salin Script"}</span>
            </button>
          </div>

          <pre className="whitespace-pre-wrap text-xs text-ink-soft font-sans leading-relaxed bg-paper-raised p-3 rounded-lg border border-line/60">
            {negotiationScript}
          </pre>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-forest px-5 py-2 text-xs font-bold text-white hover:bg-forest-dark cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
