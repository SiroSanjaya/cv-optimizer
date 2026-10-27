import { useState } from "react";
import {
  Check,
  X,
  Edit3,
  Sparkles,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import type { BulletRevision } from "../types/cv";

interface InteractiveRewriteDiffProps {
  revisions: BulletRevision[];
  onApplyRevisions: (acceptedRevisions: BulletRevision[]) => void;
}

export function InteractiveRewriteDiff({
  revisions = [],
  onApplyRevisions,
}: InteractiveRewriteDiffProps) {
  const [items, setItems] = useState<BulletRevision[]>(() =>
    revisions.map((rev, idx) => ({
      ...rev,
      id: rev.id || `rev-${idx}`,
      status: rev.status || "accepted", // default accepted for convenience
    }))
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [metricInput, setMetricInput] = useState<{ id: string; text: string } | null>(null);

  const handleSetStatus = (id: string, status: "accepted" | "rejected") => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  const handleStartEdit = (item: BulletRevision) => {
    setEditingId(item.id || null);
    setEditText(item.suggestedBullet);
  };

  const handleSaveEdit = (id: string) => {
    if (!editText.trim()) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, suggestedBullet: editText.trim(), status: "accepted" }
          : item
      )
    );
    setEditingId(null);
  };

  const handleAddMetric = (id: string) => {
    if (!metricInput || !metricInput.text.trim()) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const cleanedMetric = metricInput.text.trim();
        const updated = item.suggestedBullet.replace(/\.$/, "") + `, achieving ${cleanedMetric}.`;
        return {
          ...item,
          suggestedBullet: updated,
          hasQuantifiableMetric: true,
          status: "accepted",
        };
      })
    );
    setMetricInput(null);
  };

  const acceptedCount = items.filter((i) => i.status === "accepted").length;

  const handleApplyAll = () => {
    onApplyRevisions(items);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-line bg-paper-raised p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-forest" />
            <h3 className="text-base font-bold text-ink">
              Tinjauan Perubahan AI (Accept / Edit / Reject)
            </h3>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              {acceptedCount} / {items.length} Diterima
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            Kendalikan isi CV Anda sepenuhnya. Setujui atau edit setiap kalimat rewrite sebelum dimasukkan ke CV final.
          </p>
        </div>

        <button
          type="button"
          onClick={handleApplyAll}
          className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-forest-dark transition-all"
        >
          <CheckCircle2 className="h-4 w-4" />
          Terapkan Perubahan ke CV
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {items.map((rev) => {
          const isAccepted = rev.status === "accepted";
          const isRejected = rev.status === "rejected";
          const isEditing = editingId === rev.id;

          return (
            <div
              key={rev.id}
              className={`rounded-xl border p-4 transition-all ${
                isRejected
                  ? "border-line bg-paper/40 opacity-75"
                  : "border-forest/20 bg-paper-raised shadow-2xs"
              }`}
            >
              {/* Header role & status */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-ink">
                  {rev.role} <span className="font-normal text-ink-soft">@ {rev.company}</span>
                </span>

                <div className="flex items-center gap-2">
                  {isAccepted && (
                    <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      <Check className="h-3 w-3" />
                      Disetujui
                    </span>
                  )}
                  {isRejected && (
                    <span className="inline-flex items-center gap-1 text-2xs font-bold text-rust bg-rust-tint px-2 py-0.5 rounded-md">
                      <X className="h-3 w-3" />
                      Ditolak (Pakai Asli)
                    </span>
                  )}
                </div>
              </div>

              {/* Before vs After comparison */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Before */}
                <div className="rounded-lg border border-line/70 bg-paper/60 p-3">
                  <span className="text-2xs font-bold uppercase tracking-wider text-ink-soft/70 block mb-1">
                    Sebelum (Asli)
                  </span>
                  <p className="text-ink-soft leading-relaxed line-through decoration-rust/40">
                    {rev.originalBullet}
                  </p>
                </div>

                {/* Suggested Rewrite */}
                <div
                  className={`rounded-lg border p-3 ${
                    isRejected
                      ? "border-line bg-paper/30 text-ink-soft"
                      : "border-emerald-300/80 bg-emerald-50/60 text-ink font-medium"
                  }`}
                >
                  <span className="text-2xs font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                    Saran AI (X-Y-Z Action Formula)
                  </span>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full rounded-md border border-line bg-paper-raised p-2 text-xs text-ink focus:border-forest focus:outline-hidden"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 text-2xs font-semibold text-ink-soft hover:text-ink"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(rev.id!)}
                          className="rounded-md bg-forest px-3 py-1 text-2xs font-bold text-white"
                        >
                          Simpan Edit
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="leading-relaxed">{rev.suggestedBullet}</p>
                  )}
                </div>
              </div>

              {/* Reasoning & Actions */}
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-line/50 text-xs">
                <div className="text-2xs text-ink-soft flex items-start gap-1.5 max-w-lg">
                  <HelpCircle className="h-3.5 w-3.5 text-forest shrink-0 mt-0.5" />
                  <span>
                    <strong>Alasan AI:</strong> {rev.reasoning}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(rev)}
                      className="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-2.5 py-1 text-2xs font-semibold text-ink-soft hover:bg-paper-raised hover:text-ink"
                    >
                      <Edit3 className="h-3 w-3" />
                      Edit
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSetStatus(rev.id!, "rejected")}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-2xs font-semibold transition-all ${
                      isRejected
                        ? "bg-rust text-white"
                        : "border border-rust/30 text-rust hover:bg-rust-tint"
                    }`}
                  >
                    <X className="h-3 w-3" />
                    Tolak
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetStatus(rev.id!, "accepted")}
                    className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-2xs font-bold transition-all ${
                      isAccepted
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    }`}
                  >
                    <Check className="h-3 w-3" />
                    Setujui
                  </button>
                </div>
              </div>

              {/* Metric confirmation prompt */}
              {!rev.hasQuantifiableMetric && isAccepted && (
                <div className="mt-2.5 rounded-md border border-amber-200 bg-amber-50/70 p-2 text-2xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    💡 <strong>Tips Metrik:</strong> Punya angka nyata? (contoh: <em>"latency turun 35%"</em> atau <em>"melayani 20.000 user"</em>)
                  </span>
                  {metricInput?.id === rev.id ? (
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="Contoh: 35% latency reduction"
                        value={metricInput?.text || ""}
                        onChange={(e) => setMetricInput({ id: rev.id!, text: e.target.value })}
                        className="rounded border border-line bg-paper-raised px-2 py-0.5 text-2xs text-ink"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddMetric(rev.id!)}
                        className="rounded bg-amber-600 px-2 py-0.5 font-bold text-white"
                      >
                        Pasang
                      </button>
                      <button
                        type="button"
                        onClick={() => setMetricInput(null)}
                        className="text-ink-soft hover:text-ink px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMetricInput({ id: rev.id!, text: "" })}
                      className="font-bold underline text-amber-800 hover:text-amber-900"
                    >
                      + Tambah Metrik Nyata
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
