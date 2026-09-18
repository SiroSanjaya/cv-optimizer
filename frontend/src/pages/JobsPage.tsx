import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { Button } from "../components/Button";
import { SalaryBenchmarkModal } from "../components/SalaryBenchmarkModal";
import {
  getJobRecommendations,
  createApplication,
  analyzeCustomJob,
  generateRecruiterPitch,
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
  TrendingUp,
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
} from "lucide-react";

export function JobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<RecommendedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState("Software");
  const [locationFilter, setLocationFilter] = useState<"all" | "indonesia" | "remote">("all");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isPersonalized, setIsPersonalized] = useState<boolean>(false);
  const [skillsCount, setSkillsCount] = useState<number>(0);

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

  const fetchJobs = async (kw: string, loc = locationFilter, cat = activeCategory) => {
    setLoading(true);
    try {
      let sessionSkills: string[] | undefined;
      const savedSkills = sessionStorage.getItem("user_cv_skills");
      if (savedSkills) {
        try {
          const parsed = JSON.parse(savedSkills);
          if (Array.isArray(parsed) && parsed.length > 0) {
            sessionSkills = parsed;
          }
        } catch {}
      }

      const res = await getJobRecommendations({
        keyword: kw,
        location: loc,
        category: cat !== "All" ? cat.toLowerCase() : undefined,
        skills: sessionSkills,
      });

      setJobs(res.jobs);
      setIsPersonalized(Boolean(res.query?.isPersonalized));
      setSkillsCount(res.query?.skillsCount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(searchKeyword, locationFilter, activeCategory);
  }, [locationFilter, activeCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs(searchKeyword.trim() || "developer", locationFilter, activeCategory);
  };

  const handleOpenGoogleJobs = () => {
    const locQuery = locationFilter === "indonesia" ? "Indonesia" : locationFilter === "remote" ? "Remote" : "Tech";
    const fullQuery = `${searchKeyword || "Software Engineer"} ${locQuery}`;
    const googleJobsUrl = `https://www.google.com/search?ibp=htl;jobs&q=${encodeURIComponent(fullQuery)}`;
    window.open(googleJobsUrl, "_blank");
  };

  const handleQuickOptimize = (job: RecommendedJob) => {
    sessionStorage.setItem(
      "target_job_description",
      `${job.title} at ${job.company}\n\nRequirements & Overview:\n${job.description}\n\nSkills: ${job.skills.join(", ")}`
    );
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
        matchScore: job.matchScore || 85,
        hireProb: job.hireProbability || 80,
        status: "applied",
        notes: `Sumber: ${job.source}. Lokasi: ${job.location}. Gaji: ${job.salary || "N/A"}`,
      });
      alert(`Berhasil menyimpan "${job.title} di ${job.company}" ke Tracker Lamaran!`);
    } catch (err) {
      alert("Gagal menyimpan ke tracker");
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
      const savedSkills = sessionStorage.getItem("user_cv_skills");
      if (savedSkills) {
        try {
          sessionSkills = JSON.parse(savedSkills);
        } catch {}
      }

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

    let sessionSkills = ["React", "TypeScript", "Node.js"];
    const savedSkills = sessionStorage.getItem("user_cv_skills");
    if (savedSkills) {
      try {
        const parsed = JSON.parse(savedSkills);
        if (Array.isArray(parsed) && parsed.length > 0) sessionSkills = parsed;
      } catch {}
    }

    try {
      const pitch = await generateRecruiterPitch({
        candidateName: "Kandidat",
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

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-6 py-8 flex-1">
        {/* Banner Hero */}
        <div className="rounded-2xl border border-line bg-gradient-to-r from-forest-tint via-paper-raised to-paper-raised p-6 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-forest">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Multi-Portal Live Tech Aggregator & Google Jobs Launcher
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
            Lowongan Kerja Aktual & Terverifikasi
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-ink-soft leading-relaxed">
            Akses langsung ke database lowongan live Kalibrr, Remotive Remote, Arbeitnow, serta jutaan lowongan di Google Jobs resmi dengan analisis kecocokan ATS otomatis.
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
            <div className="flex items-center gap-1.5 bg-paper p-1 rounded-lg border border-line">
              {[
                { id: "all", label: "Semua Lokasi", icon: Globe },
                { id: "indonesia", label: "🇮🇩 Indonesia", icon: MapPin },
                { id: "remote", label: "🌐 Remote Only", icon: Radio },
              ].map((loc) => {
                const Icon = loc.icon;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setLocationFilter(loc.id as any)}
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
                  onClick={() => setActiveCategory(cat)}
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
          </div>
        </div>

        {/* Status / Personalization Banner */}
        <div className="mt-6">
          {isPersonalized ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50/80 px-4 py-3 text-xs text-emerald-900 shadow-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Skor Personal Aktif:</strong> Kecocokan dan probabilitas dihitung matematis berdasarkan <strong>{skillsCount} keahlian</strong> dari CV Anda.
              </span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-300/80 bg-amber-50/70 px-4 py-3 text-xs text-amber-950 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Estimasi Benchmark Aktif:</strong> Anda belum mengunggah CV, sehingga kecocokan di bawah menggunakan bobot benchmark Software Engineer.
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
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-ink-soft">
              Menampilkan <span className="text-ink font-bold">{jobs.length}</span> lowongan aktual & terverifikasi
            </p>
            <span className="text-[11px] text-ink-soft">
              Diurutkan berdasarkan Probabilitas & Kecocokan Tertinggi
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-forest border-r-transparent" />
              <p className="mt-3 text-xs font-medium text-ink-soft">
                Mengambil lowongan live dari Kalibrr, Remotive, dan perusahaan tech...
              </p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-xl border border-line bg-paper-raised p-12 text-center shadow-sm space-y-3">
              <Building2 className="mx-auto h-10 w-10 text-ink-soft/40" />
              <h3 className="font-serif text-base font-bold text-ink">
                Tidak ada lowongan yang sesuai filter saat ini
              </h3>
              <p className="text-xs text-ink-soft max-w-md mx-auto">
                Coba ganti filter ke "Semua Lokasi" atau jelajahi ratusan ribu lowongan di Google Jobs.
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
                            job.source === "Verified Tech" ? "bg-emerald-100 text-emerald-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {job.source}
                          </span>

                          {job.remote && (
                            <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 border border-teal-200">
                              Remote
                            </span>
                          )}

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

                      {/* Probability Gauge Badge */}
                      <div className="flex flex-col items-end shrink-0">
                        <div className="flex items-center gap-1 rounded-lg bg-forest-tint px-2.5 py-1 text-forest">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span className="font-serif text-sm font-bold">
                            {job.hireProbability || 80}%
                          </span>
                        </div>
                        <span className="mt-0.5 text-[10px] font-medium text-ink-soft">
                          Probabilitas Sukses
                        </span>
                      </div>
                    </div>

                    {/* Salary & Response Rate */}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                      {job.salary && (
                        <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <DollarSign className="h-3.5 w-3.5" />
                          {job.salary}
                        </span>
                      )}
                      {job.responseRate && (
                        <span className="text-[11px] text-ink-soft">
                          Respons HR: <b>{job.responseRate}%</b>
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
                          <span className="text-[10px] font-semibold text-amber-800">Perlu dipelajari:</span>
                          {job.missingSkills.map((sk, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200"
                            >
                              {sk}
                            </span>
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
                    <span>Analisis Kecocokan ATS Sekarang</span>
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
                    {customJobResult.matchScore}% Match
                  </span>
                </div>

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
    </div>
  );
}
