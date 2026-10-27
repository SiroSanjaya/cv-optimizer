import { useState, useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Plus,
  Check,
} from "lucide-react";
import type { JobRequirementMatch } from "../types/cv";

interface EvidenceMatchTableProps {
  requirements?: JobRequirementMatch[];
  matchedSkills?: string[];
  partialMatches?: Array<{ skill: string; details: string }> | string[];
  missingSkills?: string[];
  onClaimSkill?: (skill: string) => void;
  claimedSkills?: string[];
}

export function EvidenceMatchTable({
  requirements = [],
  matchedSkills = [],
  partialMatches = [],
  missingSkills = [],
  onClaimSkill,
  claimedSkills = [],
}: EvidenceMatchTableProps) {
  const [filter, setFilter] = useState<"all" | "Supported" | "Partial" | "Gap">("all");
  const [search, setSearch] = useState("");

  // Normalize fallback data if requirements array is empty
  const allRequirements: JobRequirementMatch[] = useMemo(() => {
    if (requirements && requirements.length > 0) {
      return requirements;
    }

    const list: JobRequirementMatch[] = [];

    // Fallback from matchedSkills
    matchedSkills.forEach((skill) => {
      list.push({
        requirement: skill,
        evidence: `Ditemukan pada riwayat pengalaman & skill di CV.`,
        status: "Supported",
        category: "Technical",
      });
    });

    // Fallback from partialMatches
    partialMatches.forEach((p) => {
      const skillName = typeof p === "string" ? p : p.skill;
      const details = typeof p === "string" ? "Kompetensi terkait teridentifikasi, namun bukti mendalam belum tertera." : p.details;
      list.push({
        requirement: skillName,
        evidence: details || "Ada bukti terkait di CV, tetapi optimasi performa/skala belum tertera spesifik.",
        status: "Partial",
        category: "Technical",
      });
    });

    // Fallback from missingSkills
    missingSkills.forEach((skill) => {
      list.push({
        requirement: skill,
        evidence: "Tidak ditemukan bukti eksplisit pada CV asli. Perlu klarifikasi.",
        status: "Gap",
        category: "Technical",
      });
    });

    return list;
  }, [requirements, matchedSkills, partialMatches, missingSkills]);

  const counts = useMemo(() => {
    const supported = allRequirements.filter((r) => r.status === "Supported").length;
    const partial = allRequirements.filter((r) => r.status === "Partial").length;
    const gap = allRequirements.filter((r) => r.status === "Gap").length;
    return { total: allRequirements.length, supported, partial, gap };
  }, [allRequirements]);

  const filtered = useMemo(() => {
    return allRequirements.filter((r) => {
      const matchFilter = filter === "all" || r.status === filter;
      const matchSearch =
        !search.trim() ||
        r.requirement.toLowerCase().includes(search.toLowerCase()) ||
        r.evidence.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [allRequirements, filter, search]);

  const isClaimed = (skill: string) =>
    claimedSkills.some((c) => c.toLowerCase() === skill.toLowerCase());

  return (
    <div className="rounded-xl border border-line bg-paper-raised p-6 shadow-xs">
      {/* Title & Trust Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-forest" />
            <h3 className="text-base font-bold text-ink">
              Job Match Evidence & Gap Analysis
            </h3>
            <span className="rounded-full bg-forest-tint px-2.5 py-0.5 text-xs font-bold text-forest">
              Anti-Hallucination
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            Transparansi penuh: Sistem membedakan skill yang benar-benar didukung bukti, skill separuh terbukti, dan gap nyata.
          </p>
        </div>

        {/* Counter Badges */}
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-center">
            <span className="text-2xs uppercase tracking-wider font-bold text-emerald-800">
              Supported
            </span>
            <p className="text-xs font-bold text-emerald-950">
              {counts.supported} / {counts.total}
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-center">
            <span className="text-2xs uppercase tracking-wider font-bold text-amber-800">
              Partial
            </span>
            <p className="text-xs font-bold text-amber-950">{counts.partial}</p>
          </div>
          <div className="rounded-lg border border-rust/20 bg-rust-tint px-3 py-1.5 text-center">
            <span className="text-2xs uppercase tracking-wider font-bold text-rust">
              Gap
            </span>
            <p className="text-xs font-bold text-rust">{counts.gap}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              filter === "all"
                ? "bg-forest text-white shadow-2xs"
                : "border border-line bg-paper text-ink-soft hover:bg-paper-raised"
            }`}
          >
            Semua ({counts.total})
          </button>
          <button
            onClick={() => setFilter("Supported")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1 ${
              filter === "Supported"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "border border-emerald-200 bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100"
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            Supported ({counts.supported})
          </button>
          <button
            onClick={() => setFilter("Partial")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1 ${
              filter === "Partial"
                ? "bg-amber-600 text-white shadow-2xs"
                : "border border-amber-200 bg-amber-50/70 text-amber-900 hover:bg-amber-100"
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            Partial ({counts.partial})
          </button>
          <button
            onClick={() => setFilter("Gap")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1 ${
              filter === "Gap"
                ? "bg-rust text-white shadow-2xs"
                : "border border-rust/30 bg-rust-tint/60 text-rust hover:bg-rust-tint"
            }`}
          >
            <XCircle className="h-3 w-3" />
            Gap ({counts.gap})
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Cari requirement / skill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-56 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs text-ink placeholder:text-ink-soft/60 focus:border-forest focus:outline-hidden"
          />
        </div>
      </div>

      {/* Evidence Table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-line">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-paper font-semibold text-ink-soft">
              <tr>
                <th className="px-4 py-3 w-1/4">Persyaratan Lowongan (JD)</th>
                <th className="px-4 py-3 w-1/2">Bukti pada CV (Evidence)</th>
                <th className="px-4 py-3 w-28 text-center">Status</th>
                {onClaimSkill && <th className="px-4 py-3 text-right">Tindakan</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 bg-paper-raised">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-ink-soft">
                    Tidak ada requirement yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => {
                  const claimed = isClaimed(item.requirement);

                  return (
                    <tr key={idx} className="hover:bg-paper/50 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-ink align-top">
                        <div className="flex flex-col gap-0.5">
                          <span>{item.requirement}</span>
                          {item.category && (
                            <span className="text-2xs text-ink-soft font-normal">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-ink-soft leading-relaxed align-top">
                        <p>{item.evidence}</p>
                      </td>

                      <td className="px-4 py-3.5 text-center align-top whitespace-nowrap">
                        {item.status === "Supported" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-2xs font-bold text-emerald-900">
                            <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                            Supported
                          </span>
                        ) : item.status === "Partial" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-2xs font-bold text-amber-900">
                            <AlertTriangle className="h-3 w-3 text-amber-700" />
                            Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rust/30 bg-rust-tint px-2.5 py-0.5 text-2xs font-bold text-rust">
                            <XCircle className="h-3 w-3 text-rust" />
                            Gap
                          </span>
                        )}
                      </td>

                      {onClaimSkill && (
                        <td className="px-4 py-3.5 text-right align-top whitespace-nowrap">
                          {claimed ? (
                            <button
                              type="button"
                              onClick={() => onClaimSkill(item.requirement)}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-100 border border-emerald-300 px-2 py-1 text-2xs font-bold text-emerald-800 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all"
                              title="Batal memasukkan skill ini"
                            >
                              <Check className="h-3 w-3 text-emerald-600" />
                              Terkonfirmasi
                            </button>
                          ) : item.status !== "Supported" ? (
                            <button
                              type="button"
                              onClick={() => onClaimSkill(item.requirement)}
                              className="inline-flex items-center gap-1 rounded-md border border-forest/30 bg-forest-tint/60 px-2 py-1 text-2xs font-semibold text-forest hover:bg-forest hover:text-white transition-all shadow-2xs"
                              title="Klik jika Anda sebenarnya punya pengalaman ini untuk dimasukkan ke CV"
                            >
                              <Plus className="h-3 w-3" />
                              Konfirmasi Skill
                            </button>
                          ) : (
                            <span className="text-2xs text-ink-soft/70">✓ Terverifikasi</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
