import { useState, useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Header } from "../components/Header";
import { FileUpload } from "../components/FileUpload";
import { JobDescriptionInput } from "../components/JobDescriptionInput";
import { LoadingState } from "../components/LoadingState";
import { MatchAnalysis } from "../components/MatchAnalysis";
import { CvPreview } from "../components/CvPreview";
import { QuotaBanner } from "../components/QuotaBanner";
import { Button } from "../components/Button";
import { HireProbabilityGauge } from "../components/HireProbabilityGauge";
import { ProfileImportModal } from "../components/ProfileImportModal";
import { CoverLetterSection } from "../components/CoverLetterSection";
import { ShareableScoreModal } from "../components/ShareableScoreModal";
import { InteractiveRewriteDiff } from "../components/InteractiveRewriteDiff";
import { ResumeQualityAssurance } from "../components/ResumeQualityAssurance";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContextValue";
import { fireConfetti } from "../lib/confetti";
import {
  analyzeCv,
  generateTailoredCv,
  generateCoverLetter,
  downloadCoverLetterPdf,
  downloadCvFile,
  createApplication,
} from "../lib/api";
import type {
  CoverLetterResult,
  CvAnalysis,
  StructuredCv,
  BulletRevision,
} from "../types/cv";
import {
  saveSessionCvSkills,
  getSessionStructuredCv,
  saveSessionStructuredCv,
} from "../lib/sessionProfile";
import {
  Sparkles,
  Link2,
  CheckCircle2,
  BookmarkPlus,
  Mail,
  FileText,
  Award,
  Copy,
  Download,
  ExternalLink,
} from "lucide-react";

const formSchema = z.object({
  jobDescription: z
    .string()
    .trim()
    .min(30, "Silakan masukkan deskripsi pekerjaan lengkap (minimal 30 karakter)."),
  privacyAccepted: z.boolean().refine((accepted) => accepted, {
    message: "Setujui pemrosesan AI sebelum melanjutkan.",
  }),
});

type FormValues = z.infer<typeof formSchema>;
type Stage = "form" | "analyzing" | "results" | "generating" | "tailored" | "batch_processing" | "batch_results";

interface BatchTarget {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  matchScore?: number;
  jobDescription: string;
}

interface PreparedBatchItem {
  target: BatchTarget;
  cv: StructuredCv;
  matchScore: number;
  coverLetter: CoverLetterResult;
}

function readPendingBatch(): { targets: BatchTarget[]; error: string | null } {
  const raw = sessionStorage.getItem("job_application_batch");
  if (!raw) return { targets: [], error: null };

  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
      throw new Error("Daftar batch lowongan tidak valid. Pilih ulang lowongan dari halaman Jobs.");
    }

    const targets = value.map((item): BatchTarget => {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof item.id !== "string" ||
        typeof item.title !== "string" ||
        typeof item.company !== "string" ||
        typeof item.location !== "string" ||
        typeof item.url !== "string" ||
        typeof item.jobDescription !== "string" ||
        item.jobDescription.trim().length < 30
      ) {
        throw new Error("Data salah satu lowongan tidak lengkap. Pilih ulang lowongan dari halaman Jobs.");
      }
      const jobUrl = new URL(item.url);
      if (jobUrl.protocol !== "https:" && jobUrl.protocol !== "http:") {
        throw new Error("Link lowongan tidak valid. Pilih lowongan dengan tautan HTTP/HTTPS.");
      }

      return {
        id: item.id,
        title: item.title,
        company: item.company,
        location: item.location,
        url: jobUrl.toString(),
        jobDescription: item.jobDescription,
        ...(typeof item.matchScore === "number" ? { matchScore: item.matchScore } : {}),
      };
    });

    if (new Set(targets.map((target) => target.id)).size !== targets.length) {
      throw new Error("Daftar batch berisi lowongan duplikat. Pilih ulang lowongan.");
    }
    return { targets, error: null };
  } catch (error) {
    sessionStorage.removeItem("job_application_batch");
    return {
      targets: [],
      error: error instanceof Error
        ? error.message
        : "Daftar batch tidak dapat dibaca. Pilih ulang lowongan.",
    };
  }
}

export function OptimizePage() {
  const { user, refreshUser, isLoading: isAuthLoading } = useAuth();
  const [initialBatch] = useState(readPendingBatch);
  const [batchTargets, setBatchTargets] = useState(initialBatch.targets);
  const [batchResults, setBatchResults] = useState<PreparedBatchItem[]>([]);
  const [stage, setStage] = useState<Stage>("form");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(initialBatch.error);
  const [batchActionError, setBatchActionError] = useState<string | null>(null);
  const [copiedBatchLetterId, setCopiedBatchLetterId] = useState<string | null>(null);
  const [downloadingBatchLetterId, setDownloadingBatchLetterId] = useState<string | null>(null);
  const [savingBatchApplicationId, setSavingBatchApplicationId] = useState<string | null>(null);
  const [exportingBrowserBatch, setExportingBrowserBatch] = useState(false);
  const [savedBatchApplicationIds, setSavedBatchApplicationIds] = useState<Set<string>>(
    () => new Set()
  );
  const [batchProgress, setBatchProgress] = useState<{
    currentJob: string;
    completed: number;
    total: number;
  } | null>(null);

  const [structuredCv, setStructuredCv] = useState<StructuredCv | null>(() => {
    const saved = getSessionStructuredCv(user?.id || "guest");
    return saved?.cv ?? null;
  });
  const [cachedCvName, setCachedCvName] = useState<string | null>(() => {
    const saved = getSessionStructuredCv(user?.id || "guest");
    return saved?.fileName ?? null;
  });
  const [replaceCvMode, setReplaceCvMode] = useState(false);
  const [analysis, setAnalysis] = useState<CvAnalysis | null>(null);
  const [tailoredCv, setTailoredCv] = useState<StructuredCv | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [savedToTracker, setSavedToTracker] = useState(false);
  const [claimedSkills, setClaimedSkills] = useState<string[]>([]);
  const [tailoredTab, setTailoredTab] = useState<"cv" | "diff" | "cover_letter">("cv");

  const activeRevisions: BulletRevision[] = useMemo(() => {
    if (analysis?.suggestedRevisions && analysis.suggestedRevisions.length > 0) {
      return analysis.suggestedRevisions;
    }
    if (!structuredCv || !tailoredCv) return [];
    const list: BulletRevision[] = [];
    tailoredCv.experience.forEach((tailoredExp, expIdx) => {
      const origExp = structuredCv.experience[expIdx];
      tailoredExp.bullets.forEach((bullet, bIdx) => {
        const origBullet = origExp?.bullets[bIdx] || "";
        if (origBullet && origBullet !== bullet) {
          list.push({
            id: `rev-${expIdx}-${bIdx}`,
            company: tailoredExp.company,
            role: tailoredExp.position,
            originalBullet: origBullet,
            suggestedBullet: bullet,
            reasoning: "Menonjolkan aktivitas teknis dan action verb terarah (X-Y-Z formula) selaras dengan persyaratan lowongan.",
            hasQuantifiableMetric: /\d+%|\$\d+|\b\d+\s*(users|ms|x|k|m)\b/i.test(bullet),
            status: "accepted",
          });
        }
      });
    });
    return list;
  }, [analysis?.suggestedRevisions, structuredCv, tailoredCv]);

  const handleApplyRevisions = (acceptedRevisions: BulletRevision[]) => {
    if (!tailoredCv) return;
    const updatedExp = tailoredCv.experience.map((exp) => {
      const matchedRev = acceptedRevisions.filter(
        (r) => r.company === exp.company && r.role === exp.position
      );
      if (matchedRev.length === 0) return exp;
      const newBullets = exp.bullets.map((b) => {
        const rev = matchedRev.find(
          (r) => r.suggestedBullet === b || r.originalBullet === b
        );
        if (!rev) return b;
        return rev.status === "rejected" ? rev.originalBullet : rev.suggestedBullet;
      });
      return { ...exp, bullets: newBullets };
    });
    setTailoredCv({ ...tailoredCv, experience: updatedExp });
    setTailoredTab("cv");
  };

  const {
    control,
    handleSubmit,
    setValue,
    register,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { jobDescription: "", privacyAccepted: false },
  });

  const jobDescription = useWatch({ control, name: "jobDescription" });

  useEffect(() => {
    sessionStorage.removeItem("job_application_batch");
  }, []);

  // Restore saved CV from session if available
  useEffect(() => {
    const uid = user?.id || "guest";
    const saved = getSessionStructuredCv(uid);
    if (saved?.cv && !structuredCv) {
      setStructuredCv(saved.cv);
      setCachedCvName(saved.fileName || "CV Terhubung");
    }
  }, [user?.id, structuredCv]);

  // Check if job description was passed from Jobs recommendation page or Job Importer
  useEffect(() => {
    // 1. Standard JD handoff from Jobs page
    const savedDesc = sessionStorage.getItem("target_job_description");
    if (savedDesc) {
      setValue("jobDescription", savedDesc);
      sessionStorage.removeItem("target_job_description");
      return;
    }

    // 2. Rich handoff from Job Importer Modal (URL / paste)
    const importedRaw = sessionStorage.getItem("imported_job");
    if (importedRaw) {
      try {
        const imported = JSON.parse(importedRaw) as {
          company: string;
          position: string;
          jobDescription: string;
          sourceUrl?: string;
          skills?: string[];
        };
        if (imported.jobDescription) {
          setValue("jobDescription", imported.jobDescription);
        }
        sessionStorage.removeItem("imported_job");
      } catch {
        sessionStorage.removeItem("imported_job");
      }
    }
  }, [setValue]);

  const handleToggleSkill = (skill: string) => {
    setClaimedSkills((prev) => {
      const exists = prev.some((s) => s.toLowerCase() === skill.toLowerCase());
      const next = exists
        ? prev.filter((s) => s.toLowerCase() !== skill.toLowerCase())
        : [...prev, skill];

      // Dynamically update structuredCv.skills so the CV itself immediately contains the claimed skill
      if (structuredCv) {
        const curr = structuredCv.skills || [];
        let updatedSkills: string[];
        if (exists) {
          updatedSkills = curr.filter((s) => s.toLowerCase() !== skill.toLowerCase());
        } else {
          updatedSkills = [...curr, skill];
        }
        setStructuredCv({
          ...structuredCv,
          skills: updatedSkills,
        });
      }

      return next;
    });
  };

  const baseScore = analysis?.matchScore ?? 0;
  const missingCount = analysis?.missingSkills?.length ?? 0;
  const partialCount = analysis?.partialMatches?.length ?? 0;
  const totalClaimable = missingCount + partialCount;

  const effectiveScore = (() => {
    if (!analysis) return 0;
    if (claimedSkills.length === 0) return baseScore;
    const remainingGap = Math.max(0, 100 - baseScore);
    const weightPerSkill = totalClaimable > 0 ? remainingGap / totalClaimable : 8;
    const boost = Math.round(claimedSkills.length * Math.max(5, weightPerSkill));
    return Math.min(100, Math.max(baseScore, baseScore + boost));
  })();

  const onPrepareBatch = async (firstJobDescription: string) => {
    if (!user) {
      setSubmitError("Masuk terlebih dahulu untuk menggunakan batch optimasi.");
      return;
    }
    if (user.credits === undefined || user.usedCredits === undefined) {
      setSubmitError("Kuota AI belum termuat. Refresh halaman lalu coba lagi.");
      return;
    }

    const targets = batchTargets.map((target, index) =>
      index === 0
        ? { ...target, jobDescription: firstJobDescription }
        : target
    );
    const requiredTasks = targets.length * 3;
    const remainingTasks = Math.max(0, user.credits - user.usedCredits);
    if (remainingTasks < requiredTasks) {
      setSubmitError(
        `Batch ini perlu ${requiredTasks} task AI untuk ${targets.length} paket CV + cover letter, tetapi kuota tersisa ${remainingTasks}. Kurangi pilihan atau lanjutkan setelah kuota tersedia.`
      );
      return;
    }

    const sourceCv = structuredCv ?? file;
    if (!sourceCv) {
      setFileError("Upload CV atau import profil sebelum menyiapkan batch.");
      return;
    }

    setSubmitError(null);
    setBatchActionError(null);
    setBatchResults([]);
    setSavedBatchApplicationIds(new Set());
    setStage("batch_processing");
    let completedCount = 0;
    let reusableCv: StructuredCv | null = structuredCv;

    try {
      for (const target of targets) {
        setBatchProgress({
          currentJob: `${target.title} — ${target.company}`,
          completed: completedCount,
          total: targets.length,
        });
        const analysisResult = await analyzeCv(
          reusableCv ?? sourceCv,
          target.jobDescription
        );
        reusableCv = analysisResult.cv;
        setStructuredCv(analysisResult.cv);

        const cvResult = await generateTailoredCv(
          analysisResult.cv,
          target.jobDescription,
          analysisResult.analysis
        );
        const language =
          /\b(?:indonesia|jakarta|bandung|surabaya|yogyakarta|bali)\b/i.test(target.location)
            ? "id"
            : "en";
        const letterResult = await generateCoverLetter(
          analysisResult.cv,
          target.jobDescription,
          {
            language,
            companyName: target.company,
            targetRole: target.title,
          }
        );

        setBatchResults((previous) => [
          ...previous,
          {
            target,
            cv: cvResult.cv,
            matchScore: analysisResult.analysis.matchScore,
            coverLetter: letterResult.coverLetter,
          },
        ]);
        completedCount += 1;
        setBatchProgress({
          currentJob: `${target.title} — ${target.company}`,
          completed: completedCount,
          total: targets.length,
        });
        await refreshUser();
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Terjadi kesalahan saat menyiapkan materi.";
      setBatchActionError(
        `${completedCount} dari ${targets.length} paket selesai. Batch dihentikan agar tidak menghabiskan kuota lebih lanjut. ${reason}`
      );
    } finally {
      await refreshUser();
      setBatchProgress(null);
      setStage(completedCount > 0 ? "batch_results" : "form");
    }
  };

  const onAnalyze = async (values: FormValues) => {
    setSubmitError(null);
    setClaimedSkills([]);

    if (batchTargets.length > 0) {
      await onPrepareBatch(values.jobDescription);
      return;
    }

    // Imported profile data can be reused without uploading a separate CV file.
    if (!file && !structuredCv) {
      setFileError("Upload file CV kamu atau gunakan opsi import profil.");
      return;
    }
    setStage("analyzing");
    try {
      const cvSource = file || structuredCv!;
      const result = await analyzeCv(cvSource, values.jobDescription);
      await refreshUser();
      setStructuredCv(result.cv);
      setAnalysis(result.analysis);
      const uid = user?.id || "guest";
      saveSessionStructuredCv(uid, result.cv, file?.name || cachedCvName || undefined);
      if (result.cv?.skills?.length) {
        saveSessionCvSkills(uid, result.cv.skills);
      }
      setStage("results");
      if ((result.analysis?.matchScore || 0) >= 70) {
        setTimeout(() => fireConfetti(2500), 300);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Terjadi kesalahan saat menganalisis.");
      setStage("form");
    }
  };

  const onGenerate = async () => {
    if (!structuredCv || !analysis) return;
    setSubmitError(null);
    setStage("generating");
    try {
      // Build enhanced analysis payload reflecting claimed skills
      const enhancedAnalysis: CvAnalysis = {
        ...analysis,
        matchScore: effectiveScore,
        matchedSkills: [
          ...(analysis.matchedSkills || []),
          ...claimedSkills.filter(
            (c) => !(analysis.matchedSkills || []).some((m) => m.toLowerCase() === c.toLowerCase())
          ),
        ],
        missingSkills: (analysis.missingSkills || []).filter(
          (s) => !claimedSkills.some((c) => c.toLowerCase() === s.toLowerCase())
        ),
      };

      const result = await generateTailoredCv(structuredCv, jobDescription, enhancedAnalysis);
      await refreshUser();
      setTailoredCv(result.cv);
      setStage("tailored");
      setTimeout(() => fireConfetti(3500), 300);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Terjadi kesalahan saat membuat CV tailored.");
      setStage("results");
    }
  };

  const handleSaveToTracker = async () => {
    if (!analysis) return;
    try {
      // Extract position or company from first line of job description
      const lines = jobDescription.split("\n").filter((l) => l.trim().length > 0);
      const titleLine = lines[0] || "Target Role";
      const parts = titleLine.split(" at ");
      const position = parts[0] || "Target Role";
      const company = parts[1] || "Perusahaan Target";

      await createApplication({
        company: company.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 40),
        position: position.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 40),
        jobDescription,
        matchScore: effectiveScore,
        status: "applied",
        notes: `Disimpan dari analisis CV Optimizer. Skor kecocokan skill: ${effectiveScore}%.`,
      });
      setSavedToTracker(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Gagal menyimpan lamaran ke tracker."
      );
    }
  };

  const startOver = () => {
    setFile(null);
    setStructuredCv(null);
    setAnalysis(null);
    setTailoredCv(null);
    setSubmitError(null);
    setSavedToTracker(false);
    setClaimedSkills([]);
    setTailoredTab("cv");
    setBatchTargets([]);
    setBatchResults([]);
    setSavedBatchApplicationIds(new Set());
    sessionStorage.removeItem("job_application_batch");
    setStage("form");
  };

  const updateBatchCv = (targetId: string, cv: StructuredCv) => {
    setBatchResults((items) =>
      items.map((item) => item.target.id === targetId ? { ...item, cv } : item)
    );
  };

  const updateBatchLetter = (
    targetId: string,
    field: "subject" | "content",
    value: string
  ) => {
    setBatchResults((items) =>
      items.map((item) =>
        item.target.id === targetId
          ? { ...item, coverLetter: { ...item.coverLetter, [field]: value } }
          : item
      )
    );
  };

  const copyBatchLetter = async (item: PreparedBatchItem) => {
    try {
      await navigator.clipboard.writeText(
        `Subject: ${item.coverLetter.subject}\n\n${item.coverLetter.recipient}\n\n${item.coverLetter.content}`
      );
      setCopiedBatchLetterId(item.target.id);
      window.setTimeout(() => setCopiedBatchLetterId(null), 2000);
      setBatchActionError(null);
    } catch {
      setBatchActionError("Surat tidak bisa disalin otomatis. Pilih teksnya lalu salin secara manual.");
    }
  };

  const downloadBatchLetter = async (item: PreparedBatchItem) => {
    setDownloadingBatchLetterId(item.target.id);
    setBatchActionError(null);
    try {
      const blob = await downloadCoverLetterPdf({
        subject: item.coverLetter.subject,
        recipient: item.coverLetter.recipient,
        content: item.coverLetter.content,
        applicantName: item.cv.personalInfo.name || "Kandidat",
        email: item.cv.personalInfo.email,
        phone: item.cv.personalInfo.phone,
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `Cover_Letter_${item.target.company.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "_") || "Company"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setBatchActionError(
        error instanceof Error ? error.message : "Cover letter PDF gagal diunduh."
      );
    } finally {
      setDownloadingBatchLetterId(null);
    }
  };

  const isSupportedBrowserAssistantUrl = (value: string) => {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") return false;
      if (
        url.hostname === "boards.greenhouse.io" ||
        url.hostname === "job-boards.greenhouse.io"
      ) {
        return /^\/[^/]+\/jobs\/\d+(?:\/apply)?\/?$/i.test(url.pathname);
      }
      return url.hostname === "jobs.lever.co" &&
        /^\/[^/]+\/[a-f0-9-]+(?:\/apply)?\/?$/i.test(url.pathname);
    } catch {
      return false;
    }
  };

  const createBrowserAssistantPackage = async (item: PreparedBatchItem) => {
    const resume = await downloadCvFile(item.cv, "pdf");
    const bytes = new Uint8Array(await resume.arrayBuffer());
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }
    const safeName = `${item.target.company}_${item.target.title}`
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .trim()
      .replace(/\s+/g, "_") || "Application";
    return {
      format: "cv-optimizer-application",
      version: 1,
      exportedAt: new Date().toISOString(),
      job: {
        id: item.target.id,
        title: item.target.title,
        company: item.target.company,
        location: item.target.location,
        url: item.target.url,
        jobDescription: item.target.jobDescription,
        matchScore: item.matchScore,
      },
      cv: item.cv,
      coverLetter: item.coverLetter,
      resumePdf: {
        filename: `CV_${safeName}.pdf`,
        mimeType: "application/pdf",
        base64: btoa(binary),
      },
    };
  };

  const downloadBrowserAssistantPackages = async (items: PreparedBatchItem[]) => {
    if (items.length === 0) return;
    setExportingBrowserBatch(true);
    setBatchActionError(null);
    try {
      const applications = [];
      const supportedItems = items.filter((item) =>
        isSupportedBrowserAssistantUrl(item.target.url)
      );
      if (supportedItems.length === 0) {
        throw new Error("Paket browser hanya mendukung lowongan Greenhouse atau Lever.");
      }
      for (const item of supportedItems) {
        applications.push(await createBrowserAssistantPackage(item));
      }
      const packageData = {
        format: "cv-optimizer-application-batch",
        version: 1,
        exportedAt: new Date().toISOString(),
        applications,
      };
      const serialized = JSON.stringify(packageData);
      if (new Blob([serialized]).size > 2 * 1024 * 1024) {
        throw new Error("Paket batch melebihi batas 2 MB extension. Unduh paket per lowongan.");
      }
      const blob = new Blob([serialized], {
        type: "application/json",
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `CV_Optimizer_Application_Batch_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      if (supportedItems.length < items.length) {
        setBatchActionError(
          `Paket dibuat untuk ${supportedItems.length} lowongan Greenhouse/Lever. ${items.length - supportedItems.length} lowongan lainnya perlu dilamar manual dari situs resminya.`
        );
      }
    } catch (error) {
      setBatchActionError(
        error instanceof Error
          ? `Paket browser gagal dibuat: ${error.message}`
          : "Paket browser gagal dibuat."
      );
    } finally {
      setExportingBrowserBatch(false);
    }
  };

  const downloadBrowserAssistantPackage = async (item: PreparedBatchItem) => {
    try {
      const packageData = await createBrowserAssistantPackage(item);
      const blob = new Blob([JSON.stringify(packageData)], { type: "application/json" });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = `${item.target.company}_${item.target.title}`
        .replace(/[^a-zA-Z0-9-_ ]/g, "")
        .trim()
        .replace(/\s+/g, "_") || "Application";
      link.href = objectUrl;
      link.download = `CV_Optimizer_${filename}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setBatchActionError(
        error instanceof Error ? error.message : "Paket browser gagal dibuat."
      );
    }
  };

  const saveSubmittedBatchApplication = async (item: PreparedBatchItem) => {
    if (savedBatchApplicationIds.has(item.target.id)) return;
    setSavingBatchApplicationId(item.target.id);
    setBatchActionError(null);
    try {
      await createApplication({
        company: item.target.company,
        position: item.target.title,
        jobDescription: item.target.jobDescription,
        jobUrl: item.target.url,
        matchScore: item.matchScore,
        status: "applied",
        notes: "Status ditandai terkirim oleh pengguna setelah meninjau dan mengirim lamaran secara manual.",
      });
      setSavedBatchApplicationIds((previous) => new Set(previous).add(item.target.id));
    } catch (error) {
      setBatchActionError(
        error instanceof Error ? error.message : "Lamaran gagal disimpan ke tracker."
      );
    } finally {
      setSavingBatchApplicationId(null);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between">
      <Header />

      <main className="mx-auto w-full max-w-4xl px-6 py-10 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink">
              Optimasi CV dengan AI
            </h1>
            <p className="mt-1 text-xs text-ink-soft">
              Bandingkan informasi CV dengan persyaratan lowongan, lalu tinjau saran AI sebelum mengunduh hasil.
            </p>
          </div>

          {stage === "form" && (
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-forest/40 bg-forest-tint/70 px-3.5 py-2 text-xs font-semibold text-forest shadow-xs hover:bg-forest-tint transition-all"
            >
              <Link2 className="h-4 w-4" />
              <span>Import LinkedIn / Profil</span>
            </button>
          )}
        </div>

        {user && typeof user.credits === "number" && typeof user.usedCredits === "number" && (
          <div className="mt-6">
            <QuotaBanner used={user.usedCredits} limit={user.credits} />
          </div>
        )}

        {!user && !isAuthLoading && (
          <div className="mt-6 rounded-md border border-forest/30 bg-forest-tint px-4 py-3 text-xs text-forest-dark">
            Masuk dengan Google untuk menggunakan fitur AI.{" "}
            <Link
              to="/login"
              state={{ from: "/optimize" }}
              className="font-semibold underline"
            >
              Masuk
            </Link>
          </div>
        )}

        {submitError && (
          <div className="mt-4 rounded-md border border-rust/30 bg-rust-tint px-4 py-3 text-xs text-rust">
            {submitError}
          </div>
        )}

        {batchTargets.length > 0 && stage === "form" && (
          <div className="mt-5 rounded-xl border border-forest/25 bg-forest-tint/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-ink">
                  Batch materi lamaran · {batchTargets.length} lowongan
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  Tiap lowongan memakai 3 task AI: analisis CV, CV tailored, dan cover letter. Total {batchTargets.length * 3} task; biaya Gemini bisa berbeda sesuai pemakaian dan konfigurasi API.
                </p>
                <ul className="mt-2 space-y-1 text-xs text-ink-soft">
                  {batchTargets.map((target) => (
                    <li key={target.id}>
                      • {target.title} — {target.company} ({target.location})
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBatchTargets([]);
                  sessionStorage.removeItem("job_application_batch");
                }}
                className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink-soft hover:text-ink"
              >
                Batalkan batch
              </button>
            </div>
          </div>
        )}

        {batchActionError && (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950" role="status">
            {batchActionError}
          </div>
        )}

        {stage === "form" && (
          <form onSubmit={handleSubmit(onAnalyze)} className="mt-8 space-y-6">
            {/* Input CV Section */}
            <div className="rounded-xl border border-line bg-paper-raised p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-ink">
                  1. Masukkan CV Kamu
                </label>
                {structuredCv && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" />
                    CV Siap Digunakan ({structuredCv.personalInfo?.name || "Aktif"})
                  </span>
                )}
              </div>

              {structuredCv && !file && !replaceCvMode ? (
                <div className="rounded-xl border-2 border-forest/30 bg-gradient-to-r from-forest/5 to-emerald-50/50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest text-white shadow-xs shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink">
                        {cachedCvName ||
                          (structuredCv.personalInfo?.name
                            ? `${structuredCv.personalInfo.name}_CV`
                            : "CV Terdeteksi")}
                      </p>
                      <p className="text-[11px] text-ink-soft">
                        {structuredCv.skills?.length || 0} skill terdeteksi · {structuredCv.experience?.length || 0} pengalaman. Siap dianalisis langsung tanpa perlu upload ulang!
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplaceCvMode(true)}
                    className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink-soft hover:text-ink hover:border-forest/40 transition-all cursor-pointer whitespace-nowrap"
                  >
                    Ganti Berkas CV
                  </button>
                </div>
              ) : (
                <>
                  <FileUpload
                    file={file}
                    onChange={(f) => {
                      setFile(f);
                      setFileError(undefined);
                      setReplaceCvMode(false);
                    }}
                    error={fileError}
                  />
                  {replaceCvMode && structuredCv && (
                    <div className="mt-2 text-right">
                      <button
                        type="button"
                        onClick={() => setReplaceCvMode(false)}
                        className="text-xs font-semibold text-forest underline cursor-pointer"
                      >
                        Batal, gunakan CV yang sudah tersimpan
                      </button>
                    </div>
                  )}
                </>
              )}

              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-ink-soft">
                <span>Atau tidak punya file?</span>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="font-semibold text-forest underline hover:text-forest-dark"
                >
                  Import via Link LinkedIn / Paste Teks Profil
                </button>
              </div>
              {batchTargets.length > 0 && (
                <p className="mt-3 text-xs text-forest">
                  CV ini dipakai untuk semua lowongan terpilih. Gua bakal bikin satu versi tailored terpisah per posisi.
                </p>
              )}
              <p className="mt-4 text-xs leading-relaxed text-ink-soft" role="note">
                        CV dan deskripsi pekerjaan yang dikirim akan diproses oleh Google Gemini AI.
                        <Link to="/privacy" className="font-semibold text-forest underline">
                          Baca informasi privasi
                        </Link>
                        .
                      </p>
                    </div>

                    <label className="flex items-start gap-3 text-xs leading-relaxed text-ink-soft">
                      <input
                        type="checkbox"
                        {...register("privacyAccepted")}
                        aria-describedby={errors.privacyAccepted ? "privacy-acceptance-error" : undefined}
                        className="mt-0.5"
                      />
                      <span>
                        Saya memahami dan menyetujui bahwa data yang saya kirim diproses oleh
                        Google Gemini AI untuk menjalankan fitur ini.
                      </span>
                    </label>
                    {errors.privacyAccepted && (
                      <p id="privacy-acceptance-error" className="-mt-5 text-xs text-rust" role="alert">
                        {errors.privacyAccepted.message}
                      </p>
                    )}

            {/* Job Description Section */}
            <div className="rounded-xl border border-line bg-paper-raised p-6 shadow-sm">
              <label className="text-sm font-bold text-ink mb-3 block">
                2. Tempel (Paste) Deskripsi Pekerjaan Target
              </label>
              <Controller
                name="jobDescription"
                control={control}
                render={({ field }) => (
                  <JobDescriptionInput
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.jobDescription?.message}
                  />
                )}
              />
            </div>

            <Button
              type="submit"
              disabled={!user || isAuthLoading}
              className="w-full py-3 text-sm sm:w-auto px-8 gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {batchTargets.length > 0
                ? `Siapkan ${batchTargets.length} Paket Lamaran`
                : "Analisis Kecocokan CV"}
            </Button>
          </form>
        )}

        {stage === "analyzing" && (
          <div className="mt-8">
            <LoadingState
              messages={[
                "Membaca data pengalaman & skill kamu...",
                "Mencocokkan kualifikasi dengan deskripsi pekerjaan...",
                "Merangkum kecocokan skill dan pengalaman...",
                "Menyiapkan saran untuk ditinjau...",
              ]}
            />
          </div>
        )}

        {stage === "batch_processing" && (
          <div className="mt-8 space-y-4 rounded-2xl border border-line bg-paper-raised p-6 shadow-sm" role="status" aria-live="polite">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-forest border-r-transparent" />
              <div>
                <h2 className="text-sm font-bold text-ink">
                  Menyiapkan materi batch {batchProgress?.completed ?? 0} dari {batchProgress?.total ?? batchTargets.length}
                </h2>
                <p className="mt-1 text-xs text-ink-soft">
                  {batchProgress?.currentJob || "Memulai antrean..."}
                </p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-paper">
              <div
                className="h-full rounded-full bg-forest transition-all"
                style={{
                  width: `${Math.round(((batchProgress?.completed ?? 0) / (batchProgress?.total || batchTargets.length || 1)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs leading-relaxed text-ink-soft">
              Jangan tutup tab sampai selesai. Hasil yang sudah selesai tetap tersedia kalau kuota habis atau salah satu task gagal. Lu tetap perlu review hasil dan submit sendiri di situs perusahaan.
            </p>
          </div>
        )}

        {stage === "batch_results" && (
          <section className="mt-8 space-y-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-xl font-bold text-emerald-950">
                    {batchResults.length} paket lamaran siap direview
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-900">
                    Periksa fakta, edit CV dan surat, lalu buka halaman resmi untuk mengirim sendiri. Setelah berhasil submit, tandai dan simpan tiap lamaran ke tracker. Skor match mengukur kecocokan CV dengan lowongan, bukan probabilitas diterima.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadBrowserAssistantPackages(batchResults)}
                  disabled={exportingBrowserBatch || batchResults.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-white px-3.5 py-2 text-xs font-bold text-emerald-900 shadow-xs hover:bg-emerald-50 disabled:opacity-50 cursor-pointer"
                >
                  <Download className="h-4 w-4 text-emerald-700" />
                  {exportingBrowserBatch ? "Menyiapkan..." : "Unduh Semua Paket (.JSON)"}
                </button>
              </div>
            </div>

            {batchResults.map((item) => (
              <article
                key={item.target.id}
                className="rounded-xl border border-line bg-paper-raised p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-ink">
                      {item.target.title} — {item.target.company}
                    </h3>
                    <p className="mt-1 text-xs text-ink-soft">
                      {item.target.location} · Skill match awal {item.matchScore}%
                    </p>
                  </div>
                  <a
                    href={item.target.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-forest px-3 py-2 text-xs font-semibold text-white hover:bg-forest-dark"
                  >
                    Buka situs lamaran resmi
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => void saveSubmittedBatchApplication(item)}
                    disabled={
                      savedBatchApplicationIds.has(item.target.id) ||
                      savingBatchApplicationId === item.target.id
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-forest px-3 py-2 text-xs font-semibold text-forest hover:bg-forest-tint disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savedBatchApplicationIds.has(item.target.id)
                      ? "Tersimpan di tracker"
                      : savingBatchApplicationId === item.target.id
                        ? "Menyimpan..."
                        : "Sudah submit — catat"}
                  </button>
                  {savedBatchApplicationIds.has(item.target.id) && (
                    <Link
                      to="/dashboard"
                      className="text-xs font-semibold text-forest underline"
                    >
                      Lihat dashboard
                    </Link>
                  )}
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-forest">
                    Review dan edit CV + cover letter
                  </summary>
                  <div className="mt-4 space-y-4 border-t border-line pt-4">
                  <CvPreview
                    cv={item.cv}
                    onChange={(cv) => updateBatchCv(item.target.id, cv)}
                  />
                  <div className="rounded-xl border border-line bg-paper p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-ink">Cover letter</h4>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => downloadBrowserAssistantPackage(item)}
                          disabled={!isSupportedBrowserAssistantUrl(item.target.url)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper-raised px-3 py-2 text-xs font-semibold text-ink hover:border-forest"
                          title={isSupportedBrowserAssistantUrl(item.target.url)
                            ? "Paket berisi data CV dan surat lamaran. Simpan dengan aman."
                            : "Paket browser hanya mendukung lowongan Greenhouse dan Lever."}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Paket browser
                        </button>
                        <button
                          type="button"
                          onClick={() => void copyBatchLetter(item)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper-raised px-3 py-2 text-xs font-semibold text-ink hover:border-forest"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {copiedBatchLetterId === item.target.id ? "Tersalin" : "Salin"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void downloadBatchLetter(item)}
                          disabled={downloadingBatchLetterId === item.target.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper-raised px-3 py-2 text-xs font-semibold text-ink hover:border-forest disabled:opacity-50"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {downloadingBatchLetterId === item.target.id ? "Menyiapkan..." : "Unduh PDF"}
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                      Paket browser berisi data pribadi CV. Import hanya di extension lokal yang kamu pasang; unduh CV PDF/DOCX secara terpisah untuk diunggah ke form.
                    </p>
                    <label className="mt-3 block text-xs font-semibold text-ink-soft">
                      Subjek
                      <input
                        value={item.coverLetter.subject}
                        onChange={(event) =>
                          updateBatchLetter(item.target.id, "subject", event.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm text-ink"
                      />
                    </label>
                    <p className="mt-3 text-xs text-ink-soft">{item.coverLetter.recipient}</p>
                    <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                      Di halaman ATS yang cocok, extension bisa mengisi field yang dikenali dan melampirkan CV dari paket ini. Periksa semuanya dan kirim sendiri.
                    </p>
                    <textarea
                      value={item.coverLetter.content}
                      onChange={(event) =>
                        updateBatchLetter(item.target.id, "content", event.target.value)
                      }
                      rows={10}
                      className="mt-2 w-full rounded-lg border border-line bg-paper-raised p-3 text-sm leading-relaxed text-ink"
                      aria-label={`Cover letter untuk ${item.target.company}`}
                    />
                  </div>
                  </div>
                </details>
              </article>
            ))}

            <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-4">
              <Button variant="secondary" onClick={startOver}>
                Mulai optimasi baru
              </Button>
              <Link
                to="/jobs"
                className="rounded-xl border border-line bg-paper-raised px-5 py-2.5 text-xs font-semibold text-ink hover:border-forest"
              >
                Kembali ke lowongan
              </Link>
            </div>
          </section>
        )}

        {stage === "results" && analysis && (
          <div className="mt-8 space-y-6">
            <HireProbabilityGauge
              score={effectiveScore}
              matchedSkillsCount={(analysis.matchedSkills?.length || 0) + claimedSkills.length}
              missingSkillsCount={Math.max(0, (analysis.missingSkills?.length || 0) - claimedSkills.length)}
            />

            {/* Detailed Skills & Experience Breakdown */}
            <MatchAnalysis
              analysis={analysis}
              claimedSkills={claimedSkills}
              onToggleSkill={handleToggleSkill}
              score={effectiveScore}
            />

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={onGenerate} className="px-6 py-3 text-sm gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate CV Tailored Sempurna
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setTailoredCv(structuredCv);
                    setTailoredTab("cover_letter");
                    setStage("tailored");
                  }}
                  className="px-5 py-3 text-sm gap-2"
                >
                  <Mail className="h-4 w-4 text-forest" />
                  Buat Surat Lamaran AI
                </Button>
                <Button variant="secondary" onClick={startOver}>
                  Ulangi Dari Awal
                </Button>
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/80 px-4 py-2.5 text-xs font-bold text-amber-900 shadow-xs hover:border-amber-400 hover:scale-105 transition-all"
                >
                  <Award className="h-4 w-4 text-amber-600" />
                  <span>Pamerkan Skor LinkedIn 🚀</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveToTracker}
                disabled={savedToTracker}
                className={`flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-xs font-semibold shadow-xs transition-all ${
                  savedToTracker
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-paper-raised text-ink border-line hover:border-forest/60"
                }`}
              >
                {savedToTracker ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Tersimpan di Tracker Lamaran!
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="h-4 w-4 text-forest" />
                    Simpan ke Tracker Lamaran
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {stage === "generating" && (
          <div className="mt-8">
            <LoadingState
              messages={[
                "Menata ulang urutan poin pencapaian dengan action verbs...",
                "Mengintegrasikan keyword relevan tanpa mengubah fakta riwayat kerja...",
                "Memformat layout dokumen standar ATS...",
              ]}
            />
          </div>
        )}

        {stage === "tailored" && (tailoredCv || structuredCv) && (
          <div className="mt-8 space-y-6">
            {/* Segmented Tab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
              <div className="inline-flex rounded-xl border border-line bg-paper-raised p-1 text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setTailoredTab("cv")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-all ${
                    tailoredTab === "cv"
                      ? "bg-forest text-white shadow-xs"
                      : "text-ink-soft hover:text-ink hover:bg-paper"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>📄 CV Tailored</span>
                </button>
                {activeRevisions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTailoredTab("diff")}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-all ${
                      tailoredTab === "diff"
                        ? "bg-forest text-white shadow-xs"
                        : "text-ink-soft hover:text-ink hover:bg-paper"
                    }`}
                  >
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span>🔍 Tinjau Perubahan ({activeRevisions.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setTailoredTab("cover_letter")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-all ${
                    tailoredTab === "cover_letter"
                      ? "bg-forest text-white shadow-xs"
                      : "text-ink-soft hover:text-ink hover:bg-paper"
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  <span>✉️ Surat Lamaran AI</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-100 hover:scale-105 transition-all"
                >
                  <Award className="h-3.5 w-3.5 text-amber-600" />
                  <span>Kartu Skor LinkedIn (.PNG)</span>
                </button>
                <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={startOver}>
                  Optimasi Lowongan Lain
                </Button>
              </div>
            </div>

            {tailoredTab === "cv" ? (
              <div className="space-y-6">
                <ResumeQualityAssurance
                  originalCv={structuredCv}
                  tailoredCv={tailoredCv || structuredCv!}
                />
                {tailoredCv ? (
                  <CvPreview cv={tailoredCv} onChange={setTailoredCv} />
                ) : (
                  structuredCv && <CvPreview cv={structuredCv} onChange={setTailoredCv} />
                )}
              </div>
            ) : tailoredTab === "diff" ? (
              <InteractiveRewriteDiff
                revisions={activeRevisions}
                onApplyRevisions={handleApplyRevisions}
              />
            ) : (
              <CoverLetterSection
                cvData={tailoredCv || structuredCv!}
                jobDescription={jobDescription}
                onUsageChanged={refreshUser}
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <Button variant="secondary" onClick={startOver}>
                Optimasi CV Untuk Lowongan Lain
              </Button>

              <button
                type="button"
                onClick={handleSaveToTracker}
                disabled={savedToTracker}
                className={`flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-xs font-semibold shadow-xs transition-all ${
                  savedToTracker
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-forest text-white border-forest hover:bg-forest-dark"
                }`}
              >
                <BookmarkPlus className="h-4 w-4" />
                {savedToTracker ? "Sudah di Tracker Lamaran" : "Tambahkan ke Pipeline Tracker"}
              </button>
            </div>
          </div>
        )}

        {/* Profile Import Modal */}
        <ProfileImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          jobDescription={jobDescription}
          onImportSuccess={(res) => {
            setStructuredCv(res.cv);
            if (res.cv?.skills?.length) {
              if (user?.id) saveSessionCvSkills(user.id, res.cv.skills);
            }
            if (res.analysis) {
              setAnalysis(res.analysis);
              setStage("results");
            } else {
              setStage("form");
            }
          }}
        />

        {/* Shareable LinkedIn Scorecard Modal */}
        <ShareableScoreModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          score={effectiveScore}
          cv={tailoredCv || structuredCv}
          jobDescription={jobDescription}
        />
      </main>

      <footer className="border-t border-line py-6 text-center text-xs text-ink-soft">
        CV Optimizer — Bantu tinjau dan sesuaikan CV untuk lowongan yang dituju.
      </footer>
    </div>
  );
}
