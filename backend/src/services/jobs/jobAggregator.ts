import axios from "axios";
import * as cheerio from "cheerio";
import { logger } from "../../utils/logger";

export interface JobItem {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: "IDR" | "USD" | "EUR" | "GBP" | "AUD" | "SGD" | "MYR";
  salaryPeriod?: "hourly" | "monthly" | "annual" | "unknown";
  type?: string;
  industry?: string;
  experienceLevel?: "internship" | "entry" | "mid" | "senior" | "lead";
  source: "Kalibrr" | "Remotive" | "Arbeitnow" | "Jooble" | "RemoteOK" | "Himalayas" | "Adzuna";
  url: string;
  description: string;
  skills: string[];
  postedAt?: string;
  postedAtDate?: string;
  applicationDeadline?: string;
  logo?: string;
  remote?: boolean;
  visaSponsorship?: "available" | "unavailable" | "not_mentioned";
  responseRate?: number;
  matchScore?: number;
  matchingSkills?: string[];
  missingSkills?: string[];
  matchReasons?: string[];
  applyRecommendation?: "apply" | "consider" | "low_priority";
  recommendationReason?: string;
}

const VERIFIED_JOB_SOURCES = new Set<JobItem["source"]>([
  "Kalibrr", "Remotive", "Arbeitnow", "Jooble", "RemoteOK", "Himalayas", "Adzuna",
]);

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID?.trim() || "";
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY?.trim() || "";
type AdzunaMarket = "au" | "sg";

export interface JobCandidateContext {
  targetRoles?: string[];
  preferredIndustries?: string[];
  preferredLocations?: string[];
  employmentPreferences?: string[];
}

export interface JobFilterOptions {
  keyword?: string;
  company?: string;
  industry?: string;
  locationQuery?: string;
  location?: "indonesia" | "malaysia" | "singapore" | "australia" | "remote" | "all";
  category?: "frontend" | "backend" | "fullstack" | "data" | "devops" | "mobile" | "all";
  skills?: string[];
  experienceLevel?: "internship" | "entry" | "mid" | "senior" | "lead";
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: "hourly" | "monthly" | "annual";
}

export interface JobSourceStatus {
  label: string;
  status: "available" | "no_results" | "failed" | "not_configured";
  receivedCount: number;
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

const COMMON_PROFESSIONAL_SKILLS = [
  "Excel", "Google Sheets", "Microsoft Office",
  "Customer Service", "Customer Support", "Sales", "Business Development",
  "Account Management", "CRM", "Salesforce", "Marketing", "Digital Marketing",
  "SEO", "Google Ads", "Social Media", "Content Writing", "Copywriting",
  "Public Relations", "Graphic Design", "UX Research", "Product Management",
  "Project Management", "Operations", "Supply Chain", "Logistics",
  "Procurement", "Accounting", "Bookkeeping", "Financial Analysis",
  "Payroll", "Human Resources", "Recruitment", "Talent Acquisition",
  "Administrative Support", "Data Analysis", "Power BI", "Tableau",
  "Communication", "Negotiation", "Leadership", "Stakeholder Management",
  "Problem Solving", "Quality Assurance", "Compliance", "Risk Management",
  "Teaching", "Curriculum Development", "Nursing", "Patient Care",
  "Event Management", "Hospitality", "Research", "English",
  "Bahasa Indonesia", "Mandarin",
];

export function extractSkillsFromText(text: string, existingSkills: string[] = []): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>(existingSkills.map((s) => s.trim()));

  for (const skill of [...COMMON_TECH_SKILLS, ...COMMON_PROFESSIONAL_SKILLS]) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(lower)) {
      found.add(skill);
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

export function inferExperienceLevel(
  value: unknown
): JobItem["experienceLevel"] {
  if (typeof value !== "string") return undefined;
  const text = value.toLowerCase();
  if (/\b(intern|internship|magang)\b/.test(text)) return "internship";
  if (/\b(lead|principal|head of|director|manager)\b/.test(text)) return "lead";
  if (/\b(senior|sr\.?|staff|expert)\b/.test(text) || /\b(?:5|6|7|8|9|10)\+?\s*(?:years?|yrs?)\b/.test(text)) {
    return "senior";
  }
  if (/\b(mid[- ]level|intermediate|experienced)\b/.test(text) || /\b[3-4]\+?\s*(?:years?|yrs?)\b/.test(text)) {
    return "mid";
  }
  if (/\b(junior|jr\.?|entry[- ]level|entry level|fresh graduate|new graduate|graduate|0-2\s*(?:years?|yrs?))\b/.test(text)) {
    return "entry";
  }
  return undefined;
}

function getIndustry(item: Record<string, unknown>): string | undefined {
  for (const key of ["industry", "industry_name", "category", "category_name", "department"]) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 120);
  }
  return undefined;
}

function getApplicationDeadline(item: Record<string, unknown>): string | undefined {
  for (const key of ["application_deadline", "applicationDeadline", "deadline", "expires_at", "valid_through"]) {
    const value = item[key];
    if (typeof value !== "string") continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return undefined;
}

export function parseSalaryDetails(
  salary: string | undefined,
  min?: number,
  max?: number,
  currency?: JobItem["salaryCurrency"],
  period?: JobItem["salaryPeriod"]
): Pick<JobItem, "salaryMin" | "salaryMax" | "salaryCurrency" | "salaryPeriod"> {
  const text = salary ?? "";
  const resolvedCurrency: JobItem["salaryCurrency"] =
    currency ||
    (/\b(?:IDR|Rupiah)\b|Rp\.?/i.test(text) ? "IDR" :
      /\bUSD\b/i.test(text) ? "USD" :
        /\bEUR\b|€/i.test(text) ? "EUR" :
          /\bGBP\b|£/i.test(text) ? "GBP" :
            /\bAUD\b/i.test(text) ? "AUD" :
              /\bSGD\b/i.test(text) ? "SGD" :
                /\bMYR\b/i.test(text) ? "MYR" :
                  /\$/i.test(text) ? "USD" : undefined);
  const resolvedPeriod =
    period ??
    (/\b(?:hour|hourly|\/hr)\b/i.test(text) ? "hourly" :
      /\b(?:month|monthly|\/mo|\/month)\b|\/bln/i.test(text) ? "monthly" :
        /\b(?:year|annual|annually|\/yr|\/year)\b|\/thn/i.test(text) ? "annual" : "unknown");

  if (Number.isFinite(min) || Number.isFinite(max)) {
    return {
      salaryMin: Number.isFinite(min) ? min : undefined,
      salaryMax: Number.isFinite(max) ? max : undefined,
      salaryCurrency: resolvedCurrency,
      salaryPeriod: resolvedPeriod,
    };
  }

  if (!resolvedCurrency || !text) return {};
  const numbers = [...text.matchAll(/(\d[\d.,]*\d|\d)(?:\s*([km]))?/gi)]
    .map(([, rawNumber, suffix]) => {
      let normalized = rawNumber;
      const lastSeparator = Math.max(normalized.lastIndexOf("."), normalized.lastIndexOf(","));
      if (lastSeparator >= 0) {
        const trailingDigits = normalized.length - lastSeparator - 1;
        if (trailingDigits === 3) {
          normalized = normalized.replace(/[.,]/g, "");
        } else {
          normalized = normalized
            .replace(/[.,](?=.*[.,])/g, "")
            .replace(",", ".");
        }
      }
      const multiplier = suffix?.toLowerCase() === "m" ? 1_000_000 :
        suffix?.toLowerCase() === "k" ? 1_000 : 1;
      return Number(normalized) * multiplier;
    })
    .filter(Number.isFinite);
  if (numbers.length === 0) return {};
  return {
    salaryMin: numbers[0],
    salaryMax: numbers.length > 1 ? numbers[1] : numbers[0],
    salaryCurrency: resolvedCurrency,
    salaryPeriod: resolvedPeriod,
  };
}

function normalizeText(value: string): string {
  return value.normalize("NFKC").toLowerCase().trim();
}

function includesAny(text: string, values: string[]): boolean {
  const normalizedText = normalizeText(text);
  return values.some((value) => {
    const normalizedValue = normalizeText(value);
    return normalizedValue.length > 0 && normalizedText.includes(normalizedValue);
  });
}

export function isVerifiedJobListing(job: JobItem): boolean {
  if (
    !VERIFIED_JOB_SOURCES.has(job.source) ||
    !job.id?.trim() ||
    !job.title?.trim() ||
    !job.company?.trim() ||
    !job.description?.trim()
  ) return false;
  if (/^(?:undefined|null|unknown|n\/?a)$|-(?:undefined|null)$/i.test(job.id.trim())) return false;
  if (/^(?:untitled|unknown|n\/?a|job title|position)$/i.test(job.title.trim())) return false;
  if (/^(?:unknown|n\/?a|company|perusahaan tidak diketahui|confidential)$/i.test(job.company.trim())) {
    return false;
  }
  try {
    const url = new URL(job.url);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function filterJobListings(jobs: JobItem[], options: JobFilterOptions): JobItem[] {
  const keywordTerms = normalizeText(options.keyword ?? "").split(/\s+/).filter(Boolean);
  const company = normalizeText(options.company ?? "");
  const industry = normalizeText(options.industry ?? "");
  const locationQuery = normalizeText(options.locationQuery ?? "");
  const employmentType = normalizeText(options.employmentType ?? "");
  const minSalary = options.salaryMin;
  const maxSalary = options.salaryMax;

  return jobs.filter((job) => {
    const searchableText = normalizeText(
      `${job.title} ${job.company} ${job.industry ?? ""} ${job.description} ${job.skills.join(" ")}`
    );
    if (keywordTerms.some((term) => !searchableText.includes(term))) return false;
    if (company && !normalizeText(job.company).includes(company)) return false;
    if (industry && !normalizeText(job.industry ?? "").includes(industry)) return false;
    if (locationQuery && !normalizeText(job.location).includes(locationQuery)) return false;
    if (options.experienceLevel && job.experienceLevel !== options.experienceLevel) return false;
    if (employmentType && !normalizeText(job.type ?? "").includes(employmentType)) return false;
    if (minSalary !== undefined || maxSalary !== undefined) {
      if (
        job.salaryCurrency !== options.salaryCurrency ||
        job.salaryPeriod !== options.salaryPeriod ||
        (job.salaryMin === undefined && job.salaryMax === undefined)
      ) return false;
      if (minSalary !== undefined) {
        const highestAdvertised = job.salaryMax ?? job.salaryMin;
        if (highestAdvertised === undefined || highestAdvertised < minSalary) return false;
      }
      if (maxSalary !== undefined) {
        const lowestAdvertised = job.salaryMin ?? job.salaryMax;
        if (lowestAdvertised === undefined || lowestAdvertised > maxSalary) return false;
      }
    }
    return true;
  });
}

export function formatPostedAt(
  value: unknown,
  now: Date = new Date()
): { postedAt?: string; postedAtDate?: string } {
  if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date)) {
    return {};
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
    return {};
  }

  const diffDays = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
  let postedAt: string;
  if (diffDays === 0) postedAt = "Hari ini";
  else if (diffDays === 1) postedAt = "Kemarin";
  else if (diffDays < 7) postedAt = `${diffDays} hari lalu`;
  else if (diffDays < 30) postedAt = `${Math.floor(diffDays / 7)} minggu lalu`;
  else {
    postedAt = new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeZone: "Asia/Jakarta",
    }).format(date);
  }

  return { postedAt, postedAtDate: date.toISOString() };
}

/**
 * Fetches actual live jobs from Kalibrr Job Board API (Indonesia)
 */
export async function fetchKalibrrApiJobs(query: string = ""): Promise<JobItem[]> {
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
      if (!item.name || !item.company_name || item.id == null) continue;

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

      const { postedAt, postedAtDate } = formatPostedAt(item.activation_date || item.created_at);
      const salaryDetails = parseSalaryDetails(
        salary,
        typeof item.base_salary === "number" ? item.base_salary : undefined,
        typeof item.maximum_salary === "number" ? item.maximum_salary : undefined,
        "IDR",
        "monthly"
      );

      jobs.push({
        id: `kalibrr-${item.id}`,
        title,
        company,
        location: city,
        salary,
        ...salaryDetails,
        type: item.tenure || "Full time",
        industry: getIndustry(item),
        experienceLevel: inferExperienceLevel(item.experience_level || item.seniority || `${title} ${cleanDesc}`),
        source: "Kalibrr",
        url: jobUrl,
        description: clipDescription(cleanDesc),
        skills: detectedSkills,
        postedAt,
        postedAtDate,
        applicationDeadline: getApplicationDeadline(item),
        logo,
        remote: Boolean(item.is_work_from_home),
        visaSponsorship: detectVisaSponsorship(cleanDesc),
        responseRate: item.response_rate ? Math.round(item.response_rate) : undefined,
      });
    }

    return jobs;
  } catch (err) {
    logger.warn("kalibrr_api_fetch_failed", { message: (err as Error).message });
    throw err;
  }
}

/**
 * Fetches live remote jobs across Remotive categories.
 */
export async function fetchRemotiveApiJobs(query: string = ""): Promise<JobItem[]> {
  try {
    const cleanQuery = encodeURIComponent(query.trim());
    const url = `https://remotive.com/api/remote-jobs?search=${cleanQuery}`;

    const res = await axios.get(url, {
      timeout: 7000,
      headers: { Accept: "application/json" },
    });

    const rawList: any[] = res.data?.jobs || [];
    const jobs: JobItem[] = [];

    for (const item of rawList.slice(0, 50)) {
      if (item.id == null) continue;
      const title: string = item.title;
      const company: string = item.company_name;
      const cleanDesc = stripHtml(item.description || "");

      const rawTags: string[] = Array.isArray(item.tags) ? item.tags : [];
      const detectedSkills = extractSkillsFromText(title + " " + cleanDesc, rawTags);

      const { postedAt, postedAtDate } = formatPostedAt(item.publication_date);
      const salaryDetails = parseSalaryDetails(item.salary || undefined);

      jobs.push({
        id: `remotive-${item.id}`,
        title,
        company,
        location: item.candidate_required_location || "Remote (location restrictions not listed)",
        salary: item.salary || undefined,
        ...salaryDetails,
        type: item.job_type || undefined,
        industry: getIndustry(item),
        experienceLevel: inferExperienceLevel(item.seniority || item.experience_level || `${title} ${cleanDesc}`),
        source: "Remotive",
        url: item.url,
        description: clipDescription(cleanDesc),
        skills: detectedSkills,
        postedAt,
        postedAtDate,
        applicationDeadline: getApplicationDeadline(item),
        logo: item.company_logo || undefined,
        remote: true,
        visaSponsorship: detectVisaSponsorship(cleanDesc),
      });
    }

    return jobs;
  } catch (err) {
    logger.warn("remotive_api_fetch_failed", { message: (err as Error).message });
    throw err;
  }
}

/**
 * Fetches live vacancies from Arbeitnow across professional categories.
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
      const cleanDesc = stripHtml(item.description || "");
      const searchableText = `${title} ${tags.join(" ")} ${cleanDesc}`.toLowerCase();
      if (lowerQuery && !searchableText.includes(lowerQuery)) continue;

      const detectedSkills = extractSkillsFromText(title + " " + cleanDesc, tags);

      jobs.push({
        id: `arbeitnow-${String(item.slug || `${title}-${company}`).toLowerCase().replace(/[^a-z0-9-]+/g, "-")}`,
        title,
        company,
        location: item.location || (item.remote ? "Remote" : "Location not listed"),
        salary: undefined,
        type: item.job_types?.[0] || undefined,
        industry: getIndustry(item),
        experienceLevel: inferExperienceLevel(item.experience_level || item.seniority || `${title} ${cleanDesc}`),
        source: "Arbeitnow",
        url: item.url,
        description: clipDescription(cleanDesc),
        skills: detectedSkills,
        ...formatPostedAt(item.created_at || item.createdAt || item.date),
        applicationDeadline: getApplicationDeadline(item),
        remote: Boolean(item.remote),
        visaSponsorship: detectVisaSponsorship(cleanDesc),
      });

      if (jobs.length >= 30) break;
    }

    return jobs;
  } catch (err) {
    logger.warn("arbeitnow_api_fetch_failed", { message: (err as Error).message });
    throw err;
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
  query: string = "",
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
      const company: string = item.company || "";
      const cleanDesc = stripHtml(item.snippet || "");
      const detectedSkills = extractSkillsFromText(title + " " + cleanDesc);

      const { postedAt, postedAtDate } = formatPostedAt(item.updated);
      const salaryDetails = parseSalaryDetails(item.salary || undefined);

      jobs.push({
        id: `jooble-${(item.id || item.link || title).toString().slice(0, 40)}`,
        title,
        company,
        location: item.location || "Location not listed",
        salary: item.salary || undefined,
        ...salaryDetails,
        type: item.type || undefined,
        industry: getIndustry(item),
        experienceLevel: inferExperienceLevel(item.experience_level || item.seniority || `${title} ${cleanDesc}`),
        source: "Jooble",
        url: item.link,
        description: clipDescription(cleanDesc),
        skills: detectedSkills,
        postedAt,
        postedAtDate,
        applicationDeadline: getApplicationDeadline(item),
        remote: /remote|wfh|jarak jauh/i.test(title + " " + cleanDesc),
        visaSponsorship: detectVisaSponsorship(cleanDesc),
      });
    }

    return jobs;
  } catch (err) {
    logger.warn("jooble_api_fetch_failed", { message: (err as Error).message });
    throw err;
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
      if (!title || item.id == null || !item.company) continue;

      const tags: string[] = Array.isArray(item.tags) ? item.tags : [];
      const cleanDesc = stripHtml(item.description || "");

      if (lowerQuery) {
        const haystack = (title + " " + tags.join(" ") + " " + cleanDesc).toLowerCase();
        if (!haystack.includes(lowerQuery)) continue;
      }

      const detectedSkills = extractSkillsFromText(title + " " + cleanDesc, tags);

      const { postedAt, postedAtDate } = formatPostedAt(item.date);

      jobs.push({
        id: `remoteok-${item.id}`,
        title,
        company: item.company || "",
        location: item.location || "Remote (location restrictions not listed)",
        salary:
          item.salary_min && item.salary_max
            ? `$${item.salary_min} - $${item.salary_max} /thn`
            : undefined,
        ...parseSalaryDetails(
          undefined,
          Number(item.salary_min) || undefined,
          Number(item.salary_max) || undefined,
          "USD",
          "annual"
        ),
        type: "Full-time (Remote)",
        industry: getIndustry(item),
        experienceLevel: inferExperienceLevel(item.experience_level || item.seniority || `${title} ${cleanDesc}`),
        source: "RemoteOK",
        url: item.url || `https://remoteok.com/remote-jobs/${item.id}`,
        description: clipDescription(cleanDesc),
        skills: detectedSkills,
        postedAt,
        postedAtDate,
        applicationDeadline: getApplicationDeadline(item),
        logo: item.company_logo || item.logo || undefined,
        remote: true,
        visaSponsorship: detectVisaSponsorship(cleanDesc),
      });

      if (jobs.length >= 30) break;
    }

    return jobs;
  } catch (err) {
    logger.warn("remoteok_api_fetch_failed", { message: (err as Error).message });
    throw err;
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
      if (!title || !(item.id || item.guid) || !item.companyName) continue;

      const tags: string[] = Array.isArray(item.tags) ? item.tags : Array.isArray(item.skills) ? item.skills : [];
      const cleanDesc = stripHtml(item.description || "");

      if (lowerQuery) {
        const haystack = (title + " " + tags.join(" ") + " " + cleanDesc).toLowerCase();
        if (!haystack.includes(lowerQuery)) continue;
      }

      const detectedSkills = extractSkillsFromText(title + " " + cleanDesc, tags);

      const locationLabel =
        Array.isArray(item.locationRestrictions) && item.locationRestrictions.length > 0
          ? item.locationRestrictions.join(", ")
          : "Remote (location restrictions not listed)";

      const { postedAt, postedAtDate } = formatPostedAt(item.pubDate);

      jobs.push({
        id: `himalayas-${item.id || item.guid || title}`.slice(0, 60),
        title,
        company: item.companyName || "",
        location: locationLabel,
        salary:
          item.minSalary && item.maxSalary
            ? `$${item.minSalary} - $${item.maxSalary} /thn`
            : undefined,
        ...parseSalaryDetails(
          undefined,
          Number(item.minSalary) || undefined,
          Number(item.maxSalary) || undefined,
          "USD",
          "annual"
        ),
        type: item.employmentType || undefined,
        industry: getIndustry(item),
        experienceLevel: inferExperienceLevel(item.experienceLevel || item.seniority || `${title} ${cleanDesc}`),
        source: "Himalayas",
        url: item.applicationLink || item.guid,
        description: clipDescription(cleanDesc),
        skills: detectedSkills,
        postedAt,
        postedAtDate,
        applicationDeadline: getApplicationDeadline(item),
        logo: item.companyLogo || undefined,
        remote: true,
        visaSponsorship: detectVisaSponsorship(cleanDesc),
      });

      if (jobs.length >= 30) break;
    }

    return jobs;
  } catch (err) {
    logger.warn("himalayas_api_fetch_failed", { message: (err as Error).message });
    throw err;
  }
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function getText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function normalizeAdzunaJob(item: unknown, market: AdzunaMarket): JobItem | undefined {
  const record = getRecord(item);
  if (!record) return undefined;
  const company = getText(getRecord(record.company)?.display_name);
  const title = getText(record.title);
  const description = stripHtml(getText(record.description));
  const rawUrl = getText(record.redirect_url);
  const id = typeof record.id === "string" || typeof record.id === "number"
    ? String(record.id).trim()
    : "";
  if (!company || !title || !description || !rawUrl || !id) return undefined;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return undefined;
  }
  const adzunaHosts = ["adzuna.com", "adzuna.co.uk", "adzuna.com.au", "adzuna.sg"];
  const isAdzunaHost = adzunaHosts.some((host) =>
    url.hostname === host || url.hostname.endsWith(`.${host}`)
  );
  if (url.protocol === "http:" && isAdzunaHost) url.protocol = "https:";
  if (url.protocol !== "https:") return undefined;

  const location = getText(getRecord(record.location)?.display_name) ||
    (market === "sg" ? "Singapore" : "Australia");
  const salaryMin = getNumber(record.salary_min);
  const salaryMax = getNumber(record.salary_max);
  const currency = market === "sg" ? "SGD" : "AUD";
  const formatSalary = (value: number) => new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
  const isSalaryEstimated = record.salary_is_predicted === 1 ||
    record.salary_is_predicted === true;
  const displayedSalary = salaryMin ?? salaryMax;
  const salary = displayedSalary !== undefined
    ? `${isSalaryEstimated ? "Perkiraan " : ""}${formatSalary(displayedSalary)}${
      salaryMin !== undefined && salaryMax !== undefined && salaryMax !== salaryMin
        ? ` - ${formatSalary(salaryMax)}`
        : ""
    } /tahun`
    : undefined;
  const cleanDescription = clipDescription(description);
  const { postedAt, postedAtDate } = formatPostedAt(record.created);
  const contractTime = getText(record.contract_time).replace(/_/g, "-");
  const contractType = getText(record.contract_type);
  const category = getText(getRecord(record.category)?.label);

  return {
    id: `adzuna-${market}-${id}`,
    title,
    company,
    location,
    salary,
    salaryMin,
    salaryMax,
    salaryCurrency: salaryMin !== undefined || salaryMax !== undefined ? currency : undefined,
    salaryPeriod: salaryMin !== undefined || salaryMax !== undefined ? "annual" : undefined,
    type: [contractTime, contractType].filter(Boolean).join(", ") || undefined,
    industry: category || undefined,
    experienceLevel: inferExperienceLevel(`${title} ${cleanDescription}`),
    source: "Adzuna",
    url: url.toString(),
    description: cleanDescription,
    skills: extractSkillsFromText(`${title} ${cleanDescription}`),
    postedAt,
    postedAtDate,
    remote: /\bremote\b/i.test(`${title} ${location} ${cleanDescription}`),
    visaSponsorship: detectVisaSponsorship(cleanDescription),
  };
}

export async function fetchAdzunaApiJobs(
  query: string,
  market: AdzunaMarket,
  locationQuery?: string
): Promise<JobItem[]> {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return [];
  try {
    const response = await axios.get(
      `https://api.adzuna.com/v1/api/jobs/${market}/search/1`,
      {
        timeout: 7_000,
        params: {
          app_id: ADZUNA_APP_ID,
          app_key: ADZUNA_APP_KEY,
          results_per_page: 50,
          what: query || undefined,
          where: locationQuery || undefined,
          "content-type": "application/json",
        },
        headers: { Accept: "application/json" },
      }
    );
    const results = getRecord(response.data)?.results;
    if (!Array.isArray(results)) {
      throw new Error("Adzuna returned an invalid jobs response.");
    }
    return results
      .map((item) => normalizeAdzunaJob(item, market))
      .filter((job): job is JobItem => Boolean(job));
  } catch (error) {
    logger.warn("adzuna_api_fetch_failed", {
      market,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Calculates skill overlap from the candidate's CV and the job's listed skills.
 */
export function calculateJobMatch(
  candidateSkills: string[],
  job: JobItem,
  candidateProfile: JobCandidateContext = {}
): JobItem {
  const normalizeSkill = (skill: string) =>
    skill.normalize("NFKC").toLowerCase().replace(/[\s._/-]+/g, "");
  const normCandidate = candidateSkills.map(normalizeSkill).filter(Boolean);

  const matching: string[] = [];
  const missing: string[] = [];

  if (normCandidate.length > 0) {
    for (const jobSkill of job.skills) {
      const jobSkillNormalized = normalizeSkill(jobSkill);
      const isMatched = jobSkillNormalized.length > 0 &&
        normCandidate.includes(jobSkillNormalized);
      if (isMatched) {
        if (!matching.includes(jobSkill)) matching.push(jobSkill);
      } else {
        if (!missing.includes(jobSkill)) missing.push(jobSkill);
      }
    }
  }

  const factors: Array<{ weight: number; score: number; reason: string }> = [];
  if (normCandidate.length > 0 && job.skills.length > 0) {
    const skillScore = matching.length / job.skills.length;
    factors.push({
      weight: 70,
      score: skillScore,
      reason: `${matching.length} dari ${job.skills.length} skill yang terdeteksi cocok.`,
    });
  }
  if (candidateProfile.targetRoles?.length) {
    const roleMatches = candidateProfile.targetRoles.filter((role) =>
      includesAny(job.title, [role])
    );
    factors.push({
      weight: 15,
      score: roleMatches.length > 0 ? 1 : 0,
      reason: roleMatches.length
        ? `Posisi sesuai target peran: ${roleMatches[0]}.`
        : "Judul posisi tidak cocok dengan target peran profil.",
    });
  }
  const jobIndustry = job.industry;
  if (candidateProfile.preferredIndustries?.length && jobIndustry) {
    const industryMatches = candidateProfile.preferredIndustries.filter((industry) =>
      includesAny(jobIndustry, [industry])
    );
    factors.push({
      weight: 10,
      score: industryMatches.length > 0 ? 1 : 0,
      reason: industryMatches.length
        ? `Industri cocok dengan preferensi: ${industryMatches[0]}.`
        : "Industri lowongan tidak cocok dengan preferensi profil.",
    });
  }
  if (candidateProfile.preferredLocations?.length) {
    const locationMatches = candidateProfile.preferredLocations.filter((location) =>
      includesAny(job.location, [location]) ||
      (job.remote && includesAny(location, ["remote", "hybrid"]))
    );
    factors.push({
      weight: 5,
      score: locationMatches.length > 0 ? 1 : 0,
      reason: locationMatches.length
        ? `Lokasi cocok dengan preferensi: ${locationMatches[0]}.`
        : "Lokasi lowongan tidak cocok dengan preferensi profil.",
    });
  }
  const jobType = job.type;
  if (candidateProfile.employmentPreferences?.length && jobType) {
    const typeMatches = candidateProfile.employmentPreferences.filter((type) =>
      includesAny(jobType, [type]) ||
      (type === "remote" && job.remote) ||
      (type === "onsite" && !job.remote && includesAny(jobType, ["full-time", "onsite", "on-site"]))
    );
    factors.push({
      weight: 5,
      score: typeMatches.length > 0 ? 1 : 0,
      reason: typeMatches.length
        ? `Jenis kerja cocok dengan preferensi: ${typeMatches[0]}.`
        : "Jenis kerja tidak cocok dengan preferensi profil.",
    });
  }

  const score = factors.length
    ? Math.round(
        (factors.reduce((total, factor) => total + factor.score * factor.weight, 0) /
          factors.reduce((total, factor) => total + factor.weight, 0)) * 100
      )
    : undefined;
  const applyRecommendation =
    score === undefined ? undefined :
      score >= 70 ? "apply" :
        score >= 45 ? "consider" : "low_priority";
  const recommendationReason =
    applyRecommendation === "apply"
      ? "Kecocokan profil cukup kuat; pertimbangkan melamar setelah memeriksa persyaratan lengkap."
      : applyRecommendation === "consider"
        ? "Ada beberapa kecocokan dan gap; tinjau persyaratan wajib sebelum melamar."
        : applyRecommendation === "low_priority"
          ? "Kecocokan terdeteksi rendah; prioritaskan lowongan yang lebih sesuai."
          : undefined;

  return {
    ...job,
    matchScore: score,
    matchingSkills: matching.slice(0, 6),
    missingSkills: missing.slice(0, 5),
    matchReasons: factors.map((factor) => factor.reason),
    applyRecommendation,
    recommendationReason,
  };
}

function getPostedAgeDays(postedAt?: string): number {
  if (!postedAt) return Number.POSITIVE_INFINITY;
  const label = postedAt.toLowerCase();
  if (label === "hari ini") return 0;
  if (label === "kemarin") return 1;
  const relative = label.match(/(\d+)\s+(hari|minggu) lalu/);
  if (relative) {
    const amount = Number(relative[1]);
    return amount * (relative[2] === "minggu" ? 7 : 1);
  }
  const parsedDate = Date.parse(postedAt);
  return Number.isNaN(parsedDate)
    ? Number.POSITIVE_INFINITY
    : Math.max(0, Math.floor((Date.now() - parsedDate) / 86_400_000));
}

/**
 * Main aggregator: pulls live jobs from Kalibrr, Remotive, Arbeitnow, Jooble,
 * RemoteOK, Himalayas, and the optional Adzuna API.
 */
export async function getAggregatedRecommendations(
  candidateSkills: string[] = [],
  options: JobFilterOptions = {},
  candidateProfile: JobCandidateContext = {}
): Promise<{ jobs: JobItem[]; sources: JobSourceStatus[] }> {
  const keyword = (options.keyword || "").trim();
  const location = options.location || "all";
  const category = options.category || "all";

  // Build targeted queries
  let effectiveKeyword = keyword;
  if (category !== "all") {
    effectiveKeyword = `${category} ${keyword}`.trim();
  }

  const fetchers: Array<{ label: string; source: JobItem["source"]; promise: Promise<JobItem[]> }> = [];
  const markets: Record<string, string> = {
    indonesia: "Indonesia",
    malaysia: "Malaysia",
    singapore: "Singapore",
    australia: "Australia",
  };

  // Indonesia has a dedicated local source; Jooble can query each target market.
  if (location === "indonesia" || location === "all") {
    fetchers.push({ label: "Kalibrr", source: "Kalibrr", promise: fetchKalibrrApiJobs(effectiveKeyword) });
  }

  if (location !== "remote" && !JOOBLE_API_KEY) {
    fetchers.push({ label: "Jooble", source: "Jooble", promise: Promise.resolve([]) });
  } else if (options.locationQuery?.trim() && location !== "remote") {
    fetchers.push({
      label: `Jooble (${options.locationQuery.trim()})`,
      source: "Jooble",
      promise: fetchJoobleApiJobs(effectiveKeyword, options.locationQuery.trim()),
    });
  } else if (location === "all") {
    for (const market of Object.values(markets)) {
      fetchers.push({
        label: `Jooble (${market})`,
        source: "Jooble",
        promise: fetchJoobleApiJobs(effectiveKeyword, market),
      });
    }
  } else if (location !== "remote") {
    fetchers.push({
      label: `Jooble (${markets[location]})`,
      source: "Jooble",
      promise: fetchJoobleApiJobs(effectiveKeyword, markets[location]),
    });
  }

  // Remote sources are useful alongside country-specific searches because some
  // employers accept candidates worldwide without local visa sponsorship.
  fetchers.push({ label: "Remotive", source: "Remotive", promise: fetchRemotiveApiJobs(effectiveKeyword) });
  fetchers.push({ label: "Arbeitnow", source: "Arbeitnow", promise: fetchArbeitnowApiJobs(effectiveKeyword) });
  fetchers.push({ label: "RemoteOK", source: "RemoteOK", promise: fetchRemoteOKApiJobs(effectiveKeyword) });
  fetchers.push({ label: "Himalayas", source: "Himalayas", promise: fetchHimalayasApiJobs(effectiveKeyword) });
  const adzunaMarkets: AdzunaMarket[] = location === "all"
    ? ["sg", "au"]
    : location === "singapore"
      ? ["sg"]
      : location === "australia"
        ? ["au"]
        : [];
  for (const market of adzunaMarkets) {
    fetchers.push({
      label: `Adzuna (${market === "sg" ? "Singapore" : "Australia"})`,
      source: "Adzuna",
      promise: fetchAdzunaApiJobs(effectiveKeyword, market, options.locationQuery?.trim()),
    });
  }

  // Run in parallel with graceful error handling
  const results = await Promise.allSettled(fetchers.map((fetcher) => fetcher.promise));
  const liveJobs: JobItem[] = [];
  const sources: JobSourceStatus[] = [];

  for (const [index, result] of results.entries()) {
    const fetcher = fetchers[index];
    if (
      (fetcher.source === "Jooble" && !JOOBLE_API_KEY) ||
      (fetcher.source === "Adzuna" && (!ADZUNA_APP_ID || !ADZUNA_APP_KEY))
    ) {
      sources.push({ label: fetcher.label, status: "not_configured", receivedCount: 0 });
    } else if (result.status === "rejected") {
      sources.push({ label: fetcher.label, status: "failed", receivedCount: 0 });
    } else {
      const sourceJobs = Array.isArray(result.value) ? result.value : [];
      liveJobs.push(...sourceJobs);
      sources.push({
        label: fetcher.label,
        status: sourceJobs.length > 0 ? "available" : "no_results",
        receivedCount: sourceJobs.length,
      });
    }
  }

  const combinedRaw = liveJobs.filter(
    isVerifiedJobListing
  );
  const marketAliases: Record<string, RegExp> = {
    indonesia: /\b(?:indonesia|jakarta|bandung|surabaya|yogyakarta|jogja|bali|denpasar|tangerang|bekasi|depok|batam|medan|semarang|makassar|malang|palembang|pekanbaru|balikpapan|samarinda|manado|pontianak|banjarmasin|cikarang|karawang|cilegon|solo|surakarta|bogor|cirebon|mataram|lombok|indonesia)\b/i,
    malaysia: /\b(?:malaysia|kuala lumpur|penang|johor|cyberjaya|selangor|sab[a-h]|sarawak|putrajaya|ipoh|melaka|malacca)\b/i,
    singapore: /\b(?:singapore|singapura)\b/i,
    australia: /\b(?:australia|sydney|melbourne|brisbane|perth|adelaide|canberra|darwin|hobart|gold coast)\b/i,
  };
  const selectedMarkets = location === "all"
    ? Object.keys(marketAliases)
    : [location];
  const marketJobs = combinedRaw.filter((job) => {
    if (options.locationQuery?.trim()) {
      return normalizeText(job.location).includes(normalizeText(options.locationQuery));
    }
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

  const filteredJobs = filterJobListings(uniqueJobs, options);
  const scoredJobs = filteredJobs.map((job) =>
    calculateJobMatch(candidateSkills, job, candidateProfile)
  );

  if (candidateSkills.length) {
    scoredJobs.sort((a, b) =>
      (b.matchScore ?? -1) - (a.matchScore ?? -1) ||
      getPostedAgeDays(a.postedAt) - getPostedAgeDays(b.postedAt) ||
      Number(b.visaSponsorship === "available") - Number(a.visaSponsorship === "available")
    );
  } else {
    scoredJobs.sort((a, b) =>
      getPostedAgeDays(a.postedAt) - getPostedAgeDays(b.postedAt) ||
      Number(b.visaSponsorship === "available") - Number(a.visaSponsorship === "available")
    );
  }

  return { jobs: scoredJobs.slice(0, 1_000), sources };
}