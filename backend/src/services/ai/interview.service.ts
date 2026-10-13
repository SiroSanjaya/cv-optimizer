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
  interviewerResponse?: string;
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

const FALLBACK_QUESTIONS_EN: Record<string, MockInterviewQuestion[]> = {
  technical: [
    {
      id: "q-tech-1",
      question: "How would you improve a React application that freezes while rendering a list of thousands of items?",
      category: "technical",
      targetSkillOrTopic: "React virtualization and performance optimization",
      context: "Users experience a frozen interface while scrolling through a large product catalog.",
      hint: "Discuss virtualization, memoization, reducing re-renders, and lazy loading.",
      keyConceptsExpected: ["Virtualization", "Memoization", "Re-render reduction", "Lazy loading"],
    },
    {
      id: "q-tech-2",
      question: "How would you prevent race conditions when many users try to purchase the last item at the same time?",
      category: "technical",
      targetSkillOrTopic: "Backend concurrency and distributed systems",
      context: "An e-commerce checkout receives simultaneous requests for limited stock.",
      hint: "Discuss database transactions, optimistic locking, idempotency, and atomic operations.",
      keyConceptsExpected: ["Database transactions", "Optimistic locking", "Idempotency", "Atomic operations"],
    },
    {
      id: "q-tech-3",
      question: "How would you choose between a relational database and a document database for a new product?",
      category: "technical",
      targetSkillOrTopic: "Database architecture and trade-offs",
      context: "The product has transactional workflows and flexible event data.",
      hint: "Explain consistency, relationships, schema flexibility, query patterns, and operational trade-offs.",
      keyConceptsExpected: ["ACID", "Data relationships", "Schema flexibility", "Query patterns"],
    },
  ],
  behavioral: [
    {
      id: "q-beh-1",
      question: "Tell me about a time you had to deliver under a tight deadline and discovered a critical bug just before release. What did you do?",
      category: "behavioral",
      targetSkillOrTopic: "Prioritization and incident management",
      context: "Stakeholder expectations are high and the release window is limited.",
      hint: "Describe the situation, your responsibility, the actions you took, and the outcome.",
      keyConceptsExpected: ["STAR framework", "Risk assessment", "Communication", "Root cause analysis"],
    },
    {
      id: "q-beh-2",
      question: "Tell me about a time you disagreed with a teammate about a technical decision. How did you reach an outcome?",
      category: "behavioral",
      targetSkillOrTopic: "Conflict resolution and collaboration",
      context: "The team has competing views on an architecture or library choice.",
      hint: "Explain how you listened, used evidence, and aligned the decision with product needs.",
      keyConceptsExpected: ["Active listening", "Evidence-based decisions", "Collaboration", "Product goals"],
    },
  ],
  system_design: [
    {
      id: "q-sys-1",
      question: "Design a URL-shortening service that handles 100 million redirects per day. What components would you choose and why?",
      category: "system_design",
      targetSkillOrTopic: "Scalable system design and caching",
      context: "The service has far more reads than writes and must remain available during traffic spikes.",
      hint: "Cover identifier generation, storage, caching, load balancing, and abuse prevention.",
      keyConceptsExpected: ["Identifier generation", "Caching", "Database scaling", "Load balancing", "Rate limiting"],
    },
  ],
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
  language?: "id" | "en";
  cvSkills?: string[];
  jobDescription?: string;
  questionCount?: number;
}): Promise<MockInterviewQuestion[]> {
  const role = params.role || "Software Engineer";
  const level = params.level || "Mid-Senior";
  const type = params.type || "mixed";
  const language = params.language || "id";
  const count = params.questionCount || 4;
  const fallbackQuestions = language === "en" ? FALLBACK_QUESTIONS_EN : FALLBACK_QUESTIONS;
  const skills = params.cvSkills?.slice(0, 8).join(", ") || "React, Node.js, SQL, TypeScript";

  const ai = getGeminiClient();
  if (!ai) {
    logger.warn("gemini_not_configured_using_fallback_questions");
    return [
      ...fallbackQuestions.technical,
      ...fallbackQuestions.behavioral,
      ...fallbackQuestions.system_design,
    ].slice(0, count);
  }

  const prompt = language === "en"
    ? `You are an experienced engineering manager and interview coach.
Create ${count} realistic, challenging, and useful interview questions for a candidate with this profile:
- Role: ${role} (${level})
- Interview category: ${type}
- Candidate skills / tech stack: ${skills}
${params.jobDescription ? `- Job description: ${params.jobDescription.slice(0, 400)}` : ""}

Requirements:
1. Write every question and supporting field in clear, professional English.
2. Prefer realistic engineering scenarios over trivia.
3. Include context, a private answer hint, and key concepts to evaluate.

Return ONLY valid JSON:
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
}`
    : `Anda adalah Principal Engineering Manager dan HR Interviewer terkemuka di tech industry Indonesia.
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
    ...fallbackQuestions.technical,
    ...fallbackQuestions.behavioral,
    ...fallbackQuestions.system_design,
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
  language?: "id" | "en";
}): Promise<InterviewEvaluation> {
  const { question, answer, category = "technical", targetSkillOrTopic = "Software Engineering", role = "Software Engineer" } = params;
  const language = params.language || "id";

  if (!answer || answer.trim().length < 5) {
    if (language === "en") {
      return {
        score: 20,
        starRubric: {
          situation: { present: false, note: "The context is not clear enough yet." },
          task: { present: false, note: "The challenge or responsibility is missing." },
          action: { present: false, note: "No concrete action has been described." },
          result: { present: false, note: "The outcome or impact is missing." },
        },
        technicalAccuracy: {
          score: 20,
          feedback: "There is not enough detail to assess this answer fairly.",
        },
        matchedKeywords: [],
        missingKeywords: ["Project context", "Concrete action", "Measurable outcome"],
        strengths: ["You made an attempt to answer."],
        improvements: ["Use a real example and explain the context, your role, actions, and outcome."],
        idealAnswer: "Structure your answer around the situation, your responsibility, the actions you personally took, and the outcome.",
        interviewerResponse: "I appreciate you giving that a try. Let's make the example a little more specific.",
        followUpQuestion: "Could you share a specific example from your experience?",
      };
    }
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
      idealAnswer: "Susun jawaban dengan menjelaskan konteks, tanggung jawab, tindakan yang kamu ambil, dan hasil yang benar-benar terjadi.",
      interviewerResponse: "Terima kasih. Boleh ceritakan sedikit lebih spesifik supaya saya memahami konteks pengalamanmu?",
      followUpQuestion: "Bisakah Anda memberikan contoh konkret dari pengalaman Anda saat mengimplementasikan hal tersebut?",
    };
  }

  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("AI interviewer belum dikonfigurasi. Umpan balik jawaban tidak dapat dibuat saat ini.");
  }

  const prompt = language === "en"
    ? `You are an experienced technical interviewer and assessor. Evaluate the candidate's interview answer objectively, fairly, and constructively.

Interview context:
- Role: ${role}
- Question category: ${category}
- Topic / target skill: ${targetSkillOrTopic}
- Interview question: "${question}"
- Candidate answer: "${answer}"

Instructions:
1. Give an objective score from 0 to 100 based on relevance, clarity, and evidence.
2. Assess STAR (Situation, Task, Action, Result) with a brief note for each.
3. Identify matched and missing technical concepts without inventing evidence.
4. Provide specific strengths and improvements.
5. Write a concise example of a strong answer, clearly marked as a practice example, not the candidate's experience.
6. Write "interviewerResponse": one short, natural spoken sentence (20 words maximum) reacting to a specific detail in the candidate's answer. Avoid generic praise or evaluation language.
7. Write one concise, relevant "followUpQuestion" that probes the candidate's answer. Do not reveal evaluation criteria in the question.

Write all natural-language feedback in professional English. Return ONLY valid JSON:
{
  "score": number,
  "starRubric": {
    "situation": { "present": boolean, "note": "string" },
    "task": { "present": boolean, "note": "string" },
    "action": { "present": boolean, "note": "string" },
    "result": { "present": boolean, "note": "string" }
  },
  "technicalAccuracy": { "score": number, "feedback": "string" },
  "matchedKeywords": ["string"],
  "missingKeywords": ["string"],
  "strengths": ["string"],
  "improvements": ["string"],
  "idealAnswer": "string",
  "interviewerResponse": "string",
  "followUpQuestion": "string"
}`
    : `Anda adalah Principal Interviewer & Lead Assessor teknis. Evaluasi jawaban wawancara kerja kandidat berikut ini secara OBJEKTIF, DATA-DRIVEN, dan MEMBANGUN.

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
6. Tuliskan "interviewerResponse": satu kalimat lisan yang singkat dan natural (maksimal 20 kata), menanggapi detail spesifik jawaban kandidat, bukan pujian generik atau bahasa evaluasi.
7. Tuliskan satu "followUpQuestion" yang ringkas dan relevan untuk menggali jawaban kandidat lebih dalam, tanpa membocorkan kriteria penilaian.

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
  "interviewerResponse": "string",
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
    throw new Error("AI interviewer gagal memproses jawaban. Silakan coba lagi.");
  }
}
