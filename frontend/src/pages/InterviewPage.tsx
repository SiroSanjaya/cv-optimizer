import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/Header";
import { useAuth } from "../context/AuthContextValue";
import { getSessionCvSkills } from "../lib/sessionProfile";
import {
  startMockInterviewSession,
  evaluateMockInterviewAnswer,
  type MockInterviewQuestion,
  type InterviewEvaluation,
} from "../lib/api";
import {
  Sparkles,
  Mic,
  MicOff,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Award,
  ChevronRight,
  Check,
  BrainCircuit,
  MessageSquare,
  Eye,
  EyeOff,
  Languages,
  Volume2 as VolumeIcon,
} from "lucide-react";

interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal?: boolean;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
  resultIndex: number;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  const browserWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
}

export function InterviewPage() {
  const { user } = useAuth();

  // Setup state
  const [role, setRole] = useState(
    () => sessionStorage.getItem("interview_target_role") || "Software Engineer"
  );
  const [level, setLevel] = useState("Mid-Senior");
  const [interviewType, setInterviewType] = useState<"technical" | "behavioral" | "system_design" | "mixed">("mixed");
  const [questionCount, setQuestionCount] = useState(3);
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [voiceMode, setVoiceMode] = useState(
    () => typeof window !== "undefined" && Boolean(getSpeechRecognitionConstructor())
  );
  const [customJobDesc, setCustomJobDesc] = useState(
    () => sessionStorage.getItem("interview_target_job") || ""
  );

  // Flow state
  const [step, setStep] = useState<"setup" | "interviewing" | "completed">("setup");
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<MockInterviewQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState<MockInterviewQuestion | null>(null);
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [showQuestionText, setShowQuestionText] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // Answering state
  const [userAnswer, setUserAnswer] = useState("");
  const [currentEvaluation, setCurrentEvaluation] = useState<InterviewEvaluation | null>(null);
  const [evaluationsHistory, setEvaluationsHistory] = useState<{ question: MockInterviewQuestion; answer: string; evaluation: InterviewEvaluation }[]>([]);

  // Audio / Speech-to-text
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechAnswerRef = useRef("");
  const speechSupported =
    typeof window !== "undefined" && Boolean(getSpeechRecognitionConstructor());
  const speechOutputSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  // Check if target job description was passed from JobsPage
  useEffect(() => {
    sessionStorage.removeItem("interview_target_job");
    sessionStorage.removeItem("interview_target_role");
  }, []);

  const handleStartSession = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setSessionError(null);

    // Retrieve saved CV skills if available
    let cvSkills: string[] | undefined;
    if (user?.id) cvSkills = getSessionCvSkills(user.id);

    try {
      const generated = await startMockInterviewSession({
        role,
        level,
        type: interviewType,
        language,
        cvSkills,
        jobDescription: customJobDesc || undefined,
        questionCount,
      });

      if (generated && generated.length > 0) {
        speechAnswerRef.current = "";
        setQuestions(generated);
        setCurrentIndex(0);
        setActiveQuestion(generated[0]);
        setIsFollowUp(false);
        setShowQuestionText(false);
        setShowTranscript(false);
        setCurrentEvaluation(null);
        setUserAnswer("");
        speechAnswerRef.current = "";
        setEvaluationsHistory([]);
        setStep("interviewing");
      }
    } catch (err: any) {
      setSessionError(err instanceof Error ? err.message : "Gagal membuat sesi wawancara. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle Speech-to-Text
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setSessionError(
        language === "id"
          ? "Browser ini belum mendukung input suara. Aktifkan jawaban teks atau coba Chrome/Edge."
          : "This browser does not support speech input. Switch to text answers or try Chrome/Edge."
      );
      setVoiceMode(false);
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = language === "id" ? "id-ID" : "en-US";
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          if (recognitionRef.current !== recognition) return;
          const baseTranscript = speechAnswerRef.current.trim();
          let finalDelta = "";
          let interimTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const result = event.results[i];
            const text = result?.[0]?.transcript?.trim();
            if (!text) continue;

            if (result.isFinal) {
              finalDelta = finalDelta ? `${finalDelta} ${text}`.trim() : text;
            } else {
              interimTranscript = text;
            }
          }

          if (finalDelta) {
            speechAnswerRef.current = baseTranscript
              ? `${baseTranscript} ${finalDelta}`.trim()
              : finalDelta;
          }

          const stableTranscript = speechAnswerRef.current.trim();
          const preview = interimTranscript
            ? [stableTranscript, interimTranscript].filter(Boolean).join(" ")
            : stableTranscript;
          setUserAnswer(preview);
        };

        recognition.onerror = (event) => {
          if (recognitionRef.current !== recognition) return;
          recognitionRef.current = null;
          setIsRecording(false);
          setSessionError(
            event.error === "not-allowed"
              ? language === "id"
                ? "Izin mikrofon ditolak. Izinkan akses mikrofon di browser atau gunakan jawaban teks."
                : "Microphone access was denied. Allow microphone access or switch to text answers."
              : language === "id"
                ? "Input suara terputus. Coba aktifkan mikrofon lagi."
                : "Speech input stopped unexpectedly. Please try the microphone again."
          );
        };

        recognition.onend = () => {
          if (recognitionRef.current === recognition) {
            recognitionRef.current = null;
            setIsRecording(false);
          }
        };

        recognitionRef.current = recognition;
        setUserAnswer(speechAnswerRef.current);
        recognition.start();
        setIsRecording(true);
      } catch (err) {
        recognitionRef.current = null;
        setIsRecording(false);
        setSessionError(
          err instanceof Error
            ? err.message
            : language === "id"
              ? "Mikrofon tidak dapat dimulai."
              : "Could not start the microphone."
        );
      }
    }
  };

  const resetSpokenAnswer = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    speechAnswerRef.current = "";
    setIsRecording(false);
    setUserAnswer("");
    setShowTranscript(false);
    setSessionError(null);
  };

  const speakText = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    const locale = language === "id" ? "id-ID" : "en-US";
    utterance.lang = locale;
    utterance.rate = 0.96;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice =
      voices.find((voice) => voice.lang.toLowerCase() === locale.toLowerCase()) ??
      voices.find((voice) => voice.lang.toLowerCase().startsWith(language)) ??
      null;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [language]);

  useEffect(() => {
    if (step === "interviewing" && activeQuestion && voiceMode && speechOutputSupported) {
      const opening =
        language === "id"
          ? `Baik, kita mulai. ${activeQuestion.question}`
          : `All right, let's begin. ${activeQuestion.question}`;
      speakText(opening);
    }
  }, [activeQuestion, language, speechOutputSupported, speakText, step, voiceMode]);

  useEffect(() => {
    if (!currentEvaluation || !voiceMode || !speechOutputSupported) return;
    const response = currentEvaluation.interviewerResponse?.trim();
    const followUp = !isFollowUp ? currentEvaluation.followUpQuestion?.trim() : undefined;
    const spokenResponse = [response, followUp].filter(Boolean).join(" ");
    if (spokenResponse) speakText(spokenResponse);
  }, [currentEvaluation, isFollowUp, speakText, speechOutputSupported, voiceMode]);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    []
  );

  // Submit Answer for AI Evaluation
  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      setSessionError(
        language === "id"
          ? "Tulis atau rekam jawaban sebelum meminta umpan balik."
          : "Write or record an answer before requesting feedback."
      );
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    setEvaluating(true);
    setSessionError(null);
    const currentQ = activeQuestion ?? questions[currentIndex];
    if (!currentQ) {
      setEvaluating(false);
      setSessionError(
        language === "id"
          ? "Pertanyaan aktif tidak ditemukan. Coba mulai ulang sesi."
          : "The active question could not be found. Please restart the session."
      );
      return;
    }

    try {
      const evaluation = await evaluateMockInterviewAnswer({
        question: currentQ.question,
        answer: userAnswer,
        category: currentQ.category,
        targetSkillOrTopic: currentQ.targetSkillOrTopic,
        role,
        language,
      });

      setCurrentEvaluation(evaluation);
      setEvaluationsHistory((prev) => [
        ...prev,
        { question: currentQ, answer: userAnswer, evaluation },
      ]);
    } catch (err: any) {
      setSessionError(err instanceof Error ? err.message : "Gagal mengevaluasi jawaban. Coba lagi.");
    } finally {
      setEvaluating(false);
    }
  };

  // Move to Next Question or Complete
  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      const nextIndex = currentIndex + 1;
      speechAnswerRef.current = "";
      setCurrentIndex(nextIndex);
      setActiveQuestion(questions[nextIndex]);
      setIsFollowUp(false);
      setUserAnswer("");
      setCurrentEvaluation(null);
      setShowQuestionText(false);
      setShowTranscript(false);
    } else {
      if (speechOutputSupported) window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setStep("completed");
    }
  };

  const handleFollowUp = () => {
    const followUpQuestion = currentEvaluation?.followUpQuestion?.trim();
    if (!followUpQuestion || !activeQuestion || isFollowUp) return;

    speechAnswerRef.current = "";
    setActiveQuestion({
      ...activeQuestion,
      id: `${activeQuestion.id}-follow-up`,
      question: followUpQuestion,
      context:
        language === "id"
          ? "Pertanyaan lanjutan berdasarkan jawabanmu barusan."
          : "A follow-up based on your previous answer.",
      hint: "",
      keyConceptsExpected: [],
    });
    setIsFollowUp(true);
    setUserAnswer("");
    setCurrentEvaluation(null);
    setShowQuestionText(false);
    setShowTranscript(false);
  };

  // Calculate session metrics
  const avgScore = evaluationsHistory.length > 0
    ? Math.round(evaluationsHistory.reduce((acc, curr) => acc + curr.evaluation.score, 0) / evaluationsHistory.length)
    : 0;

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between">
      <Header />

      <main className="mx-auto w-full max-w-5xl px-6 py-8 flex-1">
        {/* Breadcrumb & Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-ink-soft">
            <Link to="/dashboard" className="hover:text-forest">Dashboard</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-semibold text-ink">Simulasi Wawancara AI</span>
          </div>

          {step !== "setup" && (
            <button
              onClick={() => {
                if (confirm("Keluar dari sesi wawancara saat ini? Progress akan direset.")) {
                  recognitionRef.current?.stop();
                  recognitionRef.current = null;
                  if (speechOutputSupported) window.speechSynthesis.cancel();
                  setIsRecording(false);
                  setIsSpeaking(false);
                  setQuestions([]);
                  setActiveQuestion(null);
                  setCurrentEvaluation(null);
                  setEvaluationsHistory([]);
                  setUserAnswer("");
                  setCurrentIndex(0);
                  setIsFollowUp(false);
                  setStep("setup");
                }
              }}
              className="flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-rose-600"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Mulai Ulang Sesi</span>
            </button>
          )}
        </div>

        {sessionError && (
          <div className="mb-5 rounded-lg border border-rust/30 bg-rust-tint px-4 py-3 text-sm text-rust" role="alert">
            {sessionError}
          </div>
        )}

        {/* STEP 1: SETUP SCREEN */}
        {step === "setup" && (
          <div className="rounded-2xl border border-line bg-paper-raised p-8 shadow-sm">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-forest-tint px-3 py-1 text-xs font-bold text-forest">
                <BrainCircuit className="h-3.5 w-3.5" />
                <span>AI Technical & Behavioral Mock Interview</span>
              </div>
              <h1 className="mt-3 font-serif text-3xl font-bold text-ink">
                Latihan Wawancara Kerja Berbasis AI
              </h1>
              <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                Latih jawaban untuk posisi yang dituju. AI memberi umpan balik berdasarkan jawaban yang kamu masukkan; hasilnya adalah bahan latihan, bukan prediksi hasil wawancara.
              </p>
            </div>

            <form onSubmit={handleStartSession} className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                    Posisi / Role Target
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Contoh: Senior Frontend Engineer, Backend Go/Node, DevOps"
                    className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-forest"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                    Seniority Level
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-forest"
                  >
                    <option value="Junior">Junior (0 - 2 tahun)</option>
                    <option value="Mid-Level">Mid-Level (2 - 5 tahun)</option>
                    <option value="Senior">Senior (5+ tahun)</option>
                    <option value="Lead / Principal">Tech Lead / Principal</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink">
                    <Languages className="h-3.5 w-3.5" />
                    Bahasa Wawancara
                  </label>
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value as "id" | "en")}
                    className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-forest"
                  >
                    <option value="id">Bahasa Indonesia</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                    Fokus Wawancara
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "mixed", label: "Campuran (Tech + STAR)" },
                      { id: "technical", label: "Deep Technical & Code" },
                      { id: "system_design", label: "System Design / Scalability" },
                      { id: "behavioral", label: "Behavioral (HR / STAR)" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setInterviewType(t.id as any)}
                        className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all ${
                          interviewType === t.id
                            ? "border-forest bg-forest-tint/60 text-forest font-bold shadow-sm"
                            : "border-line bg-paper text-ink-soft hover:border-line-dark"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                    Jumlah Pertanyaan
                  </label>
                  <div className="flex items-center gap-3">
                    {[3, 5, 7].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setQuestionCount(cnt)}
                        className={`flex-1 rounded-lg border py-2.5 text-center text-xs font-bold transition-all ${
                          questionCount === cnt
                            ? "border-forest bg-forest text-white shadow-sm"
                            : "border-line bg-paper text-ink hover:bg-paper-raised"
                        }`}
                      >
                        {cnt} Pertanyaan
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-forest/20 bg-forest-tint/40 p-3">
                  <input
                    type="checkbox"
                    checked={voiceMode}
                    onChange={(event) => setVoiceMode(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[var(--color-forest)]"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink">
                      Mode wawancara suara
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
                      Pewawancara membacakan pertanyaan dan merespons jawabanmu. Browser dapat memproses audio untuk membuat transkrip; transkrip dikirim ke AI untuk evaluasi.
                    </span>
                  </span>
                </label>
                {voiceMode && (!speechSupported || !speechOutputSupported) && (
                  <p className="text-xs text-amber-800">
                    Dukungan suara bergantung pada browser. Jika mikrofon atau audio tidak tersedia, sesi akan memakai kontrol yang didukung browser.
                  </p>
                )}

                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                    Deskripsi Pekerjaan / Job Requirements (Opsional)
                  </label>
                  <textarea
                    rows={4}
                    value={customJobDesc}
                    onChange={(e) => setCustomJobDesc(e.target.value)}
                    placeholder="Tempel deskripsi lowongan atau spesifikasi teknologi yang Anda targetkan agar pertanyaan lebih spesifik..."
                    className="w-full rounded-lg border border-line bg-paper p-3 text-xs text-ink outline-none focus:border-forest"
                  />
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col gap-3 border-t border-line pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                    <span className="flex items-center gap-1">
                      {voiceMode ? <Mic className="h-4 w-4 text-forest" /> : <MessageSquare className="h-4 w-4 text-forest" />}
                      {voiceMode ? "Pertanyaan & jawaban suara" : "Jawaban teks"}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-4 w-4 text-amber" />
                      Evaluasi STAR
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl bg-forest px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-forest-dark hover:shadow-lg disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                        <span>Menyiapkan Skenario AI...</span>
                      </>
                    ) : (
                      <>
                        <BrainCircuit className="h-4 w-4" />
                        <span>Mulai Simulasi Wawancara</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-ink-soft">
                  Membuat sesi dan mengevaluasi setiap jawaban (termasuk follow-up) memakai kuota AI.
                </p>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: LIVE INTERVIEWING ROOM */}
        {step === "interviewing" && activeQuestion && (
          <div className="space-y-6">
            {/* Top Progress & Context */}
            <div className="rounded-xl border border-line bg-paper-raised p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest text-xs font-bold text-white">
                  {currentIndex + 1}
                </span>
                <div>
                  <span className="text-xs font-semibold text-ink">
                    {isFollowUp
                      ? "Pertanyaan lanjutan"
                      : `Pertanyaan ${currentIndex + 1} dari ${questions.length}`}
                  </span>
                  <p className="text-[11px] text-ink-soft">
                    Kategori: <span className="font-semibold uppercase text-forest">{activeQuestion.category}</span> • Topik: {activeQuestion.targetSkillOrTopic}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-32 h-2 rounded-full bg-paper overflow-hidden border border-line">
                  <div
                    className="h-full bg-forest transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-forest">
                  {Math.round(((currentIndex + 1) / questions.length) * 100)}%
                </span>
              </div>
            </div>

            {/* Question Card */}
            <div className="rounded-2xl border border-line bg-gradient-to-br from-paper-raised to-paper p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-forest-tint px-2.5 py-0.5 text-[11px] font-bold text-forest">
                    <MessageSquare className="h-3 w-3" />
                    <span>Pewawancara Bertanya</span>
                  </div>

                  {voiceMode && !showQuestionText ? (
                    <div className="rounded-xl border border-forest/20 bg-forest-tint/40 p-4">
                        <p className="flex items-center gap-2 font-medium text-forest" role="status" aria-live="polite">
                          {isSpeaking && (
                            <span className="flex h-4 items-center gap-0.5" aria-hidden="true">
                              <span className="h-2 w-0.5 animate-pulse rounded-full bg-forest" />
                              <span className="h-4 w-0.5 animate-pulse rounded-full bg-forest [animation-delay:150ms]" />
                              <span className="h-2.5 w-0.5 animate-pulse rounded-full bg-forest [animation-delay:300ms]" />
                            </span>
                          )}
                          {isSpeaking
                            ? "Pewawancara sedang berbicara..."
                            : isFollowUp
                            ? "Dengarkan pertanyaan lanjutan, lalu jawab dengan suaramu."
                            : "Dengarkan pertanyaan, lalu jawab dengan suaramu."}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowQuestionText(true)}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-forest"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Tampilkan teks pertanyaan
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 className="font-serif text-xl font-bold leading-relaxed text-ink">
                        "{activeQuestion.question}"
                      </h2>
                      {activeQuestion.context && (
                        <div className="rounded-lg border border-line/60 bg-paper p-3 text-xs text-ink-soft">
                          <span className="mb-0.5 block font-bold text-ink">Konteks</span>
                          {activeQuestion.context}
                        </div>
                      )}
                      {voiceMode && (
                        <button
                          type="button"
                          onClick={() => setShowQuestionText(false)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-forest"
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                          Sembunyikan teks
                        </button>
                      )}
                    </>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!speechOutputSupported}
                  onClick={() => {
                    if (isSpeaking) {
                      window.speechSynthesis.cancel();
                      setIsSpeaking(false);
                    } else {
                      speakText(activeQuestion.question);
                    }
                  }}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                    isSpeaking
                      ? "border-forest bg-forest text-white"
                      : "border-line bg-paper-raised text-ink-soft hover:text-ink hover:border-forest"
                  }`}
                  title={isSpeaking ? "Hentikan Suara" : "Dengarkan Pertanyaan"}
                >
                  {isSpeaking ? <VolumeX className="h-5 w-5" /> : <VolumeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Answer Input Area (Only show if not yet evaluated) */}
            {!currentEvaluation && (
              <div className="rounded-2xl border border-line bg-paper-raised p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-ink">
                      {voiceMode ? "Jawaban lisan" : "Jawaban Anda"}
                    </span>
                    {voiceMode && (
                      <p className="mt-1 text-[11px] text-ink-soft">
                        {isRecording
                          ? "Mendengarkan jawabanmu..."
                          : userAnswer.trim()
                            ? "Transkrip tersimpan. Kamu bisa lanjut bicara atau rekam ulang."
                            : "Jawab dengan suaramu seperti sedang berbicara dengan interviewer."}
                      </p>
                    )}
                  </div>

                  {speechSupported && voiceMode && (
                    <div className="flex flex-wrap items-center gap-2">
                      {userAnswer.trim() && !isRecording && (
                        <button
                          type="button"
                          onClick={resetSpokenAnswer}
                          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-forest hover:text-forest"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Rekam ulang
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={toggleSpeechRecognition}
                        disabled={isSpeaking}
                        aria-pressed={isRecording}
                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                          isRecording
                            ? "bg-rose-600 text-white shadow-sm"
                            : "bg-forest text-white shadow-sm hover:bg-forest-dark"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                        <span>
                          {isRecording
                            ? "Selesai menjawab"
                            : userAnswer.trim()
                              ? "Lanjut bicara"
                              : "Mulai menjawab"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {voiceMode ? (
                  <div className="rounded-xl border border-line bg-paper p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-ink-soft" role="status" aria-live="polite">
                        {isRecording
                          ? "Sedang mendengarkan — tekan selesai setelah jawabanmu tuntas."
                          : userAnswer.trim()
                            ? `${userAnswer.trim().split(/\s+/).filter(Boolean).length} kata tertangkap`
                            : "Transkrip jawaban akan digunakan untuk evaluasi. Audio mentah tidak dikirim ke AI."}
                      </p>
                      {isRecording && (
                        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-700">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-600" />
                          REKAM
                        </span>
                      )}
                    </div>
                    {userAnswer.trim() && (
                      <button
                        type="button"
                        onClick={() => setShowTranscript((visible) => !visible)}
                        className="mt-2 text-xs font-semibold text-forest hover:underline"
                      >
                        {showTranscript ? "Sembunyikan transkrip" : "Lihat transkrip"}
                      </button>
                    )}
                    {showTranscript && (
                      <p className="mt-3 min-h-16 whitespace-pre-wrap rounded-lg border border-line bg-paper-raised p-3 text-sm leading-relaxed text-ink">
                        {userAnswer}
                      </p>
                    )}
                    {!speechSupported && (
                      <p className="mt-2 text-xs text-rust">
                        Browser belum mendukung mikrofon. Pilih jawaban teks pada pengaturan sesi.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <textarea
                      rows={6}
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Uraikan jawaban Anda secara terstruktur. Gunakan metode STAR (Situation, Task, Action, Result) dan sebutkan teknologi/tools yang Anda kuasai..."
                      className="w-full rounded-xl border border-line bg-paper p-4 text-sm text-ink outline-none focus:border-forest transition-colors leading-relaxed"
                    />
                    <div className="mt-1 flex items-center justify-between text-[11px] text-ink-soft">
                      <span>{userAnswer.trim().split(/\s+/).filter(Boolean).length} kata</span>
                      <span>Tips: Minimal 40-70 kata untuk evaluasi mendalam</span>
                    </div>
                  </div>
                )}

                {voiceMode && !isRecording && (
                  <button
                    type="button"
                    onClick={() => {
                      if (speechOutputSupported) window.speechSynthesis.cancel();
                      setIsSpeaking(false);
                      setVoiceMode(false);
                    }}
                    className="text-xs font-medium text-ink-soft underline underline-offset-2 hover:text-forest"
                  >
                    Ganti ke jawaban teks
                  </button>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSubmitAnswer}
                    disabled={evaluating || isRecording || !userAnswer.trim()}
                    className="flex items-center gap-2 rounded-xl bg-forest px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-forest-dark hover:shadow disabled:opacity-50 cursor-pointer"
                  >
                    {evaluating ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                        <span>AI Sedang Menganalisis Jawaban...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Kirim & Nilai Jawaban</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Real-Time Evaluation Result Card */}
            {currentEvaluation && (
              <div className="rounded-2xl border-2 border-forest/30 bg-paper-raised p-6 shadow-md space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest text-white font-serif text-xl font-bold shadow-sm">
                      {currentEvaluation.score}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-lg font-bold text-ink">
                          Evaluasi Jawaban AI
                        </h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          currentEvaluation.score >= 80 ? "bg-emerald-100 text-emerald-800" :
                          currentEvaluation.score >= 60 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {currentEvaluation.score >= 80 ? "Sangat Kuat" : currentEvaluation.score >= 60 ? "Cukup Baik" : "Perlu Peningkatan"}
                        </span>
                      </div>
                      <p className="text-xs text-ink-soft">
                        Umpan balik AI adalah panduan latihan, bukan penilaian dari perusahaan.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!isFollowUp && currentEvaluation.followUpQuestion && (
                      <button
                        type="button"
                        onClick={handleFollowUp}
                        className="flex items-center gap-2 rounded-xl border border-forest px-4 py-2.5 text-xs font-bold text-forest transition-colors hover:bg-forest-tint"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Jawab follow-up pewawancara
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-forest-dark"
                    >
                      <span>{currentIndex + 1 < questions.length ? "Pertanyaan Berikutnya" : "Lihat Hasil Akhir"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {currentEvaluation.interviewerResponse && (
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-forest/20 bg-forest-tint/40 p-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-forest">
                        Respons pewawancara
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-ink">
                        {currentEvaluation.interviewerResponse}
                      </p>
                    </div>
                    {speechOutputSupported && (
                      <button
                        type="button"
                        onClick={() => {
                          const spokenText = [
                            currentEvaluation.interviewerResponse,
                            !isFollowUp ? currentEvaluation.followUpQuestion : undefined,
                          ].filter(Boolean).join(" ");
                          speakText(spokenText);
                        }}
                        aria-label="Dengarkan respons pewawancara"
                        className="rounded-full p-2 text-forest hover:bg-white"
                      >
                        <VolumeIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* STAR Rubric Breakdown */}
                <div>
                  <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2">
                    Checklist Metode STAR
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { key: "situation", label: "Situation (S)", data: currentEvaluation.starRubric.situation },
                      { key: "task", label: "Task (T)", data: currentEvaluation.starRubric.task },
                      { key: "action", label: "Action (A)", data: currentEvaluation.starRubric.action },
                      { key: "result", label: "Result (R)", data: currentEvaluation.starRubric.result },
                    ].map((s) => (
                      <div
                        key={s.key}
                        className={`rounded-lg border p-3 ${
                          s.data.present
                            ? "border-emerald-200 bg-emerald-50/40 text-emerald-950"
                            : "border-amber-200 bg-amber-50/40 text-amber-950"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          {s.data.present ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          )}
                          <span>{s.label}</span>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                          {s.data.note}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technical Keywords & Accuracy */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-line bg-paper p-4">
                    <span className="text-xs font-bold text-ink flex items-center gap-1.5 mb-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Konsep / Keywords yang Berhasil Disebutkan:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentEvaluation.matchedKeywords.length > 0 ? (
                        currentEvaluation.matchedKeywords.map((kw, i) => (
                          <span key={i} className="rounded bg-emerald-100/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                            {kw}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-ink-soft italic">Belum ada keyword teknis spesifik</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-paper p-4">
                    <span className="text-xs font-bold text-ink flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      Keywords yang Terlewat (Perlu Ditambahkan):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentEvaluation.missingKeywords.length > 0 ? (
                        currentEvaluation.missingKeywords.map((kw, i) => (
                          <span key={i} className="rounded bg-amber-100/80 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            {kw}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-emerald-700 font-semibold">Lengkap! Tidak ada keyword krusial yang terlewat.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Strengths & Improvements */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      Kelebihan Jawaban:
                    </span>
                    <ul className="space-y-1 text-xs text-ink">
                      {currentEvaluation.strengths.map((str, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                      Area Peningkatan:
                    </span>
                    <ul className="space-y-1 text-xs text-ink">
                      {currentEvaluation.improvements.map((imp, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Ideal Model Answer */}
                <div className="rounded-xl border border-forest/20 bg-forest-tint/30 p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-forest mb-1.5">
                    <Award className="h-4 w-4" />
                    <span>Contoh Jawaban Ideal (Senior Level):</span>
                  </div>
                  <p className="text-xs text-ink leading-relaxed italic">
                    "{currentEvaluation.idealAnswer}"
                  </p>
                </div>

                {/* Follow-up question if any */}
                {currentEvaluation.followUpQuestion && !isFollowUp && (
                  <div className="rounded-lg bg-paper p-3 text-xs text-ink border border-line">
                    <span className="font-bold text-ink block mb-0.5">Pewawancara ingin menggali:</span>
                    <p className="text-ink-soft">{currentEvaluation.followUpQuestion}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: FINAL SESSION SCORECARD */}
        {step === "completed" && (
          <div className="rounded-2xl border border-line bg-paper-raised p-8 shadow-sm space-y-8">
            <div className="text-center max-w-lg mx-auto">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-forest text-white shadow-md mb-4">
                <Award className="h-8 w-8" />
              </div>
              <h2 className="font-serif text-3xl font-bold text-ink">
                Simulasi Wawancara Selesai!
              </h2>
              <p className="mt-2 text-xs text-ink-soft">
                Berikut ringkasan latihan dan masukan AI untuk posisi <b>{role} ({level})</b>. Ringkasan ini bukan prediksi hasil seleksi.
              </p>
            </div>

            {/* Score Stats Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-line bg-paper p-5 text-center">
                <span className="text-xs font-medium text-ink-soft">Skor Rata-Rata Jawaban</span>
                <p className="mt-2 font-serif text-4xl font-bold text-forest">
                  {avgScore} <span className="text-sm font-normal text-ink-soft">/ 100</span>
                </p>
                <span className="mt-1 block text-[11px] text-ink-soft">
                  {avgScore >= 80 ? "Tingkat Kesiapan Tinggi" : "Perlu Tambahan Latihan"}
                </span>
              </div>

              <div className="rounded-xl border border-line bg-paper p-5 text-center">
                <span className="text-xs font-medium text-ink-soft">Pertanyaan Diselesaikan</span>
                <p className="mt-2 font-serif text-4xl font-bold text-ink">
                  {evaluationsHistory.length}
                </p>
                <span className="mt-1 block text-[11px] text-ink-soft">
                  Dalam sesi latihan ini
                </span>
              </div>
            </div>

            {/* Detailed Questions Summary */}
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-ink">
                Ringkasan Jawaban & Masukan per Pertanyaan
              </h3>
              <div className="divide-y divide-line rounded-xl border border-line bg-paper overflow-hidden">
                {evaluationsHistory.map((item, idx) => (
                  <div key={idx} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-bold text-ink">
                        Q{idx + 1}: {item.question.question}
                      </span>
                      <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${
                        item.evaluation.score >= 80 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        Skor: {item.evaluation.score}/100
                      </span>
                    </div>

                    <div className="text-[11px] text-ink-soft line-clamp-2 bg-paper-raised p-2 rounded border border-line/60">
                      <b>Jawaban Anda:</b> "{item.answer}"
                    </div>

                    <div className="text-[11px] text-forest">
                      <b>Poin Peningkatan Utama:</b> {item.evaluation.improvements[0] || "Pertahankan akurasi penjelasan."}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={() => setStep("setup")}
                className="flex items-center gap-1.5 rounded-xl border border-line bg-paper-raised px-5 py-2.5 text-xs font-semibold text-ink hover:border-forest"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Mulai Sesi Baru</span>
              </button>

              <div className="flex items-center gap-3">
                <Link
                  to="/jobs"
                  className="rounded-xl border border-line bg-paper-raised px-5 py-2.5 text-xs font-semibold text-ink hover:border-forest"
                >
                  Cari Lowongan Sesuai
                </Link>
                <Link
                  to="/dashboard"
                  className="rounded-xl bg-forest px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-forest-dark"
                >
                  Kembali ke Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
