import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContextValue";
import {
  getSessionCvSkills,
  saveSessionCvSkills,
  getSessionStructuredCv,
  saveSessionStructuredCv,
} from "../lib/sessionProfile";
import { Header } from "../components/Header";
import { Button } from "../components/Button";
import { SalaryBenchmarkModal } from "../components/SalaryBenchmarkModal";
import {
  getJobRecommendations,
  createApplication,
  analyzeCustomJob,
  generateRecruiterPitch,
  analyzeCv,
  type RecommendedJob,
} from "../lib/api";
import {
  Search,
  Sparkles,
  Building2,
  MapPin,
  ExternalLink,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  FileText,
  PlusCircle,
  Filter,
  Globe,
  Radio,
  BrainCircuit,
  Clock,
  Send,
  Copy,
  Check,
  X,
  Calculator,
  Upload,
  Zap,
  Rocket,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";

export function JobsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<RecommendedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState("Software");
  const [submittedKeyword, setSubmittedKeyword] = useState("Software");
  const [locationFilter, setLocationFilter] = useState<
    "all" | "indonesia" | "malaysia" | "singapore" | "australia" | "remote"
  >("all");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isPersonalized, setIsPersonalized] = useState<boolean>(false);
  const [skillsCount, setSkillsCount] = useState<number>(0);
  const [selectedBatchJobs, setSelectedBatchJobs] = useState<RecommendedJob[]>([]);

  // Smart Auto-Apply state & CV persistence
  const cvInputRef = useRef<HTMLInputElement>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [parsingCv, setParsing] = useState(false);
  const [savedCvSession, setSavedCvSession] = useState(() => {
    return getSessionStructuredCv(user?.id || "guest");
  });
  const [parsedSkills, setParsedSkills] = useState<string[]>(() => {
    const fromSession = getSessionStructuredCv(user?.id || "guest");
    if (fromSession?.cv?.skills?.length) return fromSession.cv.skills;
    return getSessionCvSkills(user?.id || "guest") || [];
  });
  const [autoApplyMinScore, setAutoApplyMinScore] = useState(50);
  const [autoApplyDone, setAutoApplyDone] = useState(false);
  const [cvPanelOpen, setCvPanelOpen] = useState(true);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [scoreBoostToast, setScoreBoostToast] = useState<string | null>(null);
  const [safeAutoApplyModalOpen, setSafeAutoApplyModalOpen] = useState(false);

  // Custom Job Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [analyzingImport, setAnalyzingImport] = useState(false);
  const [customJobResult, setCustomJobResult] = useState<any>(null);

  // Recruiter Pitch Modal state
  const [pitchJob, setPitchJob] = useState<RecommendedJob | null>(null);
  const [pitchResult, setPitchResult] = useState<{ linkedinNote: string; coldEmailSubject: string; coldEmailBody: string } | null>(null);
  const [generatingPitch, setGeneratingPitch] = useState(false);
  const [copiedInmail, setCopiedInmail] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Salary Benchmark Modal state
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const uid = user?.id || "guest";
    const sessionSkills = parsedSkills.length > 0 ? parsedSkills : getSessionCvSkills(uid);

    getJobRecommendations({
      keyword: submittedKeyword,
      location: locationFilter,
      category: activeCategory !== "All" ? activeCategory.toLowerCase() : undefined,
      skills: sessionSkills,
    })
      .then((res) => {
        if (isMounted) {
          setJobs(res.jobs);
          setIsPersonalized(Boolean(res.query?.isPersonalized));
          setSkillsCount(res.query?.skillsCount || 0);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setLoadError(err instanceof Error ? err.message : "Gagal memuat lowongan.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [submittedKeyword, locationFilter, activeCategory, user?.id, retryKey, parsedSkills]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoadError(null);
    setSubmittedKeyword(searchKeyword.trim() || "developer");
  };

  const handleOpenGoogleJobs = () => {
    const locations: Record<typeof locationFilter, string> = {
      all: "Indonesia Malaysia Singapore Australia",
      indonesia: "Indonesia",
      malaysia: "Malaysia",
      singapore: "Singapore",
      australia: "Australia",
      remote: "Remote",
    };
    const locQuery = locations[locationFilter];
    const fullQuery = `${searchKeyword || "Software Engineer"} ${locQuery}`;
    const googleJobsUrl = `https://www.google.com/search?ibp=htl;jobs&q=${encodeURIComponent(fullQuery)}`;
    window.open(googleJobsUrl, "_blank");
  };

  const handleQuickOptimize = (job: RecommendedJob) => {
    sessionStorage.removeItem("job_application_batch");
    sessionStorage.setItem(
      "target_job_description",
      `${job.title} at ${job.company}\n\nRequirements & Overview:\n${job.description}\n\nSkills: ${job.skills.join(", ")}`
    );
    navigate("/optimize");
  };

  // ─── Smart Auto-Apply & Interactive Skills Handlers ────────────────────────
  const handleCvUpload = async (file: File) => {
    setCvFile(file);
    setParsing(true);
    setAutoApplyDone(false);
    try {
      // Use a generic job description to parse the CV structure & extract skills
      const result = await analyzeCv(file, "Software Engineer / Developer");
      const skills: string[] = result.cv?.skills ?? [];
      setParsedSkills(skills);
      // Save structured CV and skills to session so optimize & jobs never ask to upload again
      const uid = user?.id ?? "guest";
      saveSessionStructuredCv(uid, result.cv, file.name);
      setSavedCvSession({ cv: result.cv, fileName: file.name, savedAt: new Date().toISOString() });
      // Re-trigger job fetch with the fresh skills
      setLoading(true);
      setRetryKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal parsing CV. Coba lagi.");
    } finally {
      setParsing(false);
    }
  };

  const handleAddSkill = (skillName: string) => {
    const trimmed = skillName.trim();
    if (!trimmed) return;
    const exists = parsedSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase());
    if (exists) return;

    const newSkills = [...parsedSkills, trimmed];
    setParsedSkills(newSkills);

    const uid = user?.id || "guest";
    saveSessionCvSkills(uid, newSkills);

    // If structured CV exists, update its skills too
    const session = getSessionStructuredCv(uid);
    if (session) {
      const updatedCv = {
        ...session.cv,
        skills: Array.from(new Set([...(session.cv.skills || []), trimmed])),
      };
      saveSessionStructuredCv(uid, updatedCv, session.fileName);
      setSavedCvSession({ ...session, cv: updatedCv });
    }

    // Instantly recalculate matchingSkills, missingSkills, and matchScore locally for all jobs
    const normCandidate = newSkills.map((s) => s.toLowerCase().trim());
    let affectedJobsCount = 0;

    setJobs((prevJobs) =>
      prevJobs.map((job) => {
        const matching: string[] = [];
        const missing: string[] = [];
        for (const js of job.skills) {
          const jsl = js.toLowerCase();
          const isMatch = normCandidate.some(
            (cs) => cs === jsl || cs.includes(jsl) || jsl.includes(cs)
          );
          if (isMatch) {
            if (!matching.includes(js)) matching.push(js);
          } else {
            if (!missing.includes(js)) missing.push(js);
          }
        }
        const newScore = job.skills.length
          ? Math.round((matching.length / job.skills.length) * 100)
          : job.matchScore;

        if (newScore !== job.matchScore) affectedJobsCount++;

        return {
          ...job,
          matchingSkills: matching.slice(0, 6),
          missingSkills: missing.slice(0, 5),
          matchScore: newScore,
        };
      })
    );

    setIsPersonalized(true);
    setSkillsCount(newSkills.length);
    setScoreBoostToast(
      `Skill "${trimmed}" ditambahkan! Persentase kesesuaian pada lowongan langsung bertambah.`
    );
    setTimeout(() => setScoreBoostToast(null), 3500);
  };

  const eligibleJobs = jobs.filter((j) => (j.matchScore ?? 0) >= autoApplyMinScore);

  const handleOpenSafeAutoApply = () => {
    if (eligibleJobs.length === 0) return;
    setSafeAutoApplyModalOpen(true);
  };

  const handleExecuteSafeAutoApply = async () => {
    setSafeAutoApplyModalOpen(false);
    setAutoApplyDone(true);
    // Open each job URL safely with delay to prevent pop-up blockers and rate-limits
    eligibleJobs.forEach((job, i) => {
      setTimeout(() => {
        window.open(job.url, "_blank", "noopener,noreferrer");
      }, i * 600);
    });
  };

  const handleToggleBatchJob = (job: RecommendedJob) => {
    const remainingCredits = user ? Math.max(0, (user.credits ?? 0) - (user.usedCredits ?? 0)) : 15;
    const maxBatchSize = Math.min(100, Math.floor(remainingCredits / 3));
    setSelectedBatchJobs((selected) => {
      if (selected.some((item) => item.id === job.id)) {
        return selected.filter((item) => item.id !== job.id);
      }
      if (selected.length >= maxBatchSize) return selected;
      return [...selected, job];
    });
  };

  const isSupportedApplicationUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") return false;
      if (
        (parsed.hostname === "boards.greenhouse.io" ||
          parsed.hostname === "job-boards.greenhouse.io") &&
        /^\/[^/]+\/jobs\/\d+/.test(parsed.pathname)
      ) {
        return true;
      }
      return parsed.hostname === "jobs.lever.co" &&
        /^\/[^/]+\/[a-f0-9-]+(?:\/apply)?\/?$/i.test(parsed.pathname);
    } catch {
      return false;
    }
  };

  const handleSelectAutoApplyJobs = () => {
    const remainingCredits = user ? Math.max(0, (user.credits ?? 0) - (user.usedCredits ?? 0)) : 15;
    const packageLimit = Math.min(100, Math.floor(remainingCredits / 3));
    const eligibleJobs = jobs
      .filter((job) => (job.matchScore ?? 0) >= 70 && isSupportedApplicationUrl(job.url))
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
      .slice(0, packageLimit);
    setSelectedBatchJobs(eligibleJobs);
  };

  const handlePrepareBatch = () => {
    if (selectedBatchJobs.length === 0) return;
    const targets = selectedBatchJobs.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      url: job.url,
      matchScore: job.matchScore,
      jobDescription: `${job.title} at ${job.company}\nLocation: ${job.location}\n\nJob description:\n${job.description}\n\nSkills: ${job.skills.join(", ")}`,
    }));
    sessionStorage.setItem("job_application_batch", JSON.stringify(targets));
    sessionStorage.setItem("target_job_description", targets[0].jobDescription);
    navigate("/optimize");
  };

  const handleStartInterviewForJob = (job: RecommendedJob) => {
    sessionStorage.setItem("interview_target_role", job.title);
    sessionStorage.setItem(
      "interview_target_job",
      `Posisi: ${job.title} di ${job.company}\nKeahlian Utama: ${job.skills.join(", ")}\nKonteks: ${job.description}`
    );
    navigate("/interview");
  };

  const handleSaveToTracker = async (job: RecommendedJob) => {
    setSavingId(job.id);
    try {
      await createApplication({
        company: job.company,
        position: job.title,
        jobUrl: job.url,
        matchScore: job.matchScore,
        status: "applied",
        notes: `Sumber: ${job.source}. Lokasi: ${job.location}. Gaji: ${job.salary || "N/A"}`,
      });
      alert(`Berhasil menyimpan "${job.title} di ${job.company}" ke Tracker Lamaran!`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan ke tracker");
    } finally {
      setSavingId(null);
    }
  };

  // Analyze Custom Job from Google / LinkedIn
  const handleAnalyzeCustomJob = async () => {
    if (!importText.trim()) return;
    setAnalyzingImport(true);
    try {
      let sessionSkills: string[] | undefined;
      if (user?.id) sessionSkills = getSessionCvSkills(user.id);

      const result = await analyzeCustomJob({
        jobText: importText,
        candidateSkills: sessionSkills,
      });
      setCustomJobResult(result);
    } catch (err: any) {
      alert(err.message || "Gagal menganalisis lowongan");
    } finally {
      setAnalyzingImport(false);
    }
  };

  // Generate Recruiter Pitch
  const handleOpenPitchModal = async (job: RecommendedJob) => {
    setPitchJob(job);
    setGeneratingPitch(true);
    setPitchResult(null);

    const sessionSkills = user?.id ? getSessionCvSkills(user.id) ?? [] : [];

    try {
      const pitch = await generateRecruiterPitch({
        candidateName: user?.name || "Kandidat",
        targetRole: job.title,
        targetCompany: job.company,
        candidateSkills: sessionSkills,
      });
      setPitchResult(pitch);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingPitch(false);
    }
  };

  const categories = ["All", "Frontend", "Backend", "Full Stack", "Data", "DevOps", "Mobile"];
  const remainingBatchTasks = user ? Math.max(0, (user.credits ?? 0) - (user.usedCredits ?? 0)) : 15;
  const availableBatchPackages = Math.max(1, Math.floor(remainingBatchTasks / 3));
  const autoApplyEligibleCount = jobs.filter(
    (job) => (job.matchScore ?? 0) >= 70 && isSupportedApplicationUrl(job.url)
  ).length;

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-6 py-8 flex-1">

        {/* ── SMART AUTO-APPLY PANEL ─────────────────────────────────────── */}
        <div className="mb-6 rounded-2xl border-2 border-forest/30 bg-gradient-to-br from-forest/5 via-paper-raised to-emerald-50/40 shadow-lg overflow-hidden">
          {/* Header row */}
          <div
            className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
            onClick={() => setCvPanelOpen((o) => !o)}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest text-white shadow">
                <Rocket className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-sm text-ink">
                  {parsedSkills.length > 0
                    ? `CV Terdeteksi · ${parsedSkills.length} skill · ${eligibleJobs.length} loker cocok`
                    : "Smart Auto-Apply — Upload CV, Langsung Lamar Semua"}
                </p>
                <p className="text-[11px] text-ink-soft">
                  {parsedSkills.length > 0
                    ? `Siap melamar ${eligibleJobs.length} loker dengan match ≥${autoApplyMinScore}%`
                    : "AI baca CV kamu, pilih loker terbaik, buka semua link lamaran sekaligus"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {parsedSkills.length > 0 && eligibleJobs.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleOpenSafeAutoApply(); }}
                  className="flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white shadow hover:bg-forest-dark transition-all cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Lamar Semua ({eligibleJobs.length})
                </button>
              )}
              {cvPanelOpen ? <ChevronUp className="h-4 w-4 text-ink-soft" /> : <ChevronDown className="h-4 w-4 text-ink-soft" />}
            </div>
          </div>

          {/* Expandable body */}
          {cvPanelOpen && (
            <div className="border-t border-forest/10 px-5 pb-5 pt-4 space-y-4">
              {/* Step 1: Upload */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div
                  className={`flex-1 rounded-xl border-2 border-dashed p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                    cvFile ? "border-forest/60 bg-forest/5" : "border-line hover:border-forest/40 bg-paper"
                  }`}
                  onClick={() => cvInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) handleCvUpload(f);
                  }}
                >
                  <input
                    ref={cvInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCvUpload(f); }}
                  />
                  {parsingCv ? (
                    <>
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-forest border-r-transparent" />
                      <p className="text-xs font-semibold text-forest">AI sedang membaca CV kamu...</p>
                    </>
                  ) : cvFile || savedCvSession ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-forest" />
                      <p className="text-xs font-semibold text-forest">
                        {cvFile?.name ||
                          savedCvSession?.fileName ||
                          (savedCvSession?.cv?.personalInfo?.name
                            ? `${savedCvSession.cv.personalInfo.name} CV`
                            : "CV Terdeteksi")}
                      </p>
                      <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-bold text-forest">
                        {parsedSkills.length} skill aktif terhubung
                      </span>
                      <p className="text-[10px] text-ink-soft underline mt-0.5">
                        Klik untuk upload file CV baru
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-ink-soft" />
                      <p className="text-xs font-semibold text-ink">Upload CV kamu (PDF / DOCX)</p>
                      <p className="text-[10px] text-ink-soft">Drag & drop atau klik di sini</p>
                    </>
                  )}
                </div>

                {parsedSkills.length > 0 && (
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-ink uppercase tracking-wide">
                        Skill aktif di CV ({parsedSkills.length}):
                      </p>
                      <span className="text-[10px] text-ink-soft">Klik loker di bawah untuk tambah skill</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {parsedSkills.map((sk) => (
                        <span
                          key={sk}
                          className="rounded-full bg-forest/10 border border-forest/30 px-2.5 py-0.5 text-[11px] font-semibold text-forest"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>

                    {/* Quick Manual Add Input */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (newSkillInput.trim()) {
                          handleAddSkill(newSkillInput.trim());
                          setNewSkillInput("");
                        }
                      }}
                      className="mt-2.5 flex items-center gap-1.5"
                    >
                      <input
                        type="text"
                        value={newSkillInput}
                        onChange={(e) => setNewSkillInput(e.target.value)}
                        placeholder="+ Ketik skill manual (misal: Docker, Next.js, Golang)..."
                        className="flex-1 rounded-lg border border-line bg-paper px-2.5 py-1 text-xs text-ink placeholder:text-ink-soft/60 focus:border-forest focus:outline-hidden"
                      />
                      <button
                        type="submit"
                        disabled={!newSkillInput.trim()}
                        className="rounded-lg bg-forest px-3 py-1 text-xs font-bold text-white hover:bg-forest-dark disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
                      >
                        + Tambah
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Toast for real-time score boost feedback */}
              {scoreBoostToast && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-300 px-4 py-2 text-xs font-bold text-emerald-900 shadow-xs animate-pulse">
                  <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{scoreBoostToast}</span>
                </div>
              )}

              {/* Step 2: Config & Launch */}
              {parsedSkills.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl bg-white/60 border border-forest/20 px-4 py-3">
                  <div className="flex items-center gap-3 flex-1">
                    <label className="text-xs font-semibold text-ink-soft whitespace-nowrap">Min. match:</label>
                    <input
                      type="range"
                      min={30}
                      max={90}
                      step={10}
                      value={autoApplyMinScore}
                      onChange={(e) => setAutoApplyMinScore(Number(e.target.value))}
                      className="flex-1 accent-forest"
                    />
                    <span className="text-sm font-bold text-forest w-10 text-right">{autoApplyMinScore}%</span>
                  </div>

                  <button
                    onClick={handleOpenSafeAutoApply}
                    disabled={eligibleJobs.length === 0}
                    className="flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-forest-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <Zap className="h-4 w-4" />
                    Lamar {eligibleJobs.length} Loker Sekaligus (Aman)
                  </button>
                </div>
              )}

              {autoApplyDone && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-300 px-4 py-3 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>Berhasil!</strong> {eligibleJobs.length} portal lamaran resmi dibuka dengan jeda aman.
                    Untuk peluang interview lebih tinggi, buat CV tailored khusus per loker di{" "}
                    <button onClick={() => navigate("/optimize")} className="underline font-bold">
                      halaman Optimize
                    </button>.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Banner Hero */}
        <div className="rounded-2xl border border-line bg-gradient-to-r from-forest-tint via-paper-raised to-paper-raised p-6 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-forest">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Lowongan yang Dicocokkan dengan CV
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSalaryModalOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink border border-line hover:border-forest/50 transition-all cursor-pointer"
              >
                <Calculator className="h-3.5 w-3.5 text-forest" />
                <span>Kalkulator Gaji Tech</span>
              </button>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-forest px-3.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-forest-dark transition-all cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>+ Impor Loker dari Google / LinkedIn</span>
              </button>
            </div>
          </div>

          <h1 className="mt-2 font-serif text-2xl font-bold text-ink sm:text-3xl">
            Lowongan Kerja dari Berbagai Sumber
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-ink-soft leading-relaxed">
            Urutkan hingga 100 lowongan berdasarkan skill CV. Indikasi sponsorship hanya ditampilkan jika tertulis jelas di deskripsi; verifikasi lagi di situs perusahaan.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-ink-soft" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Cari posisi atau keahlian (misal: React, Node.js, Python, Golang, DevOps)..."
                className="w-full rounded-lg border border-line bg-paper-raised pl-10 pr-4 py-2.5 text-xs text-ink placeholder:text-ink-soft/50 shadow-xs focus:border-forest focus:outline-none"
              />
            </div>
            <Button type="submit" className="gap-2 text-xs py-2.5 px-5">
              <Search className="h-3.5 w-3.5" />
              Cari Lowongan
            </Button>

            <button
              type="button"
              onClick={handleOpenGoogleJobs}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-400 bg-blue-50/80 px-4 py-2.5 text-xs font-bold text-blue-900 hover:bg-blue-100 transition-all cursor-pointer"
              title="Buka pencarian live di Google Jobs engine"
            >
              <Globe className="h-4 w-4 text-blue-700" />
              <span>Jelajahi di Google Jobs ↗</span>
            </button>
          </form>

          {/* Location & Category Filters */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-line">
            {/* Location Selector */}
            <div className="flex flex-wrap items-center gap-1.5 bg-paper p-1 rounded-lg border border-line">
              {[
                { id: "all", label: "Semua Target", icon: Globe },
                { id: "indonesia", label: "Indonesia", icon: MapPin },
                { id: "malaysia", label: "Malaysia", icon: MapPin },
                { id: "singapore", label: "Singapura", icon: MapPin },
                { id: "australia", label: "Australia", icon: MapPin },
                { id: "remote", label: "Remote", icon: Radio },
              ].map((loc) => {
                const Icon = loc.icon;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      setLoadError(null);
                      setLocationFilter(loc.id as typeof locationFilter);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      locationFilter === loc.id
                        ? "bg-forest text-white shadow-xs"
                        : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{loc.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-ink-soft text-[11px] font-medium mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Stack:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setLoading(true);
                    setLoadError(null);
                    setActiveCategory(cat);
                  }}
                  className={`rounded-full px-3 py-1 text-[11px] transition-all cursor-pointer ${
                    activeCategory === cat
                      ? "bg-forest-tint text-forest font-bold border border-forest/40 shadow-xs"
                      : "border border-line bg-paper-raised text-ink-soft hover:text-ink hover:border-forest/40"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <p className="basis-full text-[11px] leading-relaxed text-ink-soft">
              Lowongan negara: Indonesia memakai Kalibrr; Malaysia, Singapura, dan Australia perlu Jooble API key opsional. Status visa dibaca dari teks lowongan—“belum disebut” bukan berarti sponsorship tersedia.
            </p>
          </div>
        </div>

        {/* Status / Personalization Banner */}
        <div className="mt-6">
          {isPersonalized ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50/80 px-4 py-3 text-xs text-emerald-900 shadow-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Perbandingan skill aktif:</strong> Skor menunjukkan proporsi skill pada deskripsi lowongan yang cocok dengan <strong>{skillsCount} keahlian</strong> yang terdeteksi dari CV Anda. Ini bukan probabilitas diterima.
              </span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-300/80 bg-amber-50/70 px-4 py-3 text-xs text-amber-950 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Belum dipersonalisasi:</strong> Lowongan ditampilkan tanpa skor kecocokan sampai kamu menganalisis CV.
                </span>
              </div>
              <button
                onClick={() => navigate("/optimize")}
                className="whitespace-nowrap font-bold text-forest hover:underline"
              >
                Upload CV untuk Skor Personal →
              </button>
            </div>
          )}
        </div>

        {/* Jobs Grid */}
        <div className="mt-8">
            {jobs.length > 0 && (
              <div className="mb-5 flex flex-col gap-3 rounded-xl border border-forest/20 bg-forest-tint/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">
                    Siapkan paket lamaran untuk beberapa lowongan sekaligus
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {user
                      ? `Sisa ${remainingBatchTasks} task AI, cukup untuk ${availableBatchPackages} paket. Satu paket memakai 3 task (analisis CV, CV tailored, cover letter).${availableBatchPackages === 0 ? " Kuota perlu minimal 3 task untuk memilih lowongan." : ""}`
                      : `Mode Tamu (Guest): Kamu bisa memilih hingga ${availableBatchPackages} lowongan untuk langsung disiapkan paket lamarannya di halaman Optimize.`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedBatchJobs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedBatchJobs([])}
                      className="rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink-soft hover:text-ink"
                    >
                      Hapus pilihan
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSelectAutoApplyJobs}
                    disabled={
                      !isPersonalized ||
                      availableBatchPackages === 0 ||
                      autoApplyEligibleCount === 0
                    }
                    className="rounded-lg border border-forest px-4 py-2 text-xs font-bold text-forest hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
                    title="Pilih lowongan dengan skill match minimal 70% pada Greenhouse atau Lever"
                  >
                    Pilih auto-apply 70%+ ({Math.min(autoApplyEligibleCount, availableBatchPackages)})
                  </button>
                  <button
                    type="button"
                    onClick={handlePrepareBatch}
                    disabled={selectedBatchJobs.length === 0}
                    className="rounded-lg bg-forest px-4 py-2 text-xs font-bold text-white hover:bg-forest-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Siapkan {selectedBatchJobs.length || ""} paket lamaran
                  </button>
                </div>
                <p className="basis-full text-[11px] leading-relaxed text-ink-soft">
                  Auto-apply hanya memilih lowongan Greenhouse/Lever yang link-nya langsung ke form dan match skill minimal 70%. Ini skor kecocokan, bukan prediksi peluang diterima. Soal wajib, CAPTCHA, dan form yang tidak dikenali akan dilewati.
                </p>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-ink-soft">
              Menampilkan <span className="text-ink font-bold">{jobs.length}</span> dari maksimal 100 lowongan
            </p>
            <span className="text-[11px] text-ink-soft">
              {isPersonalized ? "Diurutkan berdasarkan skill CV, lalu indikasi sponsorship" : "Upload CV untuk personalisasi; sponsorship hanya berdasarkan teks"}
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-forest border-r-transparent" />
              <p className="mt-3 text-xs font-medium text-ink-soft">
                Mencari listing dari sumber lowongan...
              </p>
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-rust/30 bg-rust-tint p-8 text-center" role="alert">
              <h3 className="font-semibold text-rust">Lowongan gagal dimuat</h3>
              <p className="mt-2 text-xs text-rust">{loadError}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setLoadError(null);
                  setRetryKey((key) => key + 1);
                }}
                className="mt-4 rounded-lg bg-forest px-4 py-2 text-xs font-semibold text-white hover:bg-forest-dark"
              >
                Coba lagi
              </button>
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-xl border border-line bg-paper-raised p-12 text-center shadow-sm space-y-3">
              <Building2 className="mx-auto h-10 w-10 text-ink-soft/40" />
              <h3 className="font-serif text-base font-bold text-ink">
                Tidak ada lowongan yang sesuai filter saat ini
              </h3>
              <p className="text-xs text-ink-soft max-w-md mx-auto">
                Coba pilih negara lain atau cari lewat Google Jobs.
              </p>
              <button
                onClick={handleOpenGoogleJobs}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-blue-700 transition-all cursor-pointer"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Buka Google Jobs untuk "{searchKeyword}"</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-xl border border-line bg-paper-raised p-5 shadow-sm transition-all hover:border-forest/60 hover:shadow flex flex-col justify-between"
                >
                  <div>
                    {/* Header card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            job.source === "Kalibrr" ? "bg-blue-100 text-blue-800" :
                            job.source === "Remotive" ? "bg-purple-100 text-purple-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {job.source}
                          </span>

                          {job.remote && (
                            <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 border border-teal-200">
                              Remote
                            </span>
                          )}

                          <span
                            className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
                              job.visaSponsorship === "available"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : job.visaSponsorship === "unavailable"
                                  ? "border-rose-200 bg-rose-50 text-rose-700"
                                  : "border-line bg-paper text-ink-soft"
                            }`}
                            title="Deteksi berdasarkan teks deskripsi, bukan konfirmasi dari perusahaan."
                          >
                            {job.visaSponsorship === "available"
                              ? "Sponsorship disebut"
                              : job.visaSponsorship === "unavailable"
                                ? "Tidak sponsorship"
                                : "Visa belum disebut"}
                          </span>

                          {job.postedAt && (
                            <span className="text-[10px] text-ink-soft flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {job.postedAt}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-2 font-serif text-base font-bold text-ink leading-snug">
                          {job.title}
                        </h3>

                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                          <span className="flex items-center gap-1 font-semibold text-ink">
                            <Building2 className="h-3.5 w-3.5 text-ink-soft" />
                            {job.company}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-ink-soft" />
                            {job.location}
                          </span>
                        </div>
                      </div>

                      {job.matchScore != null && (
                        <div className="shrink-0 rounded-lg bg-forest-tint px-2.5 py-1 text-xs font-bold text-forest">
                          {job.matchScore}% skill cocok
                        </div>
                      )}
                    </div>

                    {/* Salary & Response Rate */}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                      {job.salary && (
                        <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <DollarSign className="h-3.5 w-3.5" />
                          {job.salary}
                        </span>
                      )}
                    </div>

                    {/* Description preview */}
                    <p className="mt-2 text-xs text-ink-soft line-clamp-3 leading-relaxed">
                      {job.description}
                    </p>

                    {/* Matching & Missing Skills */}
                    <div className="mt-3.5 space-y-2 border-t border-line/60 pt-3">
                      {job.matchingSkills && job.matchingSkills.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-emerald-700">Cocok:</span>
                          {job.matchingSkills.map((sk, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 border border-emerald-200"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}

                      {job.missingSkills && job.missingSkills.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-amber-800">
                            Perlu dipelajari:
                          </span>
                          {job.missingSkills.map((sk, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleAddSkill(sk)}
                              title={`Klik untuk menambahkan "${sk}" ke CV Anda — skor kecocokan langsung bertambah!`}
                              className="group inline-flex items-center gap-1 rounded bg-amber-50 hover:bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-amber-900 hover:text-emerald-900 border border-amber-200 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                            >
                              <span>{sk}</span>
                              <span className="text-[9px] font-bold text-emerald-700 bg-white/80 px-1 rounded opacity-80 group-hover:opacity-100">
                                + Tambah
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 border-t border-line pt-3.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleStartInterviewForJob(job)}
                        className="flex items-center gap-1 rounded-lg bg-forest-tint px-2.5 py-1.5 text-xs font-semibold text-forest hover:bg-forest hover:text-white transition-all cursor-pointer"
                        title="Latihan wawancara AI untuk posisi ini"
                      >
                        <BrainCircuit className="h-3.5 w-3.5" />
                        <span>Latihan Wawancara</span>
                      </button>

                      <button
                        onClick={() => handleOpenPitchModal(job)}
                        className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/60 px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 transition-all cursor-pointer"
                        title="Generator pesan LinkedIn InMail & Cold Email ke HR"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Chat HR</span>
                      </button>

                      <button
                        onClick={() => handleQuickOptimize(job)}
                        className="flex items-center gap-1 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink hover:border-forest hover:text-forest transition-colors cursor-pointer"
                        title="Sesuaikan CV untuk lowongan ini"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Optimasi CV</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleBatchJob(job)}
                        disabled={
                          !selectedBatchJobs.some((item) => item.id === job.id) &&
                          selectedBatchJobs.length >= availableBatchPackages
                        }
                        className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          selectedBatchJobs.some((item) => item.id === job.id)
                            ? "border-forest bg-forest text-white"
                            : "border-line bg-paper text-ink-soft hover:border-forest/40 hover:text-forest"
                        }`}
                        title="Masukkan ke batch optimasi CV dan surat lamaran"
                      >
                        {selectedBatchJobs.some((item) => item.id === job.id) ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <PlusCircle className="h-3.5 w-3.5" />
                        )}
                        <span>{selectedBatchJobs.some((item) => item.id === job.id) ? "Dipilih" : "Pilih batch"}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveToTracker(job)}
                        disabled={savingId === job.id}
                        className="flex items-center gap-1 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:text-ink hover:border-forest/40 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Simpan ke tracker lamaran"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>{savingId === job.id ? "Menyimpan..." : "Track"}</span>
                      </button>

                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-forest-dark transition-all"
                      >
                        <span>Lamar</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: IMPORT CUSTOM JOB FROM GOOGLE / LINKEDIN */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl border border-line bg-paper-raised p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-forest" />
                <h3 className="font-serif text-lg font-bold text-ink">
                  Impor & Analisis Loker (Google / LinkedIn / Portal Apapun)
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setCustomJobResult(null);
                }}
                className="rounded-lg p-1.5 text-ink-soft hover:bg-paper hover:text-ink cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-ink-soft">
              Temukan lowongan di Google Jobs, LinkedIn, atau Glints? Salin dan tempelkan teks deskripsi pekerjaan di bawah. AI akan membedah kualifikasi dan menghitung skor ATS Anda dalam 5 detik!
            </p>

            <div>
              <label className="block text-xs font-bold text-ink uppercase mb-1">
                Teks / Deskripsi Lowongan Pekerjaan
              </label>
              <textarea
                rows={5}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Tempelkan judul posisi, nama perusahaan, dan deskripsi/persyaratan pekerjaan di sini..."
                className="w-full rounded-xl border border-line bg-paper p-3 text-xs text-ink outline-none focus:border-forest leading-relaxed"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleAnalyzeCustomJob}
                disabled={analyzingImport || !importText.trim()}
                className="flex items-center gap-2 rounded-xl bg-forest px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-forest-dark disabled:opacity-50 cursor-pointer"
              >
                {analyzingImport ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    <span>AI Menganalisis Loker...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Ekstrak Keahlian dari Loker</span>
                  </>
                )}
              </button>
            </div>

            {/* Custom Analysis Result */}
            {customJobResult && (
              <div className="rounded-xl border border-forest/30 bg-forest-tint/30 p-4 space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-serif text-base font-bold text-ink">{customJobResult.title}</h4>
                    <p className="text-xs text-ink-soft">{customJobResult.company} • {customJobResult.location}</p>
                  </div>
                  <span className="rounded-lg bg-forest px-3 py-1 text-sm font-bold text-white shadow-xs">
                    {customJobResult.matchScore == null
                      ? "Analisis CV untuk melihat kecocokan"
                      : `${customJobResult.matchScore}% skill cocok`}
                  </span>
                </div>

                {customJobResult.matchScore == null ? (
                  <p className="text-xs text-ink-soft">
                    Keahlian dari lowongan sudah diekstrak. Analisis CV terlebih dahulu untuk membandingkannya dengan profilmu.
                  </p>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-emerald-700 font-bold">Keahlian Cocok:</span>
                      {customJobResult.matchingSkills.map((s: string, i: number) => (
                        <span key={i} className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-900">
                          {s}
                        </span>
                      ))}
                    </div>

                    {customJobResult.missingSkills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-amber-800 font-bold">Belum Ada di CV:</span>
                        {customJobResult.missingSkills.map((s: string, i: number) => (
                          <span key={i} className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-forest/20 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      sessionStorage.setItem("target_job_description", importText);
                      navigate("/optimize");
                    }}
                    className="flex items-center gap-1 rounded-lg bg-forest px-4 py-2 text-xs font-bold text-white hover:bg-forest-dark"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Optimasi CV untuk Loker Ini</span>
                  </button>

                  <button
                    onClick={() => {
                      sessionStorage.setItem("interview_target_role", customJobResult.title);
                      sessionStorage.setItem("interview_target_job", importText);
                      navigate("/interview");
                    }}
                    className="flex items-center gap-1 rounded-lg border border-forest bg-paper px-4 py-2 text-xs font-bold text-forest hover:bg-forest-tint"
                  >
                    <BrainCircuit className="h-3.5 w-3.5" />
                    <span>Latihan Wawancara AI</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: RECRUITER PITCH & COLD EMAIL GENERATOR */}
      {pitchJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl border border-line bg-paper-raised p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-700" />
                <h3 className="font-serif text-lg font-bold text-ink">
                  Generator Pesan Outreach HR ({pitchJob.company})
                </h3>
              </div>
              <button
                onClick={() => setPitchJob(null)}
                className="rounded-lg p-1.5 text-ink-soft hover:bg-paper hover:text-ink cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-ink-soft">
              Gunakan template di bawah untuk mengirim pesan langsung ke HR / Hiring Manager di LinkedIn atau email agar lamaran Anda mendapat perhatian prioritas.
            </p>

            {generatingPitch ? (
              <div className="py-12 text-center text-xs text-ink-soft">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-forest border-r-transparent mb-2" />
                <p>AI Sedang Meracik Pesan Outreach Tertarget...</p>
              </div>
            ) : pitchResult && (
              <div className="space-y-4">
                {/* LinkedIn InMail Note */}
                <div className="rounded-xl border border-line bg-paper p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink flex items-center gap-1">
                      <span className="rounded bg-blue-100 text-blue-800 px-1.5 py-0.2 text-[10px] font-bold">LinkedIn</span>
                      Connection Request Note (&lt;300 Karakter):
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(pitchResult.linkedinNote);
                        setCopiedInmail(true);
                        setTimeout(() => setCopiedInmail(false), 2000);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-forest hover:underline"
                    >
                      {copiedInmail ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedInmail ? "Tersalin!" : "Salin Note"}</span>
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs text-ink font-sans leading-relaxed bg-paper-raised p-3 rounded border border-line">
                    {pitchResult.linkedinNote}
                  </pre>
                </div>

                {/* Cold Email */}
                <div className="rounded-xl border border-line bg-paper p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink flex items-center gap-1">
                      <span className="rounded bg-purple-100 text-purple-800 px-1.5 py-0.2 text-[10px] font-bold">Email</span>
                      Cold Email ke Hiring Manager:
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${pitchResult.coldEmailSubject}\n\n${pitchResult.coldEmailBody}`);
                        setCopiedEmail(true);
                        setTimeout(() => setCopiedEmail(false), 2000);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-forest hover:underline"
                    >
                      {copiedEmail ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedEmail ? "Tersalin!" : "Salin Email"}</span>
                    </button>
                  </div>
                  <p className="text-xs font-bold text-ink bg-paper-raised p-2 rounded">
                    Subjek: {pitchResult.coldEmailSubject}
                  </p>
                  <pre className="whitespace-pre-wrap text-xs text-ink-soft font-sans leading-relaxed bg-paper-raised p-3 rounded max-h-48 overflow-y-auto">
                    {pitchResult.coldEmailBody}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-line">
              <button
                onClick={() => setPitchJob(null)}
                className="rounded-xl bg-forest px-5 py-2 text-xs font-bold text-white hover:bg-forest-dark cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Auto-Apply Confirmation Modal */}
      {safeAutoApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-line bg-paper-raised p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest text-white shadow-xs">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-ink">
                    Auto-Apply Aman & Terverifikasi
                  </h3>
                  <p className="text-xs text-ink-soft">
                    {eligibleJobs.length} loker terpilih dengan match &ge;{autoApplyMinScore}%
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSafeAutoApplyModalOpen(false)}
                className="rounded-lg p-1.5 text-ink-soft hover:bg-paper hover:text-ink cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 rounded-xl bg-forest-tint/50 border border-forest/20 p-4 text-xs text-ink leading-relaxed">
              <p className="font-bold text-forest-dark flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-forest" />
                Mengapa Auto-Apply ini 100% Aman?
              </p>
              <ul className="space-y-2 text-ink-soft pl-1">
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-forest mt-1.5 shrink-0" />
                  <span>
                    <strong>Anti-Spam & Jeda Terkontrol:</strong> Dibuka bertahap dengan jeda 600ms antar link agar tidak memicu pop-up blocker browser atau rate-limit dari server rekruter.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-forest mt-1.5 shrink-0" />
                  <span>
                    <strong>Hanya Portal Resmi Perusahaan:</strong> Link langsung mengarah ke halaman rekrutmen resmi (Greenhouse, Lever, Kalibrr, Remotive), bukan form pihak ketiga yang mencurigakan.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-forest mt-1.5 shrink-0" />
                  <span>
                    <strong>Kandidat Memegang Kendali (Human-in-the-Loop):</strong> Form lamaran akan dibuka untuk Anda review sebelum submit final, sehingga Anda terhindar dari salah kirim atau blacklist otomatis oleh ATS.
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setSafeAutoApplyModalOpen(false)}
                className="rounded-xl border border-line bg-paper px-4 py-2 text-xs font-semibold text-ink-soft hover:text-ink cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleExecuteSafeAutoApply}
                className="flex items-center gap-1.5 rounded-xl bg-forest px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-forest-dark transition-all cursor-pointer"
              >
                <Zap className="h-4 w-4" />
                <span>Buka {eligibleJobs.length} Portal Lamaran Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Salary Benchmark Modal */}
      <SalaryBenchmarkModal
        isOpen={salaryModalOpen}
        onClose={() => setSalaryModalOpen(false)}
      />
    </div>
  );
}
