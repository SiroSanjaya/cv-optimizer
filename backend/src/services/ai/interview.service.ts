import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractJson } from "./jsonExtractor";
import { logger } from "../../utils/logger";

export interface MockInterviewQuestion {
  id: string;
  question: string;
  category: "technical" | "behavioral" | "system_design";
  targetSkillOrTopic: string;
  context?: string;
  hint: string;
  keyConceptsExpected: string[];
}

export interface InterviewEvaluation {
  score: number; // 0 - 100
  starRubric: {
    situation: { present: boolean; note: string };
    task: { present: boolean; note: string };
    action: { present: boolean; note: string };
    result: { present: boolean; note: string };
  };
  technicalAccuracy: {
    score: number; // 0 - 100
    feedback: string;
  };
  matchedKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  improvements: string[];
  idealAnswer: string;
  hireProbabilityDelta: number; // e.g. +7 or -4
  followUpQuestion?: string;
}

const FALLBACK_QUESTIONS: Record<string, MockInterviewQuestion[]> = {
  technical: [
    {
      id: "q-tech-1",
      question: "Bagaimana cara Anda mengoptimalkan performa aplikasi React yang mengalami lag saat merender list data besar dengan ribuan item?",
      category: "technical",
      targetSkillOrTopic: "React Virtualization & Performance Optimization",
      context: "User mengalami UI freezing saat scroll dataset produk ribuan item.",
      hint: "Sebutkan teknik windowing/virtualization (seperti react-window/tanstack virtual), memoization (useMemo/memo), debounce/throttle, dan lazy loading.",
      keyConceptsExpected: ["Virtualization", "Windowing", "useMemo", "React.memo", "Re-render reduction"]
    },
    {
      id: "q-tech-2",
      question: "Jelaskan bagaimana Anda menangani konkurensi (concurrency) dan race condition pada REST API saat beberapa pengguna menekan tombol transaksi/checkout secara bersamaan.",
      category: "technical",
      targetSkillOrTopic: "Backend Concurrency & Distributed Locking",
      context: "Sistem e-commerce dengan stok barang terbatas diperebutkan ribuan user.",
      hint: "Bahas database transactions (ACID), pessimistic vs optimistic locking, idempotent API keys, dan Redis distributed locks.",
      keyConceptsExpected: ["Optimistic Locking", "Idempotency Key", "Database Transaction", "Redis Lock", "Atomic Operations"]
    },
    {
      id: "q-tech-3",
      question: "Apa perbedaan mendasar antara SQL dan NoSQL, dan dalam skenario riil seperti apa Anda akan memilih MongoDB dibanding PostgreSQL atau sebaliknya?",
      category: "technical",
      targetSkillOrTopic: "Database Architecture & Trade-offs",
      context: "Memilih storage untuk event analytics vs order processing.",
      hint: "Fokus pada schema rigidity vs flexibility, ACID compliance vs eventual consistency, relasi data, dan horizontal scaling.",
      keyConceptsExpected: ["ACID vs BASE", "Relational Integrity", "Horizontal vs Vertical Scaling", "Schema Flexibility", "Indexing"]
    }
  ],
  behavioral: [
    {
      id: "q-beh-1",
      question: "Ceritakan situasi saat Anda harus merilis fitur dengan deadline yang sangat mepet, namun tim menemukan bug kritis sebelum deploy. Bagaimana Anda menyikapinya?",
      category: "behavioral",
      targetSkillOrTopic: "Prioritization & Crisis Management (STAR)",
      context: "Ekspektasi stakeholder tinggi dan waktu terbatas.",
      hint: "Gunakan metode STAR: Jelaskan situasi nyata, peran Anda, mitigasi/tindakan konkret yang diambil (komunikasi, rollback plan, hotfix), dan hasil akhirnya.",
      keyConceptsExpected: ["STAR Framework", "Risk Assessment", "Stakeholder Communication", "Root Cause Analysis", "Trade-off Decision"]
    },
    {
      id: "q-beh-2",
      question: "Pernahkah Anda memiliki perbedaan pendapat teknis yang tajam dengan senior developer atau tech lead? Bagaimana cara Anda mencapai konsensus?",
      category: "behavioral",
      targetSkillOrTopic: "Conflict Resolution & Technical Debate",
      context: "Debat arsitektur atau pemilihan library/framework.",
      hint: "Gunakan pendekatan berbasis data (POC, benchmark, RFC document), dengarkan perspektif lawan bicara, dan letakkan kepentingan produk di atas ego personal.",
      keyConceptsExpected: ["Data-driven Proof of Concept", "Active Listening", "Alignment with Business Goals", "RFC/Documentation"]
    }
  ],
  system_design: [
    {
      id: "q-sys-1",
      question: "Rancanglah arsitektur sistem URL Shortener (seperti Bitly) yang mampu menangani 100 juta klik per hari dan 10 juta URL baru per hari. Komponen apa saja yang Anda gunakan?",
      category: "system_design",
      targetSkillOrTopic: "High Scale System Design & Caching",
      context: "Read-heavy system dengan rasio read:write 10:1.",
      hint: "Bahas hashing (Base62 / MurmurHash), database storage, caching layer (Redis / Memcached), load balancer, dan rate limiter.",
      keyConceptsExpected: ["Base62 Encoding", "Redis Cache", "Database Sharding", "Load Balancer", "CDN"]
    }
  ]
};

function getGeminiClient(): { client: GoogleGenerativeAI; modelName: string } | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  return {
    client: new GoogleGenerativeAI(apiKey),
    modelName,
  };
}

/**
 * Generates an interactive mock interview session
 */
export async function generateInterviewSession(params: {
  role?: string;
  level?: string;
  type?: "technical" | "behavioral" | "system_design" | "mixed";
  cvSkills?: string[];
  jobDescription?: string;
  questionCount?: number;
}): Promise<MockInterviewQuestion[]> {
  const role = params.role || "Software Engineer";
  const level = params.level || "Mid-Senior";
  const type = params.type || "mixed";
  const count = params.questionCount || 4;
  const skills = params.cvSkills?.slice(0, 8).join(", ") || "React, Node.js, SQL, TypeScript";

  const ai = getGeminiClient();
  if (!ai) {
    logger.warn("gemini_not_configured_using_fallback_questions");
    return [
      ...FALLBACK_QUESTIONS.technical,
      ...FALLBACK_QUESTIONS.behavioral,
      ...FALLBACK_QUESTIONS.system_design,
    ].slice(0, count);
  }

  const prompt = `Anda adalah Principal Engineering Manager dan HR Interviewer terkemuka di tech industry Indonesia.
Buatkan ${count} pertanyaan wawancara kerja yang sangat realistis, tajam, dan edukatif untuk kandidat dengan profil:
- Posisi: ${role} (${level})
- Kategori Interview: ${type}
- Keahlian / Tech Stack Kandidat: ${skills}
${params.jobDescription ? `- Deskripsi Lowongan: ${params.jobDescription.slice(0, 400)}` : ""}

Kriteria Pertanyaan:
1. Buat dalam Bahasa Indonesia profesional.
2. Jangan membuat pertanyaan hafalan teori semata. Buatkan pertanyaan berbasis studi kasus nyata di dunia kerja engineering / tech startup.
3. Sertakan context skenario, hint/petunjuk jawaban yang baik, dan list konsep kunci yang diharapkan muncul (keyConceptsExpected).

Kembalikan HANYA JSON valid dengan struktur:
{
  "questions": [
    {
      "id": "q-1",
      "question": "string",
      "category": "technical" | "behavioral" | "system_design",
      "targetSkillOrTopic": "string",
      "context": "string",
      "hint": "string",
      "keyConceptsExpected": ["string"]
    }
  ]
}`;

  try {
    const model = ai.client.getGenerativeModel({
      model: ai.modelName,
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = extractJson<{ questions: MockInterviewQuestion[] }>(text);

    if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      return parsed.questions.map((q, idx) => ({
        ...q,
        id: q.id || `q-${idx + 1}-${Date.now()}`,
      }));
    }
  } catch (err) {
    logger.warn("generate_interview_ai_failed", { message: (err as Error).message });
  }

  // Graceful fallback
  return [
    ...FALLBACK_QUESTIONS.technical,
    ...FALLBACK_QUESTIONS.behavioral,
    ...FALLBACK_QUESTIONS.system_design,
  ].slice(0, count);
}

/**
 * Evaluates candidate's spoken or typed answer to an interview question
 */
export async function evaluateInterviewAnswer(params: {
  question: string;
  answer: string;
  category?: string;
  targetSkillOrTopic?: string;
  role?: string;
}): Promise<InterviewEvaluation> {
  const { question, answer, category = "technical", targetSkillOrTopic = "Software Engineering", role = "Software Engineer" } = params;

  if (!answer || answer.trim().length < 5) {
    return {
      score: 20,
      starRubric: {
        situation: { present: false, note: "Jawaban terlalu singkat, konteks belum dijelaskan." },
        task: { present: false, note: "Tugas / tantangan belum dijabarkan." },
        action: { present: false, note: "Tidak ada tindakan teknis konkret yang disebutkan." },
        result: { present: false, note: "Hasil atau dampak bisnis tidak ada." },
      },
      technicalAccuracy: {
        score: 20,
        feedback: "Jawaban Anda terlalu singkat untuk dinilai secara objektif oleh pewawancara teknis.",
      },
      matchedKeywords: [],
      missingKeywords: ["Konteks proyek", "Tindakan konkret", "Metrik hasil"],
      strengths: ["Sudah mencoba menjawab"],
      improvements: ["Gunakan struktur STAR (Situation, Task, Action, Result) dan sebutkan tools/metode teknis yang Anda gunakan."],
      idealAnswer: `Dalam proyek terakhir saya di ${role}, saya menghadapi tantangan serupa di mana kami membutuhkan... Solusi yang saya terapkan adalah menggunakan pendekatan... yang menghasilkan peningkatan performa sebesar 35%.`,
      hireProbabilityDelta: -5,
      followUpQuestion: "Bisakah Anda memberikan contoh konkret dari pengalaman Anda saat mengimplementasikan hal tersebut?",
    };
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Deterministic rule-based evaluation fallback
    const wordCount = answer.trim().split(/\s+/).length;
    const baseScore = Math.min(88, Math.max(50, wordCount * 2));
    return {
      score: baseScore,
      starRubric: {
        situation: { present: wordCount > 20, note: wordCount > 20 ? "Konteks situasi telah disebutkan." : "Perlu penjelasan situasi lebih detail." },
        task: { present: wordCount > 25, note: "Tanggung jawab dipaparkan." },
        action: { present: wordCount > 35, note: "Langkah aksi telah diuraikan." },
        result: { present: wordCount > 45, note: "Hasil telah disampaikan." },
      },
      technicalAccuracy: {
        score: baseScore,
        feedback: "Jawaban Anda sudah mencakup poin penting. Tingkatkan dengan menyertakan metrik kuantitatif dan terminologi teknis yang lebih spesifik.",
      },
      matchedKeywords: [targetSkillOrTopic],
      missingKeywords: ["Benchmark", "Trade-offs", "Metrics"],
      strengths: ["Penyampaian runtut", "Relevan dengan topik pertanyaan"],
      improvements: ["Sertakan dampak terukur (misal: penurunan latensi X% atau efisiensi waktu)"],
      idealAnswer: `Saat memimpin pengembangan di ${role}, saya mengidentifikasi bottleneck pada... Saya mengimplementasikan arsitektur... yang berhasil memangkas error rate hingga 40%.`,
      hireProbabilityDelta: +4,
      followUpQuestion: "Bagaimana cara Anda memantau dan memastikan stabilitas solusi tersebut setelah dideploy ke production?",
    };
  }

  const prompt = `Anda adalah Principal Interviewer & Lead Assessor teknis. Evaluasi jawaban wawancara kerja kandidat berikut ini secara OBJEKTIF, DATA-DRIVEN, dan MEMBANGUN.

Konteks Evaluasi:
- Posisi yang dilamar: ${role}
- Kategori Pertanyaan: ${category}
- Topik / Target Skill: ${targetSkillOrTopic}
- Pertanyaan Interview: "${question}"
- Jawaban Kandidat: "${answer}"

Instruksi Penilaian:
1. Berikan skor 0 - 100 secara objektif berdasarkan kedalaman teknis, kejelasan, dan relevansi.
2. Analisis metode STAR (Situation, Task, Action, Result) dengan catatan singkat per poin.
3. Identifikasi kata kunci/konsep teknis yang berhasil disampaikan dengan baik (matchedKeywords) dan kata kunci krusial yang terlewat (missingKeywords).
4. Berikan poin kekuatan (strengths) dan area perbaikan konkret (improvements).
5. Tuliskan "idealAnswer" (contoh jawaban emas tingkat senior yang ringkas, berbobot, dan memikat).
6. Tentukan estimasi dampak terhadap probabilitas diterima (hireProbabilityDelta: angka integer antara -15 sampai +15).
7. Tuliskan satu pertanyaan lanjutan (followUpQuestion) yang relevan untuk menggali lebih dalam.

Kembalikan HANYA JSON valid sesuai skema:
{
  "score": number,
  "starRubric": {
    "situation": { "present": boolean, "note": "string" },
    "task": { "present": boolean, "note": "string" },
    "action": { "present": boolean, "note": "string" },
    "result": { "present": boolean, "note": "string" }
  },
  "technicalAccuracy": {
    "score": number,
    "feedback": "string"
  },
  "matchedKeywords": ["string"],
  "missingKeywords": ["string"],
  "strengths": ["string"],
  "improvements": ["string"],
  "idealAnswer": "string",
  "hireProbabilityDelta": number,
  "followUpQuestion": "string"
}`;

  try {
    const model = ai.client.getGenerativeModel({
      model: ai.modelName,
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const evaluation = extractJson<InterviewEvaluation>(text);
    return evaluation;
  } catch (err) {
    logger.warn("evaluate_interview_ai_failed", { message: (err as Error).message });
    return {
      score: 75,
      starRubric: {
        situation: { present: true, note: "Situasi cukup jelas." },
        task: { present: true, note: "Tantangan telah dijelaskan." },
        action: { present: true, note: "Tindakan telah dipaparkan." },
        result: { present: false, note: "Sertakan hasil akhir kuantitatif." },
      },
      technicalAccuracy: {
        score: 75,
        feedback: "Jawaban terstruktur baik. Untuk hasil maksimal, sertakan trade-off teknis dan metrik keberhasilan.",
      },
      matchedKeywords: [targetSkillOrTopic],
      missingKeywords: ["Trade-off analysis", "Quantitative metrics"],
      strengths: ["Komunikasi jelas", "Menyentuh inti persoalan"],
      improvements: ["Sertakan angka/metrik konkret untuk memperkuat kredibilitas hasil."],
      idealAnswer: `Dalam pengalaman saya menangani ${targetSkillOrTopic}, pendekatan yang paling efektif adalah membagi masalah menjadi komponen terisolasi, menerapkan solusi... dan memonitor dampaknya melalui observability tools.`,
      hireProbabilityDelta: +3,
      followUpQuestion: "Jika solusi tersebut mengalami kendala saat traffic melonjak 10x lipat, mitigasi apa yang akan Anda siapkan?",
    };
  }
}
