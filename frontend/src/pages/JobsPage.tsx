import { useEffect, useRef, useState, useCallback } from "react";
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
import { JobImporterModal } from "../components/JobImporterModal";
import {
  getJobRecommendations,
  createApplication,
  analyzeCustomJob,
  generateRecruiterPitch,
  analyzeCv,
  getSavedJobs,
  saveJob,
  removeSavedJob,
  type RecommendedJob,
  type ImportedJob,
  type JobSourceStatus,
  type SavedJob,
} from "../lib/api";
import {
  Search,
  Sparkles,
  Building2,
  MapPin,
  ExternalLink,
  DollarSign,
  CheckCircle2,
  FileText,
  PlusCircle,
  Filter,
  Globe,
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
  Link2,
} from "lucide-react";

function getPostingAgeDays(postedAtDate?: string): number | undefined {
  if (!postedAtDate) return undefined;
  const timestamp = Date.parse(postedAtDate);
  if (Number.isNaN(timestamp) || timestamp > Date.now() + 24 * 60 * 60 * 1000) {
    return undefined;
  }
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

function isPostingDateStale(postedAtDate?: string): boolean {
  const ageDays = getPostingAgeDays(postedAtDate);
  return ageDays !== undefined && ageDays > 30;
}

function getApplicationDeadlineLabel(deadline?: string): string | undefined {
  if (!deadline) return undefined;
  const timestamp = Date.parse(deadline);
  if (Number.isNaN(timestamp)) return undefined;
  const daysRemaining = Math.ceil((timestamp - Date.now()) / 86_400_000);
  if (daysRemaining < 0) return "Deadline terlewat";
  if (daysRemaining === 0) return "Deadline hari ini";
  if (daysRemaining === 1) return "Deadline besok";
  return `Deadline ${new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(timestamp)} · ${daysRemaining} hari lagi`;
}

function isApplicationDeadlineExpired(deadline?: string): boolean {
  const timestamp = deadline ? Date.parse(deadline) : Number.NaN;
  return Number.isFinite(timestamp) && timestamp < Date.now();
}

interface JobSearchFilters {
  company: string;
  industry: string;
  locationQuery: string;
  experienceLevel: NonNullable<RecommendedJob["experienceLevel"]> | "";
  employmentType: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  salaryPeriod: "hourly" | "monthly" | "annual";
}

const EMPTY_JOB_SEARCH_FILTERS: JobSearchFilters = {
  company: "",
  industry: "",
  locationQuery: "",
  experienceLevel: "",
  employmentType: "",
  salaryMin: "",
  salaryMax: "",
  salaryCurrency: "IDR",
  salaryPeriod: "monthly",
};

export function JobsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<RecommendedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [jobSources, setJobSources] = useState<JobSourceStatus[]>([]);
  const [retryKey, setRetryKey] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [locationFilter, setLocationFilter] = useState<
    "all" | "indonesia" | "malaysia" | "singapore" | "australia" | "remote"
  >("indonesia");
  const [searchFilters, setSearchFilters] = useState<JobSearchFilters>(EMPTY_JOB_SEARCH_FILTERS);
  const [appliedSearchFilters, setAppliedSearchFilters] = useState<JobSearchFilters>(EMPTY_JOB_SEARCH_FILTERS);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isPersonalized, setIsPersonalized] = useState<boolean>(false);
  const [selectedBatchJobs, setSelectedBatchJobs] = useState<RecommendedJob[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [savedJobsLoading, setSavedJobsLoading] = useState(false);
  const [savedJobsError, setSavedJobsError] = useState<string | null>(null);
  const [showSavedJobs, setShowSavedJobs] = useState(false);

  // Job preparation and CV persistence
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
  const [cvPanelOpen, setCvPanelOpen] = useState(false);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [scoreBoostToast, setScoreBoostToast] = useState<string | null>(null);

  // Custom Job Import Modal state (original panel)
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

  // ── Job Importer Modal ─────────────────────────────────────────────────────
  const [jobImporterOpen, setJobImporterOpen] = useState(false);

  const handleJobImported = useCallback((job: ImportedJob) => {
    sessionStorage.setItem("target_job", JSON.stringify({
      position: job.position,
      company: job.company,
      jobDescription: job.jobDescription,
      jobUrl: job.sourceUrl,
      source: "Impor manual",
    }));
    sessionStorage.setItem("imported_job", JSON.stringify({
      company: job.company,
      position: job.position,
      jobDescription: job.jobDescription,
      sourceUrl: job.sourceUrl,
      skills: job.skills,
    }));
    navigate("/optimize?from=importer");
  }, [navigate]);

  const handleSaveImportedToTracker = useCallback(async (job: ImportedJob) => {
    try {
      await createApplication({
        company: job.company,
        position: job.position,
        jobDescription: job.jobDescription,
        jobUrl: job.sourceUrl || undefined,
        status: "saved",
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal menyimpan lowongan ke tracker.");
    }
  }, []);


  useEffect(() => {
    let isMounted = true;
    const uid = user?.id || "guest";
    const sessionSkills = parsedSkills.length > 0 ? parsedSkills : getSessionCvSkills(uid);

    getJobRecommendations({
      keyword: submittedKeyword,
      location: locationFilter,
      skills: sessionSkills,
      company: appliedSearchFilters.company,
      industry: appliedSearchFilters.industry,
      locationQuery: appliedSearchFilters.locationQuery,
      experienceLevel: appliedSearchFilters.experienceLevel || undefined,
      employmentType: appliedSearchFilters.employmentType,
      salaryMin: appliedSearchFilters.salaryMin ? Number(appliedSearchFilters.salaryMin) : undefined,
      salaryMax: appliedSearchFilters.salaryMax ? Number(appliedSearchFilters.salaryMax) : undefined,
      salaryCurrency: appliedSearchFilters.salaryCurrency,
      salaryPeriod: appliedSearchFilters.salaryPeriod,
    })
      .then((res) => {
        if (isMounted) {
          setJobs(res.jobs);
          setJobSources(res.sources ?? []);
          setIsPersonalized(Boolean(res.query?.isPersonalized));
        }
      })
      .catch((err) => {
        if (isMounted) {
          setJobSources([]);
          setLoadError(err instanceof Error ? err.message : "Gagal memuat lowongan.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [submittedKeyword, locationFilter, user?.id, retryKey, parsedSkills, appliedSearchFilters]);

  useEffect(() => {
    if (!user?.id) {
      setSavedJobs([]);
      setSavedJobsError(null);
      return;
    }

    let active = true;
    setSavedJobsLoading(true);
    getSavedJobs()
      .then((jobs) => {
        if (active) {
          setSavedJobs(jobs);
          setSavedJobsError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setSavedJobsError(error instanceof Error ? error.message : "Gagal memuat lowongan tersimpan.");
        }
      })
      .finally(() => {
        if (active) setSavedJobsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoadError(null);
    setJobSources([]);
    const nextKeyword = searchKeyword.trim();
    setSubmittedKeyword(nextKeyword);
    setAppliedSearchFilters({ ...searchFilters });
    if (nextKeyword === submittedKeyword) {
      setRetryKey((key) => key + 1);
    }
  };

  const updateSearchFilter = <K extends keyof JobSearchFilters,>(
    key: K,
    value: JobSearchFilters[K]
  ) => {
    setSearchFilters((current) => ({ ...current, [key]: value }));
  };

  const handleOpenJobDetails = (job: RecommendedJob) => {
    sessionStorage.setItem(`job_detail:${job.id}`, JSON.stringify(job));
    navigate(`/jobs/detail?jobId=${encodeURIComponent(job.id)}`, { state: { job } });
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
    const fullQuery = `${searchKeyword || "lowongan kerja"} ${locQuery}`;
    const googleJobsUrl = `https://www.google.com/search?ibp=htl;jobs&q=${encodeURIComponent(fullQuery)}`;
    window.open(googleJobsUrl, "_blank", "noopener,noreferrer");
  };

  const handleQuickOptimize = (job: RecommendedJob) => {
    sessionStorage.removeItem("job_application_batch");
    const jobDescription = `${job.title} at ${job.company}\nLocation: ${job.location}\n\nRequirements & Overview:\n${job.description}\n\nSkills: ${job.skills.join(", ")}`;
    sessionStorage.setItem("target_job", JSON.stringify({
      position: job.title,
      company: job.company,
      jobDescription,
      jobUrl: job.url,
      source: job.source,
      location: job.location,
      salary: job.salary,
      matchScore: job.matchScore,
    }));
    sessionStorage.setItem(
      "target_job_description",
      jobDescription
    );
    navigate("/optimize");
  };

  const isSupportedApplicationUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") return false;
      if (
        (parsed.hostname === "boards.greenhouse.io" ||
          parsed.hostname === "job-boards.greenhouse.io") &&
        /^\/[^/]+\/jobs\/\d+(?:\/apply)?\/?$/i.test(parsed.pathname)
      ) {
        return true;
      }
      return parsed.hostname === "jobs.lever.co" &&
        /^\/[^/]+\/[a-f0-9-]+(?:\/apply)?\/?$/i.test(parsed.pathname);
    } catch {
      return false;
    }
  };

  // ─── Job preparation & interactive skills handlers ─────────────────────────
  const handleCvUpload = async (file: File) => {
    setCvFile(file);
    setParsing(true);
    try {
      // Use a generic job description to parse the CV structure & extract skills
      const result = await analyzeCv(
        file,
        "General professional CV. Extract all relevant experience, skills, achievements, and qualifications without assuming an industry or job title."
      );
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

        return {
          ...job,
          matchingSkills: matching.slice(0, 6),
          missingSkills: missing.slice(0, 5),
          matchScore: newScore,
        };
      })
    );

    setIsPersonalized(true);
    setScoreBoostToast(
      `Skill "${trimmed}" ditambahkan! Persentase kesesuaian pada lowongan langsung bertambah.`
    );
    setTimeout(() => setScoreBoostToast(null), 3500);
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

  const eligibleJobs = jobs.filter(
    (job) =>
      (job.matchScore ?? 0) >= autoApplyMinScore &&
      isSupportedApplicationUrl(job.url)
  );

  const handleSelectAutoApplyJobs = () => {
    const remainingCredits = user ? Math.max(0, (user.credits ?? 0) - (user.usedCredits ?? 0)) : 15;
    const packageLimit = Math.min(100, Math.floor(remainingCredits / 3));
    const selectedJobs = eligibleJobs
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
      .slice(0, packageLimit);
    setSelectedBatchJobs(selectedJobs);
  };

  const handlePrepareBatch = (jobsToPrepare: RecommendedJob[] = selectedBatchJobs) => {
    if (jobsToPrepare.length === 0) return;
    const targets = jobsToPrepare.map((job) => ({
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
    sessionStorage.setItem("target_job", JSON.stringify({
      position: targets[0].title,
      company: targets[0].company,
      jobDescription: targets[0].jobDescription,
      jobUrl: targets[0].url,
      source: jobsToPrepare[0].source,
      location: targets[0].location,
      matchScore: targets[0].matchScore,
    }));
    navigate("/optimize");
  };

  const handlePrepareAutoApplyBatch = () => {
    const remainingCredits = user
      ? Math.max(0, (user.credits ?? 0) - (user.usedCredits ?? 0))
      : 15;
    const packageLimit = Math.min(100, Math.floor(remainingCredits / 3));
    const selectedJobs = eligibleJobs
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
      .slice(0, packageLimit);
    setSelectedBatchJobs(selectedJobs);
    handlePrepareBatch(selectedJobs);
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
        jobDescription: `${job.title} at ${job.company}\nLocation: ${job.location}\n\n${job.description}`,
        jobUrl: job.url,
        matchScore: job.matchScore,
        status: "saved",
        notes: `Sumber: ${job.source}. Lokasi: ${job.location}. Gaji: ${job.salary || "N/A"}`,
      });
      alert(`Lowongan "${job.title} di ${job.company}" disimpan ke Tracker. Tandai sebagai terkirim setelah kamu benar-benar mengirim lamaran.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan ke tracker");
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleSavedJob = async (job: RecommendedJob) => {
    if (!user) {
      navigate("/login");
      return;
    }

    setSavingId(job.id);
    setSavedJobsError(null);
    try {
      const alreadySaved = savedJobs.some((savedJob) => savedJob.externalId === job.id);
      if (alreadySaved) {
        await removeSavedJob(job.id);
        setSavedJobs((current) => current.filter((savedJob) => savedJob.externalId !== job.id));
      } else {
        const savedJob = await saveJob(job);
        setSavedJobs((current) => [
          savedJob,
          ...current.filter((item) => item.externalId !== job.id),
        ]);
      }
    } catch (error) {
      setSavedJobsError(error instanceof Error ? error.message : "Gagal memperbarui lowongan tersimpan.");
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

  const suggestedRoles = [
    "Customer Service",
    "Sales",
    "Marketing",
    "Akuntansi",
    "HR",
    "Admin",
    "Operations",
    "Graphic Designer",
    "Teacher",
    "Nurse",
    "Product Manager",
    "Software Engineer",
  ];
  const remainingBatchTasks = user ? Math.max(0, (user.credits ?? 0) - (user.usedCredits ?? 0)) : 15;
  const availableBatchPackages = Math.min(100, Math.floor(remainingBatchTasks / 3));
  const allConfiguredSourcesUnavailable =
    jobSources.length > 0 &&
    jobSources.every((source) => source.status === "failed" || source.status === "not_configured");
  const visibleJobs: RecommendedJob[] = showSavedJobs
    ? savedJobs.map((job) => ({ ...job, id: job.externalId }))
    : jobs;

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-5 sm:px-6 sm:py-8">

        {/* ── JOB-APPLICATION ASSISTANT ──────────────────────────────────── */}
        <div className="order-2 mb-3 overflow-hidden rounded-xl border border-line bg-paper-raised shadow-sm">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2 px-2 py-2 sm:px-3">
            <button
              type="button"
              className="flex min-w-0 flex-1 cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-paper/70"
              aria-expanded={cvPanelOpen}
              aria-controls="job-application-assistant"
              onClick={() => setCvPanelOpen((open) => !open)}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-tint text-forest">
                  <Rocket className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink">
                    {parsedSkills.length > 0
                      ? `CV Terdeteksi · ${parsedSkills.length} skill · ${eligibleJobs.length} loker cocok`
                      : "CV opsional · aktifkan skor kecocokan"}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-soft">
                    {parsedSkills.length > 0
                      ? `${eligibleJobs.length} lowongan Greenhouse/Lever dengan match ≥${autoApplyMinScore}%`
                      : "Cari lowongan dulu, tambah CV kapan saja"}
                  </span>
                </span>
              </span>
              {cvPanelOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-ink-soft" /> : <ChevronDown className="h-4 w-4 shrink-0 text-ink-soft" />}
            </button>
            <div className="flex shrink-0 items-center gap-2">
              {parsedSkills.length > 0 && eligibleJobs.length > 0 && (
                <button
                  onClick={handlePrepareAutoApplyBatch}
                  disabled={availableBatchPackages === 0}
                  className="flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white shadow hover:bg-forest-dark transition-all cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Siapkan Materi</span>
                  <span>({Math.min(eligibleJobs.length, availableBatchPackages)})</span>
                </button>
              )}
            </div>
          </div>

          {/* Expandable body */}
          {cvPanelOpen && (
            <div id="job-application-assistant" className="space-y-4 border-t border-line px-4 pb-5 pt-4 sm:px-5">
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
                    onClick={handlePrepareAutoApplyBatch}
                    disabled={eligibleJobs.length === 0 || availableBatchPackages === 0}
                    className="flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-forest-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <Zap className="h-4 w-4" />
                    Siapkan {Math.min(eligibleJobs.length, availableBatchPackages)} Paket Lamaran
                  </button>
                </div>
              )}

              {parsedSkills.length > 0 && eligibleJobs.length === 0 && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Belum ada lowongan Greenhouse/Lever dengan skor ini. Lowongan dari situs lain tetap bisa dibuka dan dilamar manual.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Banner Hero */}
        <section className="order-1 flex flex-col overflow-hidden rounded-2xl border border-forest/20 bg-gradient-to-br from-forest-tint/60 via-paper-raised to-paper-raised p-4 shadow-sm sm:p-6">
          <div className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-forest/20 bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-forest">
            <Sparkles className="h-3.5 w-3.5" />
            Satsetin cari kerja
          </div>
          <h1 className="font-serif text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl">
            Cari kerja yang cocok, bukan sekadar banyak.
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-soft">
            Pilih peran dan lokasi. CV opsional untuk melihat kecocokan skill.
          </p>

          {/* Search Form */}
          <form
            role="search"
            aria-label="Cari lowongan kerja"
            onSubmit={handleSearch}
            className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_190px_auto]"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-ink-soft" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Contoh: admin, perawat, software engineer"
                aria-label="Posisi atau keahlian"
                className="min-h-11 w-full rounded-xl border border-line bg-paper pl-10 pr-4 py-2.5 text-sm text-ink shadow-xs placeholder:text-ink-soft/60 focus:border-forest focus:outline-none"
              />
            </div>
            <label className="sr-only" htmlFor="job-location-filter">Filter lokasi lowongan</label>
            <select
              id="job-location-filter"
              value={locationFilter}
              onChange={(event) => {
                const nextLocation = event.target.value as typeof locationFilter;
                setLoading(true);
                setLoadError(null);
                setJobSources([]);
                setLocationFilter(nextLocation);
              }}
              className="min-h-11 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm font-medium text-ink focus:border-forest focus:outline-none"
            >
              <option value="all">Semua lokasi</option>
              <option value="indonesia">Indonesia</option>
              <option value="malaysia">Malaysia</option>
              <option value="singapore">Singapura</option>
              <option value="australia">Australia</option>
              <option value="remote">Remote</option>
            </select>
            <Button type="submit" className="gap-2 text-xs py-2.5 px-5">
              <Search className="h-3.5 w-3.5" />
              Cari Lowongan
            </Button>
          </form>

          <details className="mt-3 rounded-xl border border-line bg-paper/70 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-forest">
              Filter lanjutan: perusahaan, industri, pengalaman, tipe kerja, dan gaji
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1 text-[11px] font-semibold text-ink-soft">
                Perusahaan
                <input
                  value={searchFilters.company}
                  onChange={(event) => updateSearchFilter("company", event.target.value)}
                  maxLength={120}
                  placeholder="Nama perusahaan"
                  className="min-h-10 w-full rounded-lg border border-line bg-paper px-3 text-xs text-ink focus:border-forest focus:outline-none"
                />
              </label>
              <label className="space-y-1 text-[11px] font-semibold text-ink-soft">
                Industri
                <input
                  value={searchFilters.industry}
                  onChange={(event) => updateSearchFilter("industry", event.target.value)}
                  maxLength={120}
                  placeholder="Contoh: teknologi"
                  className="min-h-10 w-full rounded-lg border border-line bg-paper px-3 text-xs text-ink focus:border-forest focus:outline-none"
                />
              </label>
              <label className="space-y-1 text-[11px] font-semibold text-ink-soft">
                Kota / lokasi
                <input
                  value={searchFilters.locationQuery}
                  onChange={(event) => updateSearchFilter("locationQuery", event.target.value)}
                  maxLength={120}
                  placeholder="Contoh: Jakarta"
                  className="min-h-10 w-full rounded-lg border border-line bg-paper px-3 text-xs text-ink focus:border-forest focus:outline-none"
                />
              </label>
              <label className="space-y-1 text-[11px] font-semibold text-ink-soft">
                Tingkat pengalaman
                <select
                  value={searchFilters.experienceLevel}
                  onChange={(event) =>
                    updateSearchFilter(
                      "experienceLevel",
                      event.target.value as JobSearchFilters["experienceLevel"]
                    )
                  }
                  className="min-h-10 w-full rounded-lg border border-line bg-paper px-3 text-xs text-ink focus:border-forest focus:outline-none"
                >
                  <option value="">Semua tingkat</option>
                  <option value="internship">Magang</option>
                  <option value="entry">Pemula / entry-level</option>
                  <option value="mid">Menengah</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead / manajerial</option>
                </select>
              </label>
              <label className="space-y-1 text-[11px] font-semibold text-ink-soft">
                Tipe pekerjaan
                <select
                  value={searchFilters.employmentType}
                  onChange={(event) => updateSearchFilter("employmentType", event.target.value)}
                  className="min-h-10 w-full rounded-lg border border-line bg-paper px-3 text-xs text-ink focus:border-forest focus:outline-none"
                >
                  <option value="">Semua tipe</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Kontrak</option>
                  <option value="intern">Magang</option>
                  <option value="freelance">Freelance</option>
                </select>
              </label>
              <label className="space-y-1 text-[11px] font-semibold text-ink-soft">
                Gaji minimum
                <input
                  type="number"
                  min="0"
                  value={searchFilters.salaryMin}
                  onChange={(event) => updateSearchFilter("salaryMin", event.target.value)}
                  placeholder="Opsional"
                  className="min-h-10 w-full rounded-lg border border-line bg-paper px-3 text-xs text-ink focus:border-forest focus:outline-none"
                />
              </label>
              <label className="space-y-1 text-[11px] font-semibold text-ink-soft">
                Gaji maksimum
                <input
                  type="number"
                  min="0"
                  value={searchFilters.salaryMax}
                  onChange={(event) => updateSearchFilter("salaryMax", event.target.value)}
                  placeholder="Opsional"
                  className="min-h-10 w-full rounded-lg border border-line bg-paper px-3 text-xs text-ink focus:border-forest focus:outline-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-[11px] font-semibold text-ink-soft">
                  Mata uang
                  <select
                    value={searchFilters.salaryCurrency}
                    onChange={(event) => updateSearchFilter("salaryCurrency", event.target.value)}
                    className="min-h-10 w-full rounded-lg border border-line bg-paper px-2 text-xs text-ink focus:border-forest focus:outline-none"
                  >
                    <option value="IDR">IDR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="AUD">AUD</option>
                    <option value="SGD">SGD</option>
                    <option value="MYR">MYR</option>
                  </select>
                </label>
                <label className="space-y-1 text-[11px] font-semibold text-ink-soft">
                  Periode
                  <select
                    value={searchFilters.salaryPeriod}
                    onChange={(event) =>
                      updateSearchFilter(
                        "salaryPeriod",
                        event.target.value as JobSearchFilters["salaryPeriod"]
                      )
                    }
                    className="min-h-10 w-full rounded-lg border border-line bg-paper px-2 text-xs text-ink focus:border-forest focus:outline-none"
                  >
                    <option value="monthly">Bulanan</option>
                    <option value="annual">Tahunan</option>
                    <option value="hourly">Per jam</option>
                  </select>
                </label>
              </div>
              <p className="text-[10px] leading-relaxed text-ink-soft sm:col-span-2 lg:col-span-4">
                Filter gaji hanya mencocokkan data dengan mata uang dan periode yang jelas dari sumber. Lowongan tanpa informasi gaji terstruktur tidak ditampilkan saat rentang gaji diisi.
              </p>
            </div>
          </details>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-soft">
              <Filter className="h-3 w-3" /> Coba:
            </span>
            {suggestedRoles.slice(0, 5).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setLoading(true);
                  setLoadError(null);
                  setJobSources([]);
                  setSearchKeyword(role);
                  setSubmittedKeyword(role);
                  if (role === submittedKeyword) {
                    setRetryKey((key) => key + 1);
                  }
                }}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  submittedKeyword.toLowerCase() === role.toLowerCase()
                    ? "border-forest/40 bg-forest text-white"
                    : "border-line bg-paper-raised text-ink-soft hover:border-forest/40 hover:text-ink"
                }`}
              >
                {role}
              </button>
            ))}
            <button
              type="button"
              onClick={handleOpenGoogleJobs}
              className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-forest hover:bg-white/70"
              title="Buka pencarian live di Google Jobs"
            >
              <Globe className="h-3.5 w-3.5" />
              Google Jobs ↗
            </button>
          </div>

          <details className="mt-3 border-t border-line/70 pt-2.5 text-xs">
            <summary className="w-fit cursor-pointer font-semibold text-forest hover:text-forest-dark">
              Profesi lain & alat tambahan
            </summary>
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {suggestedRoles.slice(5).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      setLoadError(null);
                      setJobSources([]);
                      setSearchKeyword(role);
                      setSubmittedKeyword(role);
                      if (role === submittedKeyword) {
                        setRetryKey((key) => key + 1);
                      }
                    }}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                      submittedKeyword.toLowerCase() === role.toLowerCase()
                        ? "border-forest/40 bg-forest text-white"
                        : "border-line bg-paper-raised text-ink-soft hover:border-forest/40 hover:text-ink"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 border-t border-line/70 pt-3">
                <button
                  type="button"
                  onClick={() => setSalaryModalOpen(true)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink hover:border-forest/50"
                >
                  <Calculator className="h-3.5 w-3.5 text-forest" />
                  Kalkulator gaji tech
                </button>
                <button
                  id="job-importer-open"
                  type="button"
                  onClick={() => setJobImporterOpen(true)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink hover:border-forest/50"
                >
                  <Link2 className="h-3.5 w-3.5 text-forest" />
                  Impor lowongan
                </button>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink hover:border-forest/50"
                >
                  <PlusCircle className="h-3.5 w-3.5 text-forest" />
                  Analisis deskripsi
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-ink-soft">
                Indonesia memakai Kalibrr; Malaysia, Singapura, dan Australia memerlukan Jooble API key opsional. Informasi visa hanya berdasarkan teks lowongan—“belum disebut” bukan berarti sponsorship tersedia.
              </p>
            </div>
          </details>
        </section>

        {/* Jobs Grid */}
        <div className="order-3 mt-4">
            {jobs.length > 0 && (
              <div className="mb-5 flex flex-col gap-3 rounded-xl border border-forest/20 bg-forest-tint/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">
                    Siapkan materi lamaran untuk beberapa lowongan sekaligus
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {user
                      ? `Sisa ${remainingBatchTasks} task AI, cukup untuk ${availableBatchPackages} paket. Satu paket memakai 3 task (analisis CV, CV tailored, cover letter).${availableBatchPackages === 0 ? " Kuota perlu minimal 3 task untuk memilih lowongan." : ""}`
                      : `Mode Tamu (Guest): Kamu bisa memilih hingga ${availableBatchPackages} lowongan untuk menyiapkan materi lamarannya di halaman Optimize.`}
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
                      eligibleJobs.length === 0
                    }
                    className="rounded-lg border border-forest px-4 py-2 text-xs font-bold text-forest hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
                    title={`Pilih lowongan Greenhouse/Lever dengan skill match minimal ${autoApplyMinScore}%; pengiriman tetap manual`}
                  >
                    Pilih ATS didukung ≥{autoApplyMinScore}% ({Math.min(eligibleJobs.length, availableBatchPackages)})
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrepareBatch()}
                    disabled={selectedBatchJobs.length === 0}
                    className="rounded-lg bg-forest px-4 py-2 text-xs font-bold text-white hover:bg-forest-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Siapkan {selectedBatchJobs.length || ""} paket lamaran
                  </button>
                </div>
                <p className="basis-full text-[11px] leading-relaxed text-ink-soft">
                  Asisten hanya menyiapkan materi untuk lowongan Greenhouse/Lever. Extension dapat mengisi field yang dikenali dan melampirkan CV; kamu tetap harus meninjau, melengkapi pertanyaan/CAPTCHA, lalu menekan submit sendiri. Skor match bukan prediksi diterima.
                </p>
              </div>
            )}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2" role="tablist" aria-label="Daftar lowongan">
              <button
                type="button"
                role="tab"
                aria-selected={!showSavedJobs}
                onClick={() => setShowSavedJobs(false)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${!showSavedJobs ? "bg-forest text-white" : "border border-line bg-paper-raised text-ink-soft"}`}
              >
                Rekomendasi
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={showSavedJobs}
                onClick={() => setShowSavedJobs(true)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${showSavedJobs ? "bg-forest text-white" : "border border-line bg-paper-raised text-ink-soft"}`}
              >
                Tersimpan ({savedJobs.length})
              </button>
            </div>
            <p className="text-xs font-semibold text-ink-soft">
              Menampilkan <span className="text-ink font-bold">{visibleJobs.length}</span>{showSavedJobs ? " lowongan tersimpan" : " dari maksimal 100 lowongan"}
            </p>
            <span className="text-[11px] text-ink-soft">
              {!showSavedJobs && isPersonalized
                ? "Urut berdasarkan skill CV · status visa dari teks"
                : !showSavedJobs ? "CV opsional untuk skor skill · status visa dari teks" : ""}
            </span>
          </div>
          {savedJobsError && (
            <p className="mb-3 rounded-lg border border-rust/30 bg-rust-tint px-3 py-2 text-xs text-rust" role="alert">
              {savedJobsError}
            </p>
          )}
          {!showSavedJobs && jobSources.length > 0 && (
            <div className="mb-4 rounded-lg border border-line bg-paper-raised px-3 py-2">
              <p className="text-[10px] font-semibold text-ink-soft">
                Status sumber (jumlah listing yang dikembalikan API sebelum penyaringan):
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {jobSources.map((source) => {
                  const label = source.status === "available"
                    ? `${source.label}: merespons (${source.receivedCount})`
                    : source.status === "failed"
                      ? `${source.label}: gagal`
                      : source.status === "not_configured"
                        ? `${source.label}: API key belum diatur`
                        : `${source.label}: tidak ada listing`;
                  const className = source.status === "available"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : source.status === "failed"
                      ? "border-rust/30 bg-rust-tint text-rust"
                      : source.status === "not_configured"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-line bg-paper text-ink-soft";
                  return (
                    <span
                      key={source.label}
                      className={`rounded-full border px-2 py-1 text-[10px] font-medium ${className}`}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {(showSavedJobs ? savedJobsLoading : loading) ? (
            <div className="py-16 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-forest border-r-transparent" />
              <p className="mt-3 text-xs font-medium text-ink-soft">
                Mencari listing dari sumber lowongan...
              </p>
            </div>
          ) : !showSavedJobs && loadError ? (
            <div className="rounded-xl border border-rust/30 bg-rust-tint p-8 text-center" role="alert">
              <h3 className="font-semibold text-rust">Lowongan gagal dimuat</h3>
              <p className="mt-2 text-xs text-rust">{loadError}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setLoadError(null);
                  setJobSources([]);
                  setRetryKey((key) => key + 1);
                }}
                className="mt-4 rounded-lg bg-forest px-4 py-2 text-xs font-semibold text-white hover:bg-forest-dark"
              >
                Coba lagi
              </button>
            </div>
          ) : visibleJobs.length === 0 ? (
            <div className="rounded-xl border border-line bg-paper-raised p-12 text-center shadow-sm space-y-3">
              <Building2 className="mx-auto h-10 w-10 text-ink-soft/40" />
              <h3 className="font-serif text-base font-bold text-ink">
                {showSavedJobs
                  ? "Belum ada lowongan tersimpan"
                  : allConfiguredSourcesUnavailable
                  ? "Sumber lowongan sedang tidak tersedia"
                  : "Tidak ada lowongan yang sesuai filter saat ini"}
              </h3>
              <p className="text-xs text-ink-soft max-w-md mx-auto">
                {showSavedJobs
                  ? "Simpan lowongan yang menarik dari rekomendasi agar mudah ditemukan kembali."
                  : allConfiguredSourcesUnavailable
                  ? "Semua sumber yang dikonfigurasi gagal dihubungi atau belum memiliki API key. Coba lagi atau gunakan pencarian eksternal."
                  : "Coba profesi atau lokasi lain, atau lanjutkan pencarian di Google Jobs."}
              </p>
              {showSavedJobs ? (
                <button type="button" onClick={() => setShowSavedJobs(false)} className="rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white hover:bg-forest-dark">
                  Cari lowongan
                </button>
              ) : allConfiguredSourcesUnavailable && (
                <button
                  type="button"
                  onClick={() => setRetryKey((key) => key + 1)}
                  className="mr-2 inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white shadow hover:bg-forest-dark"
                >
                  Coba sumber lagi
                </button>
              )}
              {!showSavedJobs && (
                <button
                  onClick={handleOpenGoogleJobs}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-blue-700 transition-all cursor-pointer"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>Buka Google Jobs untuk "{searchKeyword}"</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
              {visibleJobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl border border-line bg-paper-raised p-4 shadow-sm transition-all hover:border-forest/60 hover:shadow sm:p-5"
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

                          <span
                            className="text-[10px] text-ink-soft flex items-center gap-1"
                            title="Tanggal berasal dari sumber lowongan dan tidak memastikan posisi masih terbuka."
                          >
                            <Clock className="h-3 w-3" />
                            {job.postedAt || "Tanggal tidak dicantumkan"}
                          </span>
                          {isPostingDateStale(job.postedAtDate) && (
                            <span
                              className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900"
                              title="Listing berumur lebih dari 30 hari. Periksa kembali statusnya di situs sumber."
                            >
                              Cek status · 30+ hari
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
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="rounded-lg bg-forest-tint px-2.5 py-1 text-xs font-bold text-forest">
                            {job.matchScore}% kecocokan
                          </span>
                          {job.applyRecommendation && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              job.applyRecommendation === "apply"
                                ? "bg-emerald-100 text-emerald-800"
                                : job.applyRecommendation === "consider"
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-gray-100 text-gray-700"
                            }`}>
                              {job.applyRecommendation === "apply"
                                ? "Layak dipertimbangkan"
                                : job.applyRecommendation === "consider"
                                  ? "Tinjau persyaratan"
                                  : "Prioritas rendah"}
                            </span>
                          )}
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
                      {job.industry && (
                        <span className="rounded bg-paper px-2 py-0.5 text-ink-soft">
                          {job.industry}
                        </span>
                      )}
                      {job.experienceLevel && (
                        <span className="rounded bg-paper px-2 py-0.5 text-ink-soft">
                          Pengalaman: {job.experienceLevel}
                        </span>
                      )}
                      {job.type && (
                        <span className="rounded bg-paper px-2 py-0.5 text-ink-soft">
                          {job.type}
                        </span>
                      )}
                      {getApplicationDeadlineLabel(job.applicationDeadline) && (
                        <span className={`rounded px-2 py-0.5 font-semibold ${
                          isApplicationDeadlineExpired(job.applicationDeadline)
                            ? "bg-rose-50 text-rose-700"
                            : "bg-amber-50 text-amber-800"
                        }`}>
                          {getApplicationDeadlineLabel(job.applicationDeadline)}
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
                        type="button"
                        onClick={() => handleOpenJobDetails(job)}
                        className="flex items-center gap-1 rounded-lg border border-forest/30 bg-forest-tint px-2.5 py-1.5 text-xs font-semibold text-forest hover:bg-forest hover:text-white transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Detail</span>
                      </button>
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
                        type="button"
                        onClick={() => void handleToggleSavedJob(job)}
                        disabled={savingId === job.id}
                        className="flex items-center gap-1 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-forest/40 hover:text-forest disabled:opacity-50"
                        title={savedJobs.some((savedJob) => savedJob.externalId === job.id) ? "Hapus dari lowongan tersimpan" : "Simpan lowongan"}
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>
                          {savingId === job.id
                            ? "Menyimpan..."
                            : savedJobs.some((savedJob) => savedJob.externalId === job.id)
                              ? "Tersimpan"
                              : "Simpan"}
                        </span>
                      </button>
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

      {/* Salary Benchmark Modal */}
      <SalaryBenchmarkModal
        isOpen={salaryModalOpen}
        onClose={() => setSalaryModalOpen(false)}
      />

      {/* Job Importer Modal */}
      <JobImporterModal
        isOpen={jobImporterOpen}
        onClose={() => setJobImporterOpen(false)}
        onOptimize={handleJobImported}
        onSaveToTracker={handleSaveImportedToTracker}
      />
    </div>
  );
}
