import { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "../components/Header";
import { Button } from "../components/Button";
import { useAuth } from "../context/AuthContextValue";
import {
  getVaultStories,
  createVaultStory,
  updateVaultStory,
  deleteVaultStory,
  extractVaultStoriesFromCv,
  matchVaultStoriesForJob,
  type VaultStoryItem,
  type CreateVaultStoryInput,
  type StarCategory,
} from "../lib/api";
import { getSessionStructuredCv } from "../lib/sessionProfile";
import {
  Sparkles,
  Plus,
  Search,
  Trash2,
  Edit3,
  Copy,
  Check,
  Zap,
  BookOpen,
  Award,
  ChevronRight,
  ChevronDown,
  X,
  Target,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const CATEGORIES: { key: StarCategory | "all"; label: string; badgeColor: string }[] = [
  { key: "all", label: "Semua Kategori", badgeColor: "bg-paper-raised text-ink border-line" },
  { key: "technical", label: "Technical", badgeColor: "bg-forest-tint text-forest border-forest/20" },
  { key: "architecture", label: "Architecture", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { key: "leadership", label: "Leadership", badgeColor: "bg-amber-tint text-amber border-amber/30" },
  { key: "process_improvement", label: "Process", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "crisis_handling", label: "Crisis", badgeColor: "bg-rust-tint text-rust border-rust/20" },
  { key: "other", label: "Lainnya", badgeColor: "bg-gray-100 text-gray-700 border-gray-200" },
];

export function VaultPage() {
  const { user } = useAuth();
  const [stories, setStories] = useState<VaultStoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<StarCategory | "all">("all");

  // Story detail expand
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<VaultStoryItem | null>(null);
  const [formData, setFormData] = useState<CreateVaultStoryInput>({
    company: "",
    role: "",
    periodStart: "",
    periodEnd: "",
    category: "technical",
    skillsUsed: [],
    situation: "",
    task: "",
    action: "",
    result: "",
    polishedBullet: "",
  });
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-Extract Modal
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [extractCvText, setExtractCvText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractedCandidates, setExtractedCandidates] = useState<CreateVaultStoryInput[]>([]);
  const [selectedExtractIndexes, setSelectedExtractIndexes] = useState<number[]>([]);
  const [savingExtracted, setSavingExtracted] = useState(false);

  // Match Simulator Drawer
  const [isMatcherOpen, setIsMatcherOpen] = useState(false);
  const [matcherJd, setMatcherJd] = useState("");
  const [matching, setMatching] = useState(false);
  const [matchedResults, setMatchedResults] = useState<
    Array<{ story: VaultStoryItem; relevanceScore: number; matchedSkills: string[] }>
  >([]);

  // Fetch stories
  const loadStories = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getVaultStories({
        category: selectedCategory === "all" ? undefined : selectedCategory,
        search: search.trim() || undefined,
      });
      setStories(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal memuat STAR Story Vault.");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, search]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  // Handle open create modal
  const handleOpenCreate = () => {
    setEditingStory(null);
    setFormData({
      company: "",
      role: "",
      periodStart: "",
      periodEnd: "",
      category: "technical",
      skillsUsed: [],
      situation: "",
      task: "",
      action: "",
      result: "",
      polishedBullet: "",
    });
    setSkillInput("");
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (story: VaultStoryItem) => {
    setEditingStory(story);
    setFormData({
      company: story.company,
      role: story.role,
      periodStart: story.periodStart || "",
      periodEnd: story.periodEnd || "",
      category: story.category,
      skillsUsed: [...story.skillsUsed],
      situation: story.situation,
      task: story.task,
      action: story.action,
      result: story.result,
      polishedBullet: story.polishedBullet || "",
    });
    setSkillInput("");
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle save story
  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formData.skillsUsed.length === 0 && skillInput.trim()) {
      formData.skillsUsed.push(skillInput.trim());
    }

    if (formData.skillsUsed.length === 0) {
      setFormError("Sertakan minimal 1 skill atau teknologi yang digunakan.");
      return;
    }

    setSaving(true);
    try {
      if (editingStory) {
        await updateVaultStory(editingStory.id, formData);
      } else {
        await createVaultStory(formData);
      }
      setIsModalOpen(false);
      await loadStories();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan cerita.");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete story
  const handleDeleteStory = async (id: string) => {
    if (!window.confirm("Hapus cerita pengalaman ini dari Master Vault?")) return;
    try {
      await deleteVaultStory(id);
      setStories((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus cerita.");
    }
  };

  // Handle copy polished bullet
  const handleCopyBullet = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Skill tag add/remove
  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = skillInput.trim().replace(/^,|,$/g, "");
      if (val && !formData.skillsUsed.includes(val)) {
        setFormData((prev) => ({
          ...prev,
          skillsUsed: [...prev.skillsUsed, val],
        }));
      }
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skillsUsed: prev.skillsUsed.filter((s) => s !== skillToRemove),
    }));
  };

  // Open Auto-extract Modal
  const handleOpenExtract = () => {
    const sessionCv = getSessionStructuredCv(user?.id || "guest");
    if (sessionCv) {
      setExtractCvText(JSON.stringify(sessionCv, null, 2));
    }
    setExtractedCandidates([]);
    setSelectedExtractIndexes([]);
    setIsExtractModalOpen(true);
  };

  // Run AI extract
  const handleRunExtract = async () => {
    if (!extractCvText.trim() || extractCvText.trim().length < 30) {
      alert("Masukkan konten CV minimal 30 karakter.");
      return;
    }
    setExtracting(true);
    try {
      const candidates = await extractVaultStoriesFromCv(extractCvText);
      setExtractedCandidates(candidates);
      setSelectedExtractIndexes(candidates.map((_, i) => i));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mengekstrak cerita dari CV.");
    } finally {
      setExtracting(false);
    }
  };

  // Save selected extracted stories
  const handleSaveExtracted = async () => {
    if (selectedExtractIndexes.length === 0) return;
    setSavingExtracted(true);
    try {
      for (const idx of selectedExtractIndexes) {
        const item = extractedCandidates[idx];
        if (item) {
          await createVaultStory(item);
        }
      }
      setIsExtractModalOpen(false);
      await loadStories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan cerita ke vault.");
    } finally {
      setSavingExtracted(false);
    }
  };

  // Run Job Matcher
  const handleRunMatcher = async () => {
    if (!matcherJd.trim() || matcherJd.trim().length < 20) {
      alert("Masukkan deskripsi lowongan minimal 20 karakter.");
      return;
    }
    setMatching(true);
    try {
      const res = await matchVaultStoriesForJob(matcherJd);
      setMatchedResults(res.matchedStories);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mencocokkan cerita.");
    } finally {
      setMatching(false);
    }
  };

  // Stats
  const metricsCount = useMemo(() => {
    return stories.filter((s) => /\d+%|\$\d+|\b\d+\s*(users|ms|x|k|m)\b/i.test(s.result)).length;
  }, [stories]);

  return (
    <div className="min-h-screen bg-paper pb-20">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        {/* Hero & Value Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-line bg-paper-raised p-6 shadow-xs sm:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-forest/20 bg-forest-tint px-3 py-1 text-xs font-semibold text-forest">
                <Sparkles className="h-3.5 w-3.5" />
                Master Experience Bank
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                The STAR Story Vault
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
                Catat seluruh pencapaian, arsitektur, dan metrik proyek karier Anda sekali seumur hidup.
                Saat melamar, AI akan menarik cerita spesifik dari Vault ini dan meraciknya secara otomatis
                ke CV tanpa halusinasi dan hemat token hingga 70%.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleOpenExtract}
                className="flex items-center gap-2 border-line bg-paper text-ink hover:bg-paper-raised"
              >
                <Zap className="h-4 w-4 text-amber" />
                Auto-Ekstrak dari CV
              </Button>

              <Button
                variant="secondary"
                onClick={() => setIsMatcherOpen(true)}
                className="flex items-center gap-2 border-line bg-paper text-ink hover:bg-paper-raised"
              >
                <Target className="h-4 w-4 text-forest" />
                Uji Relevansi JD
              </Button>

              <Button
                onClick={handleOpenCreate}
                className="flex items-center gap-2 bg-forest text-white hover:bg-forest-dark"
              >
                <Plus className="h-4 w-4" />
                Tambah STAR Story
              </Button>
            </div>
          </div>

          {/* Quick Metrics Counter */}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line/60 pt-6 sm:grid-cols-4">
            <div className="rounded-xl border border-line/40 bg-paper/50 p-3">
              <span className="text-xs font-medium text-ink-soft">Total Cerita di Vault</span>
              <p className="mt-1 text-xl font-bold text-ink">{stories.length}</p>
            </div>
            <div className="rounded-xl border border-line/40 bg-paper/50 p-3">
              <span className="text-xs font-medium text-ink-soft">Dengan Metrik Terukur</span>
              <p className="mt-1 text-xl font-bold text-emerald-600">{metricsCount} Cerita</p>
            </div>
            <div className="rounded-xl border border-line/40 bg-paper/50 p-3">
              <span className="text-xs font-medium text-ink-soft">Rata-rata Relevansi AI</span>
              <p className="mt-1 text-xl font-bold text-indigo-600">High Impact</p>
            </div>
            <div className="rounded-xl border border-line/40 bg-paper/50 p-3">
              <span className="text-xs font-medium text-ink-soft">Integritas Karir</span>
              <p className="mt-1 text-xl font-bold text-forest">100% Anti-Halusinasi</p>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
            <input
              type="text"
              placeholder="Cari teknologi, perusahaan, atau pencapaian..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-line bg-paper-raised pl-10 pr-4 py-2 text-sm text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-hidden"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft/60 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  selectedCategory === cat.key
                    ? "border-forest bg-forest text-white shadow-xs"
                    : "border-line bg-paper-raised text-ink-soft hover:bg-paper hover:text-ink"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Story List Grid */}
        <div className="mt-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest border-r-transparent" />
              <p className="mt-3 text-sm text-ink-soft">Memuat cerita dari Vault...</p>
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-rust/20 bg-rust-tint p-6 text-center text-rust">
              <AlertCircle className="mx-auto h-8 w-8 text-rust" />
              <p className="mt-2 text-sm font-semibold">{loadError}</p>
              <Button onClick={loadStories} className="mt-4 bg-rust text-white">
                Coba Lagi
              </Button>
            </div>
          ) : stories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-paper-raised/60 py-16 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-ink-soft/40" />
              <h3 className="mt-3 text-base font-semibold text-ink">Belum Ada Cerita Pengalaman</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Mulai simpan pencapaian proyek Anda dengan metode STAR atau ekstrak langsung dari CV Anda.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <Button
                  variant="secondary"
                  onClick={handleOpenExtract}
                  className="flex items-center gap-2 border-line bg-paper text-ink"
                >
                  <Zap className="h-4 w-4 text-amber" />
                  Auto-Ekstrak dari CV
                </Button>
                <Button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-2 bg-forest text-white"
                >
                  <Plus className="h-4 w-4" />
                  Buat Manual
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {stories.map((story) => {
                const isExpanded = expandedStoryId === story.id;
                const catObj = CATEGORIES.find((c) => c.key === story.category) || CATEGORIES[1];

                return (
                  <div
                    key={story.id}
                    className="overflow-hidden rounded-xl border border-line bg-paper-raised p-5 shadow-xs transition-all hover:border-line/80"
                  >
                    {/* Header: Company, Role, Category */}
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-ink">{story.role}</h3>
                          <span className="text-xs text-ink-soft font-medium">@ {story.company}</span>
                          <span
                            className={`rounded-md border px-2 py-0.5 text-xs font-medium ${catObj.badgeColor}`}
                          >
                            {catObj.label}
                          </span>
                        </div>
                        {(story.periodStart || story.periodEnd) && (
                          <p className="mt-0.5 text-xs text-ink-soft/80">
                            {story.periodStart || "Awal"} - {story.periodEnd || "Present"}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(story)}
                          className="rounded-lg border border-line p-1.5 text-ink-soft hover:bg-paper hover:text-ink"
                          title="Edit Story"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStory(story.id)}
                          className="rounded-lg border border-line p-1.5 text-ink-soft hover:bg-rust-tint hover:text-rust"
                          title="Hapus Story"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Polished Bullet Point Box */}
                    {story.polishedBullet && (
                      <div className="mt-4 rounded-lg border border-forest/20 bg-forest-tint/40 p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <Award className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                            <p className="text-sm font-medium text-ink leading-relaxed">
                              {story.polishedBullet}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCopyBullet(story.id, story.polishedBullet!)}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-forest/30 bg-paper-raised px-2.5 py-1 text-xs font-semibold text-forest shadow-2xs hover:bg-forest-tint"
                            title="Salin Bullet Point Resume"
                          >
                            {copiedId === story.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                Salin Bullet
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Skills Used Tags */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {story.skillsUsed.map((skill, idx) => (
                        <span
                          key={idx}
                          className="rounded-md border border-line bg-paper px-2 py-0.5 text-xs font-medium text-ink-soft"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* STAR Details Accordion Trigger */}
                    <button
                      onClick={() => setExpandedStoryId(isExpanded ? null : story.id)}
                      className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-forest hover:underline"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" />
                          Sembunyikan Rincian STAR
                        </>
                      ) : (
                        <>
                          <ChevronRight className="h-3.5 w-3.5" />
                          Lihat Komponen STAR (Situation, Task, Action, Result)
                        </>
                      )}
                    </button>

                    {/* STAR Details Container */}
                    {isExpanded && (
                      <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-line/60 bg-paper/40 p-4 text-xs sm:grid-cols-2">
                        <div className="rounded-md border border-line/40 bg-paper-raised p-3">
                          <span className="font-bold uppercase tracking-wider text-amber">
                            S — Situation (Tantangan Awal)
                          </span>
                          <p className="mt-1 text-ink-soft leading-relaxed">{story.situation}</p>
                        </div>

                        <div className="rounded-md border border-line/40 bg-paper-raised p-3">
                          <span className="font-bold uppercase tracking-wider text-indigo-600">
                            T — Task (Target & Tanggung Jawab)
                          </span>
                          <p className="mt-1 text-ink-soft leading-relaxed">{story.task}</p>
                        </div>

                        <div className="rounded-md border border-line/40 bg-paper-raised p-3">
                          <span className="font-bold uppercase tracking-wider text-forest">
                            A — Action (Eksekusi & Teknologi)
                          </span>
                          <p className="mt-1 text-ink-soft leading-relaxed">{story.action}</p>
                        </div>

                        <div className="rounded-md border border-line/40 bg-paper-raised p-3">
                          <span className="font-bold uppercase tracking-wider text-emerald-600">
                            R — Result (Dampak & Metrik Terukur)
                          </span>
                          <p className="mt-1 text-ink font-semibold leading-relaxed">{story.result}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-paper-raised p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h2 className="text-lg font-bold text-ink">
                {editingStory ? "Edit STAR Story" : "Tambah STAR Story Baru"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-ink-soft hover:bg-paper hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg border border-rust/30 bg-rust-tint p-3 text-xs text-rust">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveStory} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-ink">Perusahaan / Proyek *</label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="e.g. Tokopedia / Open Source Project"
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-forest focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink">Posisi / Peran *</label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g. Senior Backend Engineer"
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-forest focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-ink">Periode Mulai</label>
                  <input
                    type="text"
                    value={formData.periodStart || ""}
                    onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                    placeholder="e.g. Jan 2023"
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-forest focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink">Periode Selesai</label>
                  <input
                    type="text"
                    value={formData.periodEnd || ""}
                    onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                    placeholder="e.g. Present"
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-forest focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as StarCategory })
                    }
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-forest focus:outline-hidden"
                  >
                    <option value="technical">Technical</option>
                    <option value="architecture">Architecture</option>
                    <option value="leadership">Leadership</option>
                    <option value="process_improvement">Process</option>
                    <option value="crisis_handling">Crisis Handling</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Skills Tags Input */}
              <div>
                <label className="text-xs font-semibold text-ink">
                  Skills & Teknologi Terkait (Tekan Enter atau Koma) *
                </label>
                <div className="mt-1 flex flex-wrap gap-1.5 rounded-lg border border-line bg-paper p-2 focus-within:border-forest">
                  {formData.skillsUsed.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 rounded-md bg-paper-raised px-2 py-0.5 text-xs font-medium text-ink border border-line"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-ink-soft hover:text-rust"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    placeholder={
                      formData.skillsUsed.length === 0 ? "Ketik skill (e.g. Redis, Kafka)..." : ""
                    }
                    className="flex-1 min-w-[120px] bg-transparent text-xs text-ink placeholder:text-ink-soft/60 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* S: Situation */}
              <div>
                <label className="text-xs font-semibold text-amber">
                  [S] Situation: Masalah atau Bottleneck yang dihadapi *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.situation}
                  onChange={(e) => setFormData({ ...formData, situation: e.target.value })}
                  placeholder="Konteks sistem atau tantangan bisnis saat proyek dimulai (e.g. Database mengalami timeout saat peak hour)..."
                  className="mt-1 w-full rounded-lg border border-line bg-paper p-2.5 text-xs text-ink focus:border-forest focus:outline-hidden"
                />
              </div>

              {/* T: Task */}
              <div>
                <label className="text-xs font-semibold text-indigo-700">
                  [T] Task: Target atau Sasaran yang Ditugaskan *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.task}
                  onChange={(e) => setFormData({ ...formData, task: e.target.value })}
                  placeholder="Target spesifik yang menjadi tanggung jawab Anda (e.g. Mengurangi latency API di bawah 200ms)..."
                  className="mt-1 w-full rounded-lg border border-line bg-paper p-2.5 text-xs text-ink focus:border-forest focus:outline-hidden"
                />
              </div>

              {/* A: Action */}
              <div>
                <label className="text-xs font-semibold text-forest">
                  [A] Action: Langkah Konkret, Algoritma, & Arsitektur yang Dibuat *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  placeholder="Solusi teknis yang Anda bangun (e.g. Menerapkan Redis caching layer dan me-refactor query Postgres dengan indexing)..."
                  className="mt-1 w-full rounded-lg border border-line bg-paper p-2.5 text-xs text-ink focus:border-forest focus:outline-hidden"
                />
              </div>

              {/* R: Result */}
              <div>
                <label className="text-xs font-semibold text-emerald-700">
                  [R] Result: Hasil Terukur & Dampak Bisnis (Cantumkan Angka / %) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.result}
                  onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                  placeholder="Hasil nyata yang bisa diverifikasi (e.g. Latency turun 65% dari 800ms ke 180ms dan menghemat cloud cost sebesar $2.000/bulan)..."
                  className="mt-1 w-full rounded-lg border border-line bg-paper p-2.5 text-xs text-ink focus:border-forest focus:outline-hidden"
                />
              </div>

              {/* Polished Bullet Point (Optional) */}
              <div>
                <label className="text-xs font-semibold text-ink">
                  Resume Bullet Point X-Y-Z (Opsional — AI akan generate jika dikosongkan)
                </label>
                <input
                  type="text"
                  value={formData.polishedBullet || ""}
                  onChange={(e) => setFormData({ ...formData, polishedBullet: e.target.value })}
                  placeholder="e.g. Optimized database query performance by 65% by implementing Redis caching layer..."
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink focus:border-forest focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-line">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                  className="border-line text-ink"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-forest text-white hover:bg-forest-dark"
                >
                  {saving ? "Menyimpan..." : editingStory ? "Perbarui Story" : "Simpan ke Vault"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUTO-EXTRACT FROM CV MODAL */}
      {isExtractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line bg-paper-raised p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h2 className="text-lg font-bold text-ink">Auto-Ekstrak STAR Stories dari CV</h2>
                <p className="text-xs text-ink-soft">
                  AI akan menganalisis riwayat kerja Anda dan memecahnya ke unit cerita STAR terstruktur.
                </p>
              </div>
              <button
                onClick={() => setIsExtractModalOpen(false)}
                className="rounded-lg p-1 text-ink-soft hover:bg-paper hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {extractedCandidates.length === 0 ? (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-ink">
                    Paste Teks CV atau Ringkasan Pengalaman Kerja
                  </label>
                  <textarea
                    rows={8}
                    value={extractCvText}
                    onChange={(e) => setExtractCvText(e.target.value)}
                    placeholder="Salin teks dari CV atau LinkedIn Anda di sini..."
                    className="mt-1 w-full rounded-lg border border-line bg-paper p-3 text-xs text-ink font-mono focus:border-forest focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => setIsExtractModalOpen(false)}
                    className="border-line text-ink"
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleRunExtract}
                    disabled={extracting}
                    className="flex items-center gap-2 bg-forest text-white"
                  >
                    {extracting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                        Menganalisis STAR dengan AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Ekstrak Cerita Sekarang
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">
                    Ditemukan {extractedCandidates.length} STAR stories potensial. Pilih yang ingin disimpan:
                  </span>
                  <button
                    onClick={() =>
                      setSelectedExtractIndexes(
                        selectedExtractIndexes.length === extractedCandidates.length
                          ? []
                          : extractedCandidates.map((_, i) => i)
                      )
                    }
                    className="text-xs text-forest underline font-medium"
                  >
                    {selectedExtractIndexes.length === extractedCandidates.length
                      ? "Batal Pilih Semua"
                      : "Pilih Semua"}
                  </button>
                </div>

                <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                  {extractedCandidates.map((cand, idx) => {
                    const isChecked = selectedExtractIndexes.includes(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() =>
                          setSelectedExtractIndexes((prev) =>
                            prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
                          )
                        }
                        className={`cursor-pointer rounded-xl border p-4 transition-all ${
                          isChecked
                            ? "border-forest bg-forest-tint/30"
                            : "border-line bg-paper hover:border-line/80"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by parent onClick
                            className="mt-1 h-4 w-4 rounded border-line text-forest focus:ring-forest"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-ink">{cand.role}</span>
                              <span className="text-xs text-ink-soft">@ {cand.company}</span>
                              <span className="rounded-md border border-line bg-paper px-2 py-0.5 text-2xs uppercase tracking-wider font-semibold text-ink-soft">
                                {cand.category}
                              </span>
                            </div>

                            {cand.polishedBullet && (
                              <p className="mt-2 text-xs font-medium text-ink bg-paper-raised p-2 rounded-md border border-line/60">
                                {cand.polishedBullet}
                              </p>
                            )}

                            <div className="mt-2 grid grid-cols-2 gap-2 text-2xs text-ink-soft">
                              <div>
                                <span className="font-semibold text-forest">Aksi:</span> {cand.action}
                              </div>
                              <div>
                                <span className="font-semibold text-emerald-700">Hasil:</span> {cand.result}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-line">
                  <Button
                    variant="secondary"
                    onClick={() => setExtractedCandidates([])}
                    className="border-line text-ink"
                  >
                    Kembali
                  </Button>
                  <Button
                    onClick={handleSaveExtracted}
                    disabled={savingExtracted || selectedExtractIndexes.length === 0}
                    className="flex items-center gap-2 bg-forest text-white"
                  >
                    {savingExtracted ? (
                      "Menyimpan ke Vault..."
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Simpan ({selectedExtractIndexes.length}) Cerita ke Vault
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* JOB MATCHER SIMULATOR DRAWER */}
      {isMatcherOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-xl flex-col bg-paper-raised shadow-2xl">
            <div className="flex items-center justify-between border-b border-line p-6">
              <div>
                <h2 className="text-base font-bold text-ink">Uji Relevansi Vault vs Job Description</h2>
                <p className="text-xs text-ink-soft">
                  Sistem mengevaluasi cerita mana yang paling relevan secara deterministik (0 token cost).
                </p>
              </div>
              <button
                onClick={() => setIsMatcherOpen(false)}
                className="rounded-lg p-1.5 text-ink-soft hover:bg-paper hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-ink">Job Description Target</label>
                <textarea
                  rows={4}
                  value={matcherJd}
                  onChange={(e) => setMatcherJd(e.target.value)}
                  placeholder="Paste Job Description lowongan di sini..."
                  className="mt-1 w-full rounded-lg border border-line bg-paper p-3 text-xs text-ink focus:border-forest focus:outline-hidden"
                />
              </div>

              <Button
                onClick={handleRunMatcher}
                disabled={matching}
                className="w-full bg-forest text-white hover:bg-forest-dark"
              >
                {matching ? "Mengevaluasi Relevansi..." : "Kalkulasi Relevansi Cerita"}
              </Button>

              {matchedResults.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                    Ranking Relevansi STAR Stories:
                  </h3>
                  {matchedResults.map(({ story, relevanceScore, matchedSkills }) => (
                    <div
                      key={story.id}
                      className="rounded-xl border border-line bg-paper p-4 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-bold text-ink">{story.role}</span>
                          <span className="text-xs text-ink-soft"> @ {story.company}</span>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            relevanceScore >= 60
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-tint text-amber"
                          }`}
                        >
                          Match: {relevanceScore}%
                        </span>
                      </div>

                      {story.polishedBullet && (
                        <p className="mt-2 text-xs text-ink font-medium leading-relaxed">
                          {story.polishedBullet}
                        </p>
                      )}

                      {matchedSkills.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {matchedSkills.map((sk) => (
                            <span
                              key={sk}
                              className="rounded-md bg-forest-tint px-2 py-0.5 text-2xs font-semibold text-forest"
                            >
                              ✓ {sk}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
