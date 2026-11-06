import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractJson } from "../ai/jsonExtractor";
import { logger } from "../../utils/logger";
import { lookup } from "node:dns/promises";
import net from "node:net";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const AI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

export interface ImportedJob {
  company: string;
  position: string;
  location: string;
  jobType: string; // "full-time" | "part-time" | "contract" | "remote" | "hybrid"
  salaryRange: string;
  jobDescription: string; // raw full JD text
  skills: string[];
  requirements: string[];
  sourceUrl: string;
  sourcePlatform: string; // "linkedin" | "glints" | "jobstreet" | "indeed" | "kalibrr" | "manual"
  importedAt: string;
}

// Supported platforms and their HTML selectors for fast extraction
const PLATFORM_SELECTORS: Record<
  string,
  { domain: string; titleSel: string; companySel: string; descSel: string; locationSel: string }
> = {
  linkedin: {
    domain: "linkedin.com",
    titleSel: "h1.top-card-layout__title, h1.t-24",
    companySel: "a.topcard__org-name-link, .top-card-layout__second-subline span",
    descSel: ".show-more-less-html__markup, .description__text",
    locationSel: ".top-card-layout__second-subline .topcard__flavor--bullet",
  },
  glints: {
    domain: "glints.com",
    titleSel: "h1[data-cy='job-title'], h1",
    companySel: "a[data-cy='company-name'], .CompanyName",
    descSel: ".job-description, [data-cy='job-description']",
    locationSel: "[data-cy='job-location'], .JobInfo .location",
  },
  jobstreet: {
    domain: "jobstreet.co.id",
    titleSel: "h1[data-automation='job-detail-title']",
    companySel: "[data-automation='advertiser-name']",
    descSel: "[data-automation='jobAdDetails']",
    locationSel: "[data-automation='job-detail-location']",
  },
  kalibrr: {
    domain: "kalibrr.com",
    titleSel: "h1.job-title, h1",
    companySel: ".company-name",
    descSel: ".job-description",
    locationSel: ".location",
  },
  indeed: {
    domain: "indeed.com",
    titleSel: "h1.jobsearch-JobInfoHeader-title",
    companySel: "[data-company-name='true'], .jobsearch-InlineCompanyRating-companyHeader",
    descSel: "#jobDescriptionText",
    locationSel: ".jobsearch-JobInfoHeader-subtitle .jobsearch-JobInfoHeader-locationWrapper",
  },
};

function detectPlatform(url: string): string {
  for (const [platform, config] of Object.entries(PLATFORM_SELECTORS)) {
    if (url.includes(config.domain)) return platform;
  }
  return "manual";
}

function isPrivateIp(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }

  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd")
  );
}

export async function validatePublicJobUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("URL lowongan tidak valid.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("URL lowongan harus menggunakan HTTPS.");
  }
  if (parsed.username || parsed.password || parsed.port) {
    throw new Error("URL lowongan tidak boleh menyertakan credential atau port khusus.");
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("URL lowongan tidak boleh menunjuk ke host lokal.");
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error("URL lowongan tidak boleh menunjuk ke alamat privat.");
    }
  } else {
    let addresses: Awaited<ReturnType<typeof lookup>>[];
    try {
      addresses = await lookup(hostname, { all: true });
    } catch {
      throw new Error("Host URL lowongan tidak dapat ditemukan.");
    }
    if (!addresses.length || addresses.some((item) => isPrivateIp(item.address))) {
      throw new Error("URL lowongan tidak boleh menunjuk ke alamat privat.");
    }
  }

  return parsed;
}

/**
 * Fetch raw HTML from a URL with a browser-like User-Agent.
 * This fetches publicly accessible pages only — no login bypass.
 */
async function fetchPageHtml(url: string): Promise<string> {
  const response = await axios.get(url, {
    timeout: 12000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
    },
    maxRedirects: 0,
    maxContentLength: 5 * 1024 * 1024,
    maxBodyLength: 5 * 1024 * 1024,
    validateStatus: (status) => status >= 200 && status < 300,
    lookup: (
      hostname,
      options,
      callback
    ) => {
      const resolveAll = (options as { all?: boolean }).all === true;
      lookup(hostname, { all: true })
        .then((addresses) => {
          if (addresses.some((item) => isPrivateIp(item.address))) {
            callback(Object.assign(new Error("Private address blocked"), { code: "PRIVATE_ADDRESS_BLOCKED" }), []);
            return;
          }
          if (resolveAll) {
            callback(
              null,
              addresses.map((item) => ({
                address: item.address,
                family: item.family as 4 | 6,
              }))
            );
          } else {
            callback(
              null,
              addresses[0].address,
              addresses[0].family as 4 | 6
            );
          }
        })
        .catch((error: NodeJS.ErrnoException) => callback(error, []));
    },
  });
  return response.data as string;
}

/**
 * Try fast selector-based extraction before falling back to AI.
 */
function extractWithSelectors(
  html: string,
  platform: string
): { title: string; company: string; description: string; location: string } | null {
  const sel = PLATFORM_SELECTORS[platform];
  if (!sel) return null;

  const $ = cheerio.load(html);

  const title = $(sel.titleSel).first().text().trim();
  const company = $(sel.companySel).first().text().trim();
  const description = $(sel.descSel).first().text().trim();
  const location = $(sel.locationSel).first().text().trim();

  if (!title || !description) return null;

  return { title, company, description, location };
}

/**
 * Use Gemini to extract structured job data from raw HTML/text.
 * Used as fallback when selector-based extraction fails.
 */
async function extractWithAi(
  rawContent: string,
  sourceUrl: string
): Promise<Omit<ImportedJob, "importedAt" | "sourceUrl" | "sourcePlatform">> {
  const model = genAI.getGenerativeModel({ model: AI_MODEL });

  const prompt = `You are a job description parser. Extract structured information from the following job page content.

SOURCE URL: ${sourceUrl}

JOB PAGE CONTENT (first 8000 chars):
${rawContent.slice(0, 8000)}

Return ONLY a valid JSON object (no markdown):
{
  "company": "Company name or 'Unknown'",
  "position": "Exact job title",
  "location": "City, Country or 'Remote'",
  "jobType": "full-time|part-time|contract|remote|hybrid",
  "salaryRange": "Salary info or empty string",
  "jobDescription": "Full cleaned job description text (no HTML)",
  "skills": ["skill1", "skill2"],
  "requirements": ["requirement1", "requirement2"]
}`;

  const result = await model.generateContent(prompt);
  const parsed = extractJson<Omit<ImportedJob, "importedAt" | "sourceUrl" | "sourcePlatform">>(
    result.response.text()
  );

  return {
    company: parsed.company || "Unknown",
    position: parsed.position || "Unknown Position",
    location: parsed.location || "",
    jobType: parsed.jobType || "full-time",
    salaryRange: parsed.salaryRange || "",
    jobDescription: parsed.jobDescription || rawContent.slice(0, 5000),
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
  };
}

/**
 * Main: Import a job from URL.
 * Strategy: HTML fetch → fast selector extraction → AI enhancement/fallback.
 */
export async function importJobFromUrl(url: string): Promise<ImportedJob> {
  const validatedUrl = await validatePublicJobUrl(url);
  const normalizedUrl = validatedUrl.toString();
  const platform = detectPlatform(normalizedUrl);
  let html = "";

  try {
    html = await fetchPageHtml(normalizedUrl);
  } catch (err) {
    logger.warn("job_importer_fetch_failed", {
      url: normalizedUrl,
      error: err instanceof Error ? err.message : String(err),
    });
    throw new Error(
      "Halaman tidak dapat diakses. Coba salin teks job description secara manual."
    );
  }

  // Try fast selector extraction first
  const selectorResult = extractWithSelectors(html, platform);

  let jobData: Omit<ImportedJob, "importedAt" | "sourceUrl" | "sourcePlatform">;

  if (selectorResult && selectorResult.description.length > 100) {
    // Got good data from selectors, use AI only to enrich skills/requirements
    try {
      const enriched = await extractWithAi(selectorResult.description, normalizedUrl);
      jobData = {
        company: selectorResult.company || enriched.company,
        position: selectorResult.title || enriched.position,
        location: selectorResult.location || enriched.location,
        jobType: enriched.jobType,
        salaryRange: enriched.salaryRange,
        jobDescription: selectorResult.description,
        skills: enriched.skills,
        requirements: enriched.requirements,
      };
    } catch {
      // AI enrichment failed, use selector data as-is
      jobData = {
        company: selectorResult.company || "Unknown",
        position: selectorResult.title || "Unknown Position",
        location: selectorResult.location || "",
        jobType: "full-time",
        salaryRange: "",
        jobDescription: selectorResult.description,
        skills: [],
        requirements: [],
      };
    }
  } else {
    // Full AI extraction fallback
    const $ = cheerio.load(html);
    // Remove scripts, styles, nav, footer for cleaner text
    $("script, style, nav, footer, header, aside, [role='navigation']").remove();
    const cleanText = $("body").text().replace(/\s+/g, " ").trim();

    jobData = await extractWithAi(cleanText, normalizedUrl);
  }

  return {
    ...jobData,
    sourceUrl: normalizedUrl,
    sourcePlatform: platform,
    importedAt: new Date().toISOString(),
  };
}

/**
 * Parse a raw job description text (copy-paste fallback).
 * No fetch needed — direct AI extraction.
 */
export async function importJobFromText(
  rawText: string,
  sourceUrl?: string
): Promise<ImportedJob> {
  const jobData = await extractWithAi(rawText, sourceUrl || "manual");

  return {
    ...jobData,
    sourceUrl: sourceUrl || "",
    sourcePlatform: "manual",
    importedAt: new Date().toISOString(),
  };
}
