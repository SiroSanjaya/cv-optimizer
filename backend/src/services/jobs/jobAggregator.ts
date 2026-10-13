import axios from "axios";
import * as cheerio from "cheerio";
import { logger } from "../../utils/logger";

export interface JobItem {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  type?: string;
  source: "Kalibrr" | "Remotive" | "Arbeitnow" | "Indeed" | "Jooble" | "RemoteOK" | "Himalayas";
  url: string;
  description: string;
  skills: string[];
  postedAt?: string;
  logo?: string;
  remote?: boolean;
  visaSponsorship?: "available" | "unavailable" | "not_mentioned";
  responseRate?: number;
  matchScore?: number;
  matchingSkills?: string[];
  missingSkills?: string[];
}

export interface JobFilterOptions {
  keyword?: string;
  location?: "indonesia" | "malaysia" | "singapore" | "australia" | "remote" | "all";
  category?: "frontend" | "backend" | "fullstack" | "data" | "devops" | "mobile" | "all";
  skills?: string[];
}

export function detectVisaSponsorship(
  description: string
): "available" | "unavailable" | "not_mentioned" {
  const normalized = description.toLowerCase().replace(/\s+/g, " ");
  const unavailablePatterns = [
    /\bno\s+(?:work\s+)?visa sponsorship\b/,
    /\b(?:no|without)\s+(?:work\s+)?sponsorship\b/,
    /\b(?:cannot|can't|unable to|will not|won't|do not|don't|does not|doesn't)\s+(?:provide|offer|sponsor)\s+(?:a\s+)?(?:work\s+)?(?:visa|visa sponsorship)\b/,
    /\bmust be (?:legally )?authorized to work .{0,80}without sponsorship\b/,
    /\bwithout (?:the need for )?(?:visa )?sponsorship\b/,
  ];
  if (unavailablePatterns.some((pattern) => pattern.test(normalized))) {
    return "unavailable";
  }

  const availablePatterns = [
    /\bvisa sponsorship\s+(?:is\s+)?(?:available|provided|offered|supported|considered)\b/,
    /\b(?:we|employer|company)\s+(?:will\s+)?(?:offer|provide)\s+visa sponsorship\b/,
    /\b(?:we|employer|company)\s+(?:will\s+)?sponsor\s+(?:a\s+)?(?:work\s+|employment\s+|skilled\s+)?visa\b/,
    /\b(?:work|employment|skilled)\s+visa sponsorship\s+(?:is\s+)?(?:available|provided|offered)\b/,
    /\bvisa sponsorship:\s*(?:yes|available|provided|offered)\b/,
  ];
  return availablePatterns.some((pattern) => pattern.test(normalized))
    ? "available"
    : "not_mentioned";
}

function clipDescription(text: string, maxLength = 2_500): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

const COMMON_TECH_SKILLS = [
  "React", "Next.js", "Vue.js", "Angular", "TypeScript", "JavaScript",
  "Node.js", "Express", "NestJS", "Python", "Django", "FastAPI",
  "Golang", "Java", "Spring Boot", "Kotlin", "Swift", "Flutter", "React Native",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
  "Docker", "Kubernetes", "AWS", "GCP", "Azure", "CI/CD", "Terraform", "Linux",
  "GraphQL", "REST API", "Microservices", "Kafka", "RabbitMQ",
  "Figma", "UI/UX", "Tailwind CSS", "HTML5", "CSS3", "Git", "Jest", "Cypress"
];

function extractSkillsFromText(text: string, existingSkills: string[] = []): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>(existingSkills.map((s) => s.trim()));

  for (const tech of COMMON_TECH_SKILLS) {
    // Regex word boundary matching for tech skills
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(lower)) {
      found.add(tech);
    }
  }

  return Array.from(found).slice(0, 10);
}

function stripHtml(htmlStr: string): string {
  if (!htmlStr) return "";
  try {
    const $ = cheerio.load(htmlStr);
    return $("body").text().replace(/\s+/g, " ").trim();
  } catch {
    return htmlStr.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
}

function formatRupiah(num: number): string {
  return "Rp " + num.toLocaleString("id-ID");
}

/**
 * Fetches actual live jobs from Kalibrr Job Board API (Indonesia)
 */
export async function fetchKalibrrApiJobs(query: string = "engineer"): Promise<JobItem[]> {
  try {
    const cleanQuery = encodeURIComponent(query.trim());
    const url = `https://www.kalibrr.com/api/job_board/search?k=${cleanQuery}&limit=50&country=Indonesia`;

    const res = await axios.get(url, {
      timeout: 7000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    const rawList: any[] = res.data?.jobs || [];
    const jobs: JobItem[] = [];

    for (const item of rawList) {
      if (!item.name || !item.company_name) continue;

      const title: string = item.name.trim();
      const company: string = item.company_name.trim();
      const city =
        item.google_location?.address_components?.city ||
        item.google_location?.address_components?.region ||
        "Indonesia";

      let salary: string | undefined;
      if (item.base_salary && item.maximum_salary) {
        salary = `${formatRupiah(item.base_salary)} - ${formatRupiah(item.maximum_salary)} /bln`;
      } else if (item.base_salary) {
        salary = `Mulai ${formatRupiah(item.base_salary)} /bln`;
      }

      const rawHtmlDesc = (item.description || "") + " " + (item.qualifications || "");
      const cleanDesc = stripHtml(rawHtmlDesc);

      const detectedSkills = extractSkillsFromText(title + " " + cleanDesc);
      const companyCode = item.company?.code || item.company_info?.code || "company";
      const slug = item.slug || `${item.id}`;
      const jobUrl = `https://www.kalibrr.com/c/${companyCode}/jobs/${item.id}/${slug}`;

      const logo =
        item.company_info?.logo_small ||
        item.company_info?.logo ||
        item.company?.logo_small ||
        undefined;

      let postedAt: string | undefined;
      if (item.activation_date || item.created_at) {
        const d = new Date(item.activation_date || item.created_at);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 0) postedAt = "Hari ini";
        else if (diffDays === 1) postedAt = "Kemarin";
        else if (diffDays < 7) postedAt = `${diffDays} hari lalu`;
        else if (diffDays < 30) postedAt = `${Math.floor(diffDays / 7)} minggu lalu`;
        else postedAt = d.toLocaleDateString("id-ID");
      }

      jobs.push({
        id: `kalibrr-${item.id}`,
        title,
        company,
        location: city,
        salary,
        type: item.tenure || "Full time",
        source: "Kalibrr",
        url: jobUrl,
        description: clipDescription(cleanDesc),
        skills: detectedSkills,
        postedAt,
        logo,
        remote: Boolean(item.is_work_from_home),
        visaSponsorship: detectVisaSponsorship(cleanDesc),
        responseRate: item.response_rate ? Math.round(item.response_rate) : undefined,
      });
    }

    return jobs;
  } catch (err) {
    logger.warn("kalibrr_api_fetch_failed", { message: (err as Error).message });
    return [];
  }
}

/**
 * Fetches actual live remote tech jobs from Remotive API
 */
export async function fetchRemotiveApiJobs(query: string = "developer"): Promise<JobItem[]> {
  try {
    const cleanQuery = encodeURIComponent(query.trim());
    const url = `https://remotive.com/api/remote-jobs?category=software-dev&search=${cleanQuery}`;

    const res = await axios.get(url, {
      timeout: 7000,
      headers: { Accept: "application/json" },
    });

    const rawList: any[] = res.data?.jobs || [];
    const jobs: JobItem[] = [];

    for (const item of rawList.slice(0, 50)) {
      const title: string = item.title;
      const company: string = item.company_name;
      const cleanDesc = stripHtml(item.description || "");

      const rawTags: string[] = Array.isArray(item.tags) ? item.tags : [];
      const detectedSkills = extractSkillsFromText(title + " " + cleanDesc, rawTags);

      let postedAt: string | undefined;
      if (item.publication_date) {
        const d = new Date(item.publication_date);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 0) postedAt = "Hari ini";
        else if (diffDays === 1) postedAt = "Kemarin";
        else if (diffDays < 7) postedAt = `${diffDays} hari lalu`;
        else postedAt = `${Math.floor(diffDays / 7)} minggu lalu`;
      }

      jobs.push({
        id: `remotive-${item.id}`,
        title,
        company,
        location: item.candidate_required_location || "Worldwide (Remote)",
        salary: item.salary || undefined,
        type: item.job_type || undefined,
        source: "Remotive",
        url: item.url,
        description: clipDescription(cleanDesc),
        skills: detectedSkills,
        postedAt,
        logo: item.company_logo || undefined,
        remote: true,
        visaSponsorship: detectVisaSponsorship(cleanDesc),
      });
    }

    return jobs;
  } catch (err) {
    logger.warn("remotive_api_fetch_failed", { message: (err as Error).message });
    return [];
  }
}

/**
 * Fetches actual live tech vacancies from Arbeitnow Job Board API
 */
export async function fetchArbeitnowApiJobs(query: string = ""): Promise<JobItem[]> {
  try {
    const url = "https://www.arbeitnow.com/api/job-board-api";
    const res = await axios.get(url, {
      timeout: 7000,
      headers: { Accept: "application/json" },
    });

    const rawList: any[] = res.data?.data || [];
    const jobs: JobItem[] = [];
    const lowerQuery = query.toLowerCase().trim();

    for (const item of rawList) {
      const title: string = item.title || "";
      const company: string = item.company_name || "";
      const tags: string[] = Array.isArray(item.tags) ? item.tags : [];
      const isTech =
        tags.some((t) => ["engineering", "software", "development", "data", "it", "frontend", "backend", "full stack"].includes(t.toLowerCase())) ||
        /developer|engineer|programmer|architect|analyst/i.test(title);

      if (!isTech) continue;

      // Check query filter if provided
      if (lowerQuery && !title.toLowerCase().includes(lowerQuery) && !tags.some((t) => t.toLowerCase().includes(lowerQuery))) {
        continue;
      }

      const cleanDesc = stripHtml(item.description || "");
      const detectedSkills = extractSkillsFromText(title + " " + cleanDesc, tags);

      jobs.push({
        id: `arbeitnow-${String(item.slug || `${title}-${company}`).toLowerCase().replace(/[^a-z0-9-]+/g, "-")}`,
        title,
        company,
        location: item.location || (item.remote ? "Remote" : "Global"),
        salary: undefined,
        type: item.job_types?.[0] || undefined,
        source: "Arbeitnow",
        url: item.url,
        description: clipDescription(cleanDesc),
        skills: detectedSkills,
        remote: Boolean(item.remote),
        visaSponsorship: detectVisaSponsorship(cleanDesc),
      });

      if (jobs.length >= 30) break;
    }

    return jobs;
  } catch (err) {
    logger.warn("arbeitnow_api_fetch_failed", { message: (err as Error).message });
    return [];
  }
}

/**
 * Fetches actual live jobs from Jooble API.
 * GRATIS — tapi wajib daftar dulu di https://jooble.org/api/about untuk dapet API key,
 * lalu set sebagai env var JOOBLE_API_KEY. Kalau key belum diset, fungsi ini
 * langsung return array kosong (skip) tanpa bikin request gagal / error ke user.
 * Coverage Jooble termasuk Indonesia (agregat dari banyak portal lokal).
 */
const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY || "";

export async function fetchJoobleApiJobs(
  query: string = "developer",
  location: string = "Indonesia"
): Promise<JobItem[]> {
  if (!JOOBLE_API_KEY) return [];

  try {
    const url = `https://jooble.org/api/${JOOBLE_API_KEY}`;
    const res = await axios.post(
      url,
      { keywords: query, location },
      { timeout: 7000, headers: { "Content-Type": "application/json" } }
    );

    const rawList: any[] = res.data?.jobs || [];
    const jobs: JobItem[] = [];

    for (const item of rawList.slice(0, 50)) {
      const title: string = item.title || "";
      const company: string = item.company || "Perusahaan Tidak Diketahui";
      const cleanDesc = stripHtml(item.snippet || "");
      const detectedSkills = extractSkillsFromText(title + " " + cleanDesc);

      let postedAt: string | undefined;
      if (item.updated) {
        const d = new Date(item.updated);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 0) postedAt = "Hari ini";
        else if (diffDays === 1) postedAt = "Kemarin";
        else if (diffDays < 7) postedAt = `${diffDays} hari lalu`;
        else postedAt = `${Math.floor(diffDays / 7)} minggu lalu`;
      }

      jobs.push({
        id: `jooble-${(item.id || item.link || title).toString().slice(0, 40)}`,
        title,
        company,
        location: item.location || location,
        salary: item.salary || undefined,
        type: item.type || undefined,
        source: "Jooble",
        url: item.link,
        description: clipDescription(cleanDesc),
        skills: detectedSkills,
        postedAt,
        remote: /remote|wfh|jarak jauh/i.test(title + " " + cleanDesc),
        visaSponsorship: detectVisaSponsorship(cleanDesc),
      });
    }

    return jobs;
  } catch (err) {
    logger.warn("jooble_api_fetch_failed", { message: (err as Error).message });
    return [];
  }
}

/**
 * Fetches actual live remote tech jobs from RemoteOK API.
 * GRATIS, tanpa API key. Endpoint ga support query search server-side,
 * jadi filter keyword dilakuin manual di sisi kita.
 */
export async function fetchRemoteOKApiJobs(query: string = ""): Promise<JobItem[]> {
  try {
    const res = await axios.get("https://remoteok.com/api", {
      timeout: 7000,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; JobAggregator/1.0)",
      },
    });

    const rawList: any[] = Array.isArray(res.data) ? res.data.slice(1) : []; // index 0 = metadata
    const lowerQuery = query.toLowerCase().trim();
    const jobs: JobItem[] = [];

    for (const item of rawList) {
      const title: string = item.position || item.title || "";
      if (!title) continue;

      const tags: string[] = Array.isArray(item.tags) ? item.tags : [];

      if (lowerQuery) {
        const haystack = (title + " " + tags.join(" ")).toLowerCase();
        if (!haystack.includes(lowerQuery)) continue;
      }

      const cleanDesc = stripHtml(item.description || "");
      const detectedSkills = extractSkillsFromText(title + " " + cleanDesc, tags);

      let postedAt: string | undefined;
      if (item.date) {
        const d = new Date(item.date);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 0) postedAt = "Hari ini";
        else if (diffDays === 1) postedAt = "Kemarin";
        else if (diffDays < 7) postedAt = `${diffDays} hari lalu`;
        else postedAt = `${Math.floor(diffDays / 7)} minggu lalu`;
      }

      jobs.push({
        id: `remoteok-${item.id}`,
        title,
        company: item.company || "Perusahaan Tidak Diketahui",
        location: item.location || "Remote (Worldwide)",
        salary:
          item.salary_min && item.salary_max
            ? `$${item.salary_min} - $${item.salary_max} /thn`
            : "Competitive (USD)",
        type: "Full-time (Remote)",
        source: "RemoteOK",
        url: item.url || `https://remoteok.com/remote-jobs/${item.id}`,
        description: clipDescription(cleanDesc),
        skills: detectedSkills,
        postedAt,
        logo: item.company_logo || item.logo || undefined,
        remote: true,
        visaSponsorship: detectVisaSponsorship(cleanDesc),
      });

      if (jobs.length >= 30) break;
    }

    return jobs;
  } catch (err) {
    logger.warn("remoteok_api_fetch_failed", { message: (err as Error).message });
    return [];
  }
}

/**
 * Fetches actual live remote jobs from Himalayas API.
 * GRATIS, tanpa API key.
 */
export async function fetchHimalayasApiJobs(query: string = ""): Promise<JobItem[]> {
  try {
    const res = await axios.get("https://himalayas.app/jobs/api", {
      timeout: 7000,
      params: { limit: 60 },
      headers: { Accept: "application/json" },
    });

    const rawList: any[] = res.data?.jobs || [];
    const lowerQuery = query.toLowerCase().trim();
    const jobs: JobItem[] = [];

    for (const item of rawList) {
      const title: string = item.title || "";
      if (!title) continue;

      const tags: string[] = Array.isArray(item.tags) ? item.tags : Array.isArray(item.skills) ? item.skills : [];

      if (lowerQuery) {
        const haystack = (title + " " + tags.join(" ")).toLowerCase();
        if (!haystack.includes(lowerQuery)) continue;
      }

      const cleanDesc = stripHtml(item.description || "");
      const detectedSkills = extractSkillsFromText(title + " " + cleanDesc, tags);

      const locationLabel =
        Array.isArray(item.locationRestrictions) && item.locationRestrictions.length > 0
          ? item.locationRestrictions.join(", ")
          : "Remote (Worldwide)";

      let postedAt: string | undefined;
      if (item.pubDate) {
        const d = new Date(item.pubDate);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 0) postedAt = "Hari ini";
        else if (diffDays === 1) postedAt = "Kemarin";
        else if (diffDays < 7) postedAt = `${diffDays} hari lalu`;
        else postedAt = `${Math.floor(diffDays / 7)} minggu lalu`;
      }

      jobs.push({
        id: `himalayas-${item.id || item.guid || title}`.slice(0, 60),
        title,
        company: item.companyName || "Perusahaan Tidak Diketahui",
        location: locationLabel,
        salary:
          item.minSalary && item.maxSalary
            ? `$${item.minSalary} - $${item.maxSalary} /thn`
            : "Competitive (USD)",
        type: item.employmentType || undefined,
        source: "Himalayas",
        url: item.applicationLink || item.guid,
        description: clipDescription(cleanDesc),
        skills: detectedSkills,
        postedAt: postedAt || undefined,
        logo: item.companyLogo || undefined,
        remote: true,
        visaSponsorship: detectVisaSponsorship(cleanDesc),
      });

      if (jobs.length >= 30) break;
    }

    return jobs;
  } catch (err) {
    logger.warn("himalayas_api_fetch_failed", { message: (err as Error).message });
    return [];
  }
}

/**
 * Calculates skill overlap from the candidate's CV and the job's listed skills.
 */
export function calculateJobMatch(candidateSkills: string[], job: JobItem): JobItem {
  if (candidateSkills.length === 0) {
    return {
      ...job,
      matchScore: undefined,
      matchingSkills: [],
      missingSkills: [],
    };
  }

  const normCandidate = candidateSkills.map((s) => s.toLowerCase().trim());

  const matching: string[] = [];
  const missing: string[] = [];

  for (const jobSkill of job.skills) {
    const jobSkillLower = jobSkill.toLowerCase();
    const isMatched = normCandidate.some(
      (cs) => cs === jobSkillLower || cs.includes(jobSkillLower) || jobSkillLower.includes(cs)
    );
    if (isMatched) {
      if (!matching.includes(jobSkill)) matching.push(jobSkill);
    } else {
      if (!missing.includes(jobSkill)) missing.push(jobSkill);
    }
  }

  const score = job.skills.length
    ? Math.round((matching.length / job.skills.length) * 100)
    : undefined;

  return {
    ...job,
    matchScore: score,
    matchingSkills: matching.slice(0, 6),
    missingSkills: missing.slice(0, 5),
  };
}

/**
 * Main aggregator: pulls live jobs from Kalibrr API + Remotive API + Arbeitnow +
 * Jooble + RemoteOK + Himalayas
 */
export async function getAggregatedRecommendations(
  candidateSkills: string[] = [],
  options: JobFilterOptions = {}
): Promise<JobItem[]> {
  const keyword = (options.keyword || "software").trim();
  const location = options.location || "all";
  const category = options.category || "all";

  // Build targeted queries
  let effectiveKeyword = keyword;
  if (category !== "all") {
    effectiveKeyword = `${category} ${keyword}`.trim();
  }

  const fetchers: Promise<JobItem[]>[] = [];
  const markets: Record<string, string> = {
    indonesia: "Indonesia",
    malaysia: "Malaysia",
    singapore: "Singapore",
    australia: "Australia",
  };

  // Indonesia has a dedicated local source; Jooble can query each target market.
  if (location === "indonesia" || location === "all") {
    fetchers.push(fetchKalibrrApiJobs(effectiveKeyword));
  }

  if (location === "all") {
    for (const market of Object.values(markets)) {
      fetchers.push(fetchJoobleApiJobs(effectiveKeyword, market));
    }
  } else if (location !== "remote") {
    fetchers.push(fetchJoobleApiJobs(effectiveKeyword, markets[location]));
  }

  // Remote sources are useful alongside country-specific searches because some
  // employers accept candidates worldwide without local visa sponsorship.
  fetchers.push(fetchRemotiveApiJobs(effectiveKeyword));
  fetchers.push(fetchArbeitnowApiJobs(effectiveKeyword));
  fetchers.push(fetchRemoteOKApiJobs(effectiveKeyword));
  fetchers.push(fetchHimalayasApiJobs(effectiveKeyword));

  // Run in parallel with graceful error handling
  const results = await Promise.allSettled(fetchers);
  const liveJobs: JobItem[] = [];

  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      liveJobs.push(...r.value);
    }
  }

  const combinedRaw = liveJobs;
  const marketAliases: Record<string, RegExp> = {
    indonesia: /\b(?:indonesia|jakarta|bandung|surabaya|yogyakarta|bali|tangerang|bekasi|depok|batam)\b/i,
    malaysia: /\b(?:malaysia|kuala lumpur|penang|johor|cyberjaya|selangor)\b/i,
    singapore: /\b(?:singapore|singapura)\b/i,
    australia: /\b(?:australia|sydney|melbourne|brisbane|perth|adelaide|canberra)\b/i,
  };
  const selectedMarkets = location === "all"
    ? Object.keys(marketAliases)
    : [location];
  const marketJobs = combinedRaw.filter((job) => {
    if (location === "remote") return Boolean(job.remote);

    const jobLocation = job.location || "";
    const isGlobalRemote =
      job.remote && /\b(?:worldwide|global|anywhere|all countries)\b/i.test(jobLocation);
    if (isGlobalRemote) return true;

    return selectedMarkets.some((market) => marketAliases[market]?.test(jobLocation));
  });

  // Deduplicate by clean title and company
  const seen = new Set<string>();
  const uniqueJobs: JobItem[] = [];

  for (const job of marketJobs) {
    const key = `${job.title.toLowerCase().replace(/[^a-z0-9]/g, "")}_${job.company.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueJobs.push(job as JobItem);
    }
  }

  const scoredJobs = candidateSkills.length
    ? uniqueJobs.map((job) => calculateJobMatch(candidateSkills, job))
    : uniqueJobs;

  if (candidateSkills.length) {
    scoredJobs.sort((a, b) =>
      (b.matchScore ?? -1) - (a.matchScore ?? -1) ||
      Number(b.visaSponsorship === "available") - Number(a.visaSponsorship === "available")
    );
  } else {
    scoredJobs.sort((a, b) =>
      Number(b.visaSponsorship === "available") - Number(a.visaSponsorship === "available")
    );
  }

  return scoredJobs.slice(0, 100);
}