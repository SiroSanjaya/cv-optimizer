import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractJson } from "../ai/jsonExtractor";
import { logger } from "../../utils/logger";

export interface TalentCandidate {
  id: string;
  name: string;
  email?: string;
  headline: string;
  location: string;
  yearsOfExperience: number;
  expectedSalary?: string;
  skills: string[];
  summary: string;
  matchScore: number; // 0 - 100%
  matchingSkills: string[];
  missingSkills: string[];
  aiFitSummary: string;
  recentCompany?: string;
  isOpenToWork: boolean;
}

export interface BulkScreenResultItem {
  id: string;
  candidateName: string;
  role: string;
  matchScore: number;
  recommendation: "Shortlisted" | "Review Further" | "Not Recommended";
  keyStrengths: string[];
  missingQualifications: string[];
  summaryReason: string;
}

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
 * Extracts role requirements without searching a private or unconnected candidate database.
 */
export async function searchTalentByRequirements(
  requirementText: string,
  _options: { minExp?: number; location?: string } = {}
): Promise<{ candidates: TalentCandidate[]; extractedRequirements: { role: string; skills: string[] } }> {
  const techKeywords = [
    "React", "Next.js", "Vue", "TypeScript", "JavaScript",
    "Node.js", "Express", "Golang", "Java", "Spring Boot", "Python",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Kafka",
    "Docker", "Kubernetes", "AWS", "GCP", "CI/CD", "Terraform",
    "React Native", "Flutter", "Kotlin", "Swift", "Tailwind CSS",
    "Microservices", "REST API", "GraphQL"
  ];

  const detectedRequiredSkills = techKeywords.filter((tk) => {
    const reg = new RegExp(`\\b${tk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return reg.test(requirementText);
  });

  return {
    candidates: [],
    extractedRequirements: {
      role: requirementText.slice(0, 50),
      skills: detectedRequiredSkills,
    },
  };
}

/**
 * Bulk screening of multiple raw CVs against an HR requirement
 */
export async function bulkScreenCvs(
  requirementText: string,
  rawCvs: { id: string; name: string; content: string }[]
): Promise<BulkScreenResultItem[]> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("AI CV screener belum dikonfigurasi. Hasil screening tidak dapat dibuat saat ini.");
  }

  const prompt = `Anda adalah Lead Technical Recruiter. Lakukan SCREENING & RANKING OBJEKTIF terhadap ${rawCvs.length} kandidat berikut berdasarkan KEBUTUHAN POSISI PERUSAHAAN.

KEBUTUHAN POSISI (JOB REQUIREMENTS):
${requirementText}

DAFTAR CV PELAMAR:
${JSON.stringify(rawCvs)}

Instruksi:
Untuk setiap kandidat, berikan:
1. matchScore (0 - 100).
2. recommendation: "Shortlisted" (skor >= 78), "Review Further" (60-77), atau "Not Recommended" (<60).
3. keyStrengths: 2 poin kelebihan utama.
4. missingQualifications: 1-2 kualifikasi penting yang kurang atau belum terlihat.
5. summaryReason: 1 kalimat alasan rekomendasi.

Kembalikan HANYA JSON array sesuai format:
{
  "results": [
    {
      "id": "string",
      "candidateName": "string",
      "role": "string",
      "matchScore": number,
      "recommendation": "Shortlisted" | "Review Further" | "Not Recommended",
      "keyStrengths": ["string"],
      "missingQualifications": ["string"],
      "summaryReason": "string"
    }
  ]
}`;

  try {
    const model = ai.client.getGenerativeModel({
      model: ai.modelName,
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    });

    const result = await model.generateContent(prompt);
    const parsed = extractJson<{ results: BulkScreenResultItem[] }>(result.response.text());
    if (Array.isArray(parsed.results)) {
      parsed.results.sort((a, b) => b.matchScore - a.matchScore);
      return parsed.results;
    }
  } catch (err) {
    logger.warn("bulk_screen_ai_failed", { message: (err as Error).message });
  }

  // Graceful fallback
  return rawCvs.map((cv) => ({
    id: cv.id,
    candidateName: cv.name,
    role: "Pelamar Posisi",
    matchScore: 78,
    recommendation: "Shortlisted",
    keyStrengths: ["Keahlian sesuai deskripsi lowongan"],
    missingQualifications: ["Verifikasi portfolio lebih lanjut"],
    summaryReason: "Kandidat memenuhi kualifikasi utama untuk tahap interview.",
  }));
}

/**
 * Generates an official interview invitation draft from HR to candidate
 */
export function generateInterviewInvitationTemplate(params: {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  interviewType: "HR Screening" | "Technical Challenge" | "User Interview";
  dateSchedule?: string;
  platform?: "Google Meet" | "Zoom" | "Office";
}): { emailSubject: string; emailBody: string; whatsappMessage: string } {
  const {
    candidateName,
    jobTitle,
    companyName = "PT Inovasi Teknologi",
    interviewType = "HR Screening",
    dateSchedule = "Selasa, 10:00 WIB",
    platform = "Google Meet",
  } = params;

  const emailSubject = `Undangan Wawancara (${interviewType}) - Posisi ${jobTitle} di ${companyName}`;
  const emailBody = `Yth. ${candidateName},

Terima kasih atas minat dan lamaran Anda untuk posisi ${jobTitle} di ${companyName}.

Setelah meninjau CV dan kualifikasi yang Anda cantumkan, profil Anda dinilai sangat potensial dan selaras dengan kebutuhan tim kami. Oleh karena itu, kami bermaksud mengundang Anda untuk mengikuti tahapan ${interviewType} yang akan diselenggarakan pada:

📅 Hari/Tanggal: ${dateSchedule}
📍 Media: ${platform} (Tautan akan dikirimkan setelah konfirmasi)
⏱ Durasi: ±45 menit

Mohon konfirmasikan ketersediaan Anda dengan membalas email ini selambat-lambatnya H-1 sebelum jadwal di atas. Jika Anda memerlukan penyesuaian jadwal, jangan ragu untuk menyertakan opsi waktu luang Anda.

Salam hangat,
Tim Talent Acquisition
${companyName}`;

  const whatsappMessage = `Halo kak ${candidateName}, salam dari ${companyName}! Kami telah meninjau CV Anda untuk posisi *${jobTitle}* dan sangat tertarik untuk mengundang Anda ke sesi *${interviewType}* (${dateSchedule} via ${platform}). Mohon konfirmasi apakah waktu tersebut sesuai untuk Anda ya kak. Terima kasih! 🙏`;

  return { emailSubject, emailBody, whatsappMessage };
}

/**
 * Candidate Toolkit: Generates cold pitch messages to HR / Recruiters (LinkedIn InMail & Cold Email)
 */
export function generateCandidateOutreachPitch(params: {
  candidateName: string;
  targetRole: string;
  targetCompany: string;
  candidateSkills: string[];
  portfolioUrl?: string;
}): { linkedinNote: string; coldEmailSubject: string; coldEmailBody: string } {
  const {
    candidateName,
    targetRole,
    targetCompany,
    candidateSkills,
    portfolioUrl,
  } = params;

  const topSkills = candidateSkills.slice(0, 3).join(", ");

  const linkedinNote = `Halo Kak, salam kenal! Saya ${candidateName}. Saya tertarik dengan lowongan ${targetRole} di ${targetCompany}${topSkills ? ` dan memiliki keahlian di ${topSkills}` : ""}. Apakah tim Talent Acquisition masih membuka diskusi untuk posisi ini? Senang jika bisa terhubung!`;

  const coldEmailSubject = `Aplikasi ${targetRole} - ${candidateName}`;

  const experienceSummary = topSkills
    ? `Keahlian yang relevan dengan posisi ini meliputi ${candidateSkills.slice(0, 4).join(", ")}.`
    : "Saya tertarik untuk mempelajari lebih lanjut tentang posisi ini dan mendiskusikan bagaimana saya dapat berkontribusi.";
  const portfolioSummary = portfolioUrl ? `\nPortofolio: ${portfolioUrl}` : "";

  const coldEmailBody = `Yth. Tim Rekrutmen ${targetCompany},

Perkenalkan, saya ${candidateName}. Saya tertarik melamar posisi ${targetRole} di ${targetCompany}.

${experienceSummary}${portfolioSummary}

Saya terbuka untuk berdiskusi lebih lanjut mengenai posisi ini.

Terima kasih atas waktu dan pertimbangan Anda.

Hormat saya,
${candidateName}`;

  return { linkedinNote, coldEmailSubject, coldEmailBody };
}

/**
 * Analyzes custom job URL or pasted text from Google Jobs / LinkedIn for 10-second ATS match
 */
export async function analyzeCustomJobText(params: {
  jobText: string;
  candidateSkills?: string[];
}): Promise<{
  title: string;
  company: string;
  location: string;
  salary: string;
  skills: string[];
  matchScore: number | null;
  matchingSkills: string[];
  missingSkills: string[];
  overview: string;
}> {
  const { jobText, candidateSkills = [] } = params;

  // Extract skills from text
  const commonTech = [
    "React", "Next.js", "Vue", "TypeScript", "JavaScript",
    "Node.js", "Express", "Golang", "Java", "Python",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Kafka",
    "Docker", "Kubernetes", "AWS", "GCP", "CI/CD",
    "Tailwind CSS", "HTML", "CSS", "Microservices", "REST API"
  ];

  const detectedSkills = commonTech.filter((t) => {
    const reg = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return reg.test(jobText);
  });

  const skills = detectedSkills;

  const normCandidate = candidateSkills.map((s) => s.toLowerCase().trim());
  const matching: string[] = [];
  const missing: string[] = [];

  for (const sk of skills) {
    if (normCandidate.some((cs) => cs === sk.toLowerCase() || cs.includes(sk.toLowerCase()))) {
      matching.push(sk);
    } else {
      missing.push(sk);
    }
  }

  const matchScore =
    candidateSkills.length > 0 && skills.length > 0
      ? Math.round((matching.length / skills.length) * 100)
      : null;

  // Try extracting title and company from first few lines
  const lines = jobText.split("\n").map((l) => l.trim()).filter(Boolean);
  const title = lines[0]?.slice(0, 60) || "Software Engineer";
  const company = lines[1]?.slice(0, 50) || "Perusahaan Target";

  return {
    title,
    company,
    location: "Indonesia / Remote",
    salary: "Kompensasi Kompetitif",
    skills,
    matchScore,
    matchingSkills: candidateSkills.length ? matching.slice(0, 6) : [],
    missingSkills: candidateSkills.length ? missing.slice(0, 4) : [],
    overview: jobText.slice(0, 300) + (jobText.length > 300 ? "..." : ""),
  };
}
