import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/Header";
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
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Award,
  ChevronRight,
  Lightbulb,
  Check,
  BrainCircuit,
  MessageSquare,
} from "lucide-react";

export function InterviewPage() {


  // Setup state
  const [role, setRole] = useState("Software Engineer");
  const [level, setLevel] = useState("Mid-Senior");
  const [interviewType, setInterviewType] = useState<"technical" | "behavioral" | "system_design" | "mixed">("mixed");
  const [questionCount, setQuestionCount] = useState(3);
  const [customJobDesc, setCustomJobDesc] = useState("");

  // Flow state
  const [step, setStep] = useState<"setup" | "interviewing" | "completed">("setup");
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [questions, setQuestions] = useState<MockInterviewQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Answering state
  const [userAnswer, setUserAnswer] = useState("");
  const [currentEvaluation, setCurrentEvaluation] = useState<InterviewEvaluation | null>(null);
  const [evaluationsHistory, setEvaluationsHistory] = useState<{ question: MockInterviewQuestion; answer: string; evaluation: InterviewEvaluation }[]>([]);

  // Audio / Speech-to-text
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Check if target job description was passed from JobsPage
  useEffect(() => {
    const passedJd = sessionStorage.getItem("interview_target_job");
    if (passedJd) {
      setCustomJobDesc(passedJd);
      const passedRole = sessionStorage.getItem("interview_target_role");
      if (passedRole) setRole(passedRole);
      // Clean up after reading
      sessionStorage.removeItem("interview_target_job");
      sessionStorage.removeItem("interview_target_role");
    }

    // Check SpeechRecognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  const handleStartSession = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    // Retrieve saved CV skills if available
    let cvSkills: string[] | undefined;
    const saved = sessionStorage.getItem("user_cv_skills");
    if (saved) {
      try {
        cvSkills = JSON.parse(saved);
      } catch {}
    }

    try {
      const generated = await startMockInterviewSession({
        role,
        level,
        type: interviewType,
        cvSkills,
        jobDescription: customJobDesc || undefined,
        questionCount,
      });

      if (generated && generated.length > 0) {
        setQuestions(generated);
        setCurrentIndex(0);
        setCurrentEvaluation(null);
        setUserAnswer("");
        setEvaluationsHistory([]);
        setStep("interviewing");
      }
    } catch (err: any) {
      alert(err.message || "Gagal membuat sesi wawancara. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle Speech-to-Text
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser Anda belum mendukung input suara Speech-to-Text. Silakan ketik langsung jawaban Anda.");
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "id-ID";
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          setUserAnswer((prev) => prev ? `${prev} ${transcript}` : transcript);
        };

        recognition.onerror = (err: any) => {
          console.error("Speech recognition error:", err);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
      } catch (err) {
        console.error(err);
        setIsRecording(false);
      }
    }
  };

  // Read out question with SpeechSynthesis
  const speakQuestion = (text: string) => {
    if (!("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Submit Answer for AI Evaluation
  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      alert("Mohon ketik atau rekam suara jawaban Anda terlebih dahulu.");
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    setEvaluating(true);
    const currentQ = questions[currentIndex];

    try {
      const evaluation = await evaluateMockInterviewAnswer({
        question: currentQ.question,
        answer: userAnswer,
        category: currentQ.category,
        targetSkillOrTopic: currentQ.targetSkillOrTopic,
        role,
      });

      setCurrentEvaluation(evaluation);
      setEvaluationsHistory((prev) => [
        ...prev,
        { question: currentQ, answer: userAnswer, evaluation },
      ]);
    } catch (err: any) {
      alert(err.message || "Gagal mengevaluasi jawaban. Coba lagi.");
    } finally {
      setEvaluating(false);
    }
  };

  // Move to Next Question or Complete
  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setUserAnswer("");
      setCurrentEvaluation(null);
    } else {
      setStep("completed");
    }
  };

  // Calculate session metrics
  const avgScore = evaluationsHistory.length > 0
    ? Math.round(evaluationsHistory.reduce((acc, curr) => acc + curr.evaluation.score, 0) / evaluationsHistory.length)
    : 0;

  const totalProbDelta = evaluationsHistory.reduce((acc, curr) => acc + (curr.evaluation.hireProbabilityDelta || 0), 0);
  const projectedProb = Math.min(96, Math.max(35, 75 + totalProbDelta));

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
                Tingkatkan probabilitas lolos wawancara Anda. AI kami akan mengajukan studi kasus nyata, mengevaluasi kedalaman teknis dan metode STAR Anda, mendeteksi keyword yang terlewat, serta memberikan contoh <b>Jawaban Ideal</b> tingkat Senior Engineer.
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

              <div className="md:col-span-2 pt-4 border-t border-line flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-ink-soft">
                  <span className="flex items-center gap-1">
                    <Mic className="h-4 w-4 text-forest" />
                    Mendukung Suara (Mic)
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-4 w-4 text-amber" />
                    Evaluasi STAR Real-time
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
            </form>
          </div>
        )}

        {/* STEP 2: LIVE INTERVIEWING ROOM */}
        {step === "interviewing" && questions.length > 0 && (
          <div className="space-y-6">
            {/* Top Progress & Context */}
            <div className="rounded-xl border border-line bg-paper-raised p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest text-xs font-bold text-white">
                  {currentIndex + 1}
                </span>
                <div>
                  <span className="text-xs font-semibold text-ink">
                    Pertanyaan {currentIndex + 1} dari {questions.length}
                  </span>
                  <p className="text-[11px] text-ink-soft">
                    Kategori: <span className="font-semibold uppercase text-forest">{questions[currentIndex].category}</span> • Topik: {questions[currentIndex].targetSkillOrTopic}
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

                  <h2 className="font-serif text-xl font-bold text-ink leading-relaxed">
                    "{questions[currentIndex].question}"
                  </h2>

                  {questions[currentIndex].context && (
                    <div className="rounded-lg bg-paper p-3 text-xs text-ink-soft border border-line/60">
                      <span className="font-bold text-ink block mb-0.5">Skenario Lapangan:</span>
                      {questions[currentIndex].context}
                    </div>
                  )}

                  {questions[currentIndex].hint && (
                    <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50/80 rounded-lg p-3 border border-amber-200/60">
                      <Lightbulb className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <span className="font-semibold">Tips Menjawab: </span>
                        {questions[currentIndex].hint}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => speakQuestion(questions[currentIndex].question)}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all ${
                    isSpeaking
                      ? "border-forest bg-forest text-white"
                      : "border-line bg-paper-raised text-ink-soft hover:text-ink hover:border-forest"
                  }`}
                  title={isSpeaking ? "Hentikan Suara" : "Dengarkan Pertanyaan"}
                >
                  {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
              </div>

              {/* Expected Concepts */}
              {questions[currentIndex].keyConceptsExpected?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-line flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-ink-soft">Konsep Kunci yang Dinilai:</span>
                  {questions[currentIndex].keyConceptsExpected.map((kc, i) => (
                    <span key={i} className="rounded bg-paper px-2 py-0.5 text-[10px] font-medium text-ink border border-line">
                      {kc}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Answer Input Area (Only show if not yet evaluated) */}
            {!currentEvaluation && (
              <div className="rounded-2xl border border-line bg-paper-raised p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink uppercase tracking-wider">
                    Jawaban Anda (Ketik atau Bicara via Mic)
                  </span>

                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                        isRecording
                          ? "bg-rose-500 text-white animate-pulse"
                          : "bg-forest-tint text-forest hover:bg-forest hover:text-white"
                      }`}
                    >
                      {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                      <span>{isRecording ? "Sedang Merekam... (Klik Stop)" : "Gunakan Mic (Bicara)"}</span>
                    </button>
                  )}
                </div>

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

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSubmitAnswer}
                    disabled={evaluating || !userAnswer.trim()}
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
                        Dampak ke probabilitas diterima:{" "}
                        <span className={currentEvaluation.hireProbabilityDelta >= 0 ? "font-bold text-emerald-600" : "font-bold text-rose-600"}>
                          {currentEvaluation.hireProbabilityDelta >= 0 ? `+${currentEvaluation.hireProbabilityDelta}%` : `${currentEvaluation.hireProbabilityDelta}%`}
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-forest-dark transition-all"
                  >
                    <span>{currentIndex + 1 < questions.length ? "Pertanyaan Berikutnya" : "Lihat Hasil Akhir"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

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
                {currentEvaluation.followUpQuestion && (
                  <div className="rounded-lg bg-paper p-3 text-xs text-ink border border-line">
                    <span className="font-bold text-ink block mb-0.5">Pertanyaan Lanjutan yang Mungkin Diajukan:</span>
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
                Berikut adalah laporan komprehensif performa dan estimasi probabilitas keterterimaan Anda untuk posisi <b>{role} ({level})</b>.
              </p>
            </div>

            {/* Score Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <span className="text-xs font-medium text-ink-soft">Estimasi Probabilitas Lolos</span>
                <p className="mt-2 font-serif text-4xl font-bold text-indigo-600">
                  {projectedProb}%
                </p>
                <span className="mt-1 block text-[11px] text-ink-soft">
                  Berdasarkan pemenuhan STAR & Kedalaman Teknis
                </span>
              </div>

              <div className="rounded-xl border border-line bg-paper p-5 text-center">
                <span className="text-xs font-medium text-ink-soft">Pertanyaan Diselesaikan</span>
                <p className="mt-2 font-serif text-4xl font-bold text-ink">
                  {evaluationsHistory.length}
                </p>
                <span className="mt-1 block text-[11px] text-ink-soft">
                  Studi Kasus & Tantangan Nyata
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
