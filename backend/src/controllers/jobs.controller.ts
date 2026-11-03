import { Request, Response, NextFunction } from "express";
import {
  getAggregatedRecommendations,
  type JobCandidateContext,
  type JobFilterOptions,
} from "../services/jobs/jobAggregator";
import {
  searchTalentByRequirements,
  bulkScreenCvs,
  generateInterviewInvitationTemplate,
  generateCandidateOutreachPitch,
  analyzeCustomJobText,
} from "../services/jobs/talentSearch.service";
import { importJobFromUrl, importJobFromText } from "../services/jobs/jobImporter.service";
import { getOutcomeMetrics } from "../services/jobs/outcomeAnalytics.service";
import { prisma } from "../utils/prisma";
import { structuredCvSchema } from "../schemas/cv.schemas";
import { Errors } from "../utils/AppError";

export async function getRecommendedJobs(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      keyword = "",
      skills = "",
      location = "all",
      category = "all",
      company = "",
      industry = "",
      locationQuery = "",
      experienceLevel = "",
      employmentType = "",
      salaryMin = "",
      salaryMax = "",
      salaryCurrency = "IDR",
      salaryPeriod = "monthly",
    } = req.query;

    const readFilterText = (value: unknown, label: string, maxLength: number): string => {
      if (value === undefined || value === "") return "";
      if (typeof value !== "string" || value.trim().length > maxLength) {
        throw Errors.validation(`Filter ${label} tidak valid.`);
      }
      return value.trim();
    };
    const searchKeyword = readFilterText(keyword, "kata kunci", 200);
    const companyFilter = readFilterText(company, "perusahaan", 120);
    const industryFilter = readFilterText(industry, "industri", 120);
    const locationQueryFilter = readFilterText(locationQuery, "lokasi", 120);
    const employmentTypeFilter = readFilterText(employmentType, "tipe pekerjaan", 80);

    let candidateSkills: string[] = [];
    let isPersonalized = false;
    let candidateProfile: JobCandidateContext = {};

    if (skills !== "" && skills !== undefined && typeof skills !== "string") {
      throw Errors.validation("Daftar skill pencarian tidak valid.");
    }
    if (typeof skills === "string" && skills.trim().length > 0) {
      if (skills.length > 5_000) {
        throw Errors.validation("Daftar skill pencarian terlalu panjang.");
      }
      candidateSkills = skills.split(",").map((s) => s.trim()).filter(Boolean);
      isPersonalized = true;
    }

    if (req.userPayload?.userId) {
      const profile = await prisma.careerProfile.findUnique({
        where: { userId: req.userPayload.userId },
        select: {
          structuredCv: true,
          targetRoles: true,
          preferredIndustries: true,
          preferredLocations: true,
          employmentPreferences: true,
        },
      });
      if (profile) {
        candidateProfile = {
          targetRoles: profile.targetRoles,
          preferredIndustries: profile.preferredIndustries,
          preferredLocations: profile.preferredLocations,
          employmentPreferences: profile.employmentPreferences,
        };
        if (candidateSkills.length === 0) {
          const parsedProfileCv = structuredCvSchema.safeParse(profile.structuredCv);
          if (parsedProfileCv.success) {
            candidateSkills = parsedProfileCv.data.skills;
            isPersonalized = candidateSkills.length > 0;
          }
        }
      }

      if (candidateSkills.length === 0) {
        const latestCv = await prisma.cvVersion.findFirst({
          where: { userId: req.userPayload.userId },
          orderBy: { createdAt: "desc" },
        });

        const parsedLatestCv = latestCv
          ? structuredCvSchema.safeParse(latestCv.structured)
          : null;
        if (parsedLatestCv?.success) {
          candidateSkills = parsedLatestCv.data.skills;
          isPersonalized = candidateSkills.length > 0;
        }
      }
    }

    const supportedLocations = ["indonesia", "malaysia", "singapore", "australia", "remote", "all"] as const;
    if (
      typeof location !== "string" ||
      !supportedLocations.includes(location as (typeof supportedLocations)[number])
    ) {
      throw Errors.validation("Filter lokasi tidak valid.");
    }
    const locFilter = location as (typeof supportedLocations)[number];
    const supportedCategories = ["frontend", "backend", "fullstack", "data", "devops", "mobile", "all"] as const;
    if (
      typeof category !== "string" ||
      !supportedCategories.includes(category as (typeof supportedCategories)[number])
    ) {
      throw Errors.validation("Filter kategori tidak valid.");
    }
    const catFilter = category as (typeof supportedCategories)[number];
    const supportedExperienceLevels = ["internship", "entry", "mid", "senior", "lead"] as const;
    if (
      experienceLevel !== "" &&
      (typeof experienceLevel !== "string" ||
        !supportedExperienceLevels.includes(experienceLevel as (typeof supportedExperienceLevels)[number]))
    ) {
      throw Errors.validation("Filter tingkat pengalaman tidak valid.");
    }
    const expFilter = experienceLevel
      ? experienceLevel as (typeof supportedExperienceLevels)[number]
      : undefined;
    const parseSalaryFilter = (value: unknown, name: string): number | undefined => {
      if (value === undefined || value === "") return undefined;
      if (typeof value !== "string") throw Errors.validation(`Filter ${name} tidak valid.`);
      if (!value.trim()) return undefined;
      const parsed = Number(value.trim());
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 2_000_000_000) {
        throw Errors.validation(`Filter ${name} tidak valid.`);
      }
      return parsed;
    };
    const salaryMinFilter = parseSalaryFilter(salaryMin, "gaji minimum");
    const salaryMaxFilter = parseSalaryFilter(salaryMax, "gaji maksimum");
    if (
      salaryMinFilter !== undefined &&
      salaryMaxFilter !== undefined &&
      salaryMinFilter > salaryMaxFilter
    ) {
      throw Errors.validation("Gaji minimum tidak boleh melebihi gaji maksimum.");
    }
    const salaryCurrencies = ["IDR", "USD", "EUR", "GBP", "AUD", "SGD", "MYR"] as const;
    if (
      typeof salaryCurrency !== "string" ||
      !salaryCurrencies.includes(salaryCurrency as (typeof salaryCurrencies)[number])
    ) {
      throw Errors.validation("Filter mata uang gaji tidak valid.");
    }
    const salaryCurrencyFilter = salaryCurrency;
    const salaryPeriods = ["hourly", "monthly", "annual"] as const;
    if (
      typeof salaryPeriod !== "string" ||
      !salaryPeriods.includes(salaryPeriod as (typeof salaryPeriods)[number])
    ) {
      throw Errors.validation("Filter periode gaji tidak valid.");
    }
    const salaryPeriodFilter = salaryPeriod as (typeof salaryPeriods)[number];

    const filters: JobFilterOptions = {
      keyword: searchKeyword,
      company: companyFilter,
      industry: industryFilter,
      locationQuery: locationQueryFilter,
      location: locFilter,
      category: catFilter,
      experienceLevel: expFilter,
      employmentType: employmentTypeFilter,
      salaryMin: salaryMinFilter,
      salaryMax: salaryMaxFilter,
      salaryCurrency: salaryCurrencyFilter,
      salaryPeriod: salaryPeriodFilter,
    };
    isPersonalized ||= candidateSkills.length > 0 ||
      Object.values(candidateProfile).some((values) => (values?.length ?? 0) > 0);

    const recommendations = await getAggregatedRecommendations(
      candidateSkills,
      filters,
      candidateProfile
    );

    res.json({
      success: true,
      query: {
        keyword: searchKeyword,
        location: locFilter,
        category: catFilter,
        company: filters.company,
        industry: filters.industry,
        locationQuery: filters.locationQuery,
        skillsCount: candidateSkills.length,
        skills: candidateSkills,
        isPersonalized,
      },
      jobs: recommendations.jobs,
      sources: recommendations.sources,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * HR Portal: Search talent by job requirement text
 */
export async function searchTalentController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { requirementText, minExp, location } = req.body;
    if (!requirementText || typeof requirementText !== "string") {
      res.status(400).json({ success: false, error: "Deskripsi kebutuhan posisi wajib diisi." });
      return;
    }

    const data = await searchTalentByRequirements(requirementText, {
      minExp: minExp ? Number(minExp) : undefined,
      location,
    });

    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

/**
 * HR Portal: Bulk screen multiple CVs
 */
export async function bulkScreenCvsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { requirementText, rawCvs } = req.body;
    if (!requirementText || !Array.isArray(rawCvs) || rawCvs.length === 0) {
      res.status(400).json({ success: false, error: "Kebutuhan posisi dan list CV wajib disertakan." });
      return;
    }

    const results = await bulkScreenCvs(requirementText, rawCvs);
    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
}

/**
 * HR Portal: Generate interview invitation template
 */
export async function generateInterviewInviteController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { candidateName, jobTitle, companyName, interviewType, dateSchedule, platform } = req.body;
    const template = generateInterviewInvitationTemplate({
      candidateName: candidateName || "Kandidat",
      jobTitle: jobTitle || "Software Engineer",
      companyName: companyName || "Perusahaan",
      interviewType,
      dateSchedule,
      platform,
    });

    res.json({ success: true, template });
  } catch (err) {
    next(err);
  }
}

/**
 * Candidate Toolkit: Generate cold outreach pitch to HR
 */
export async function generateRecruiterPitchController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { candidateName, targetRole, targetCompany, candidateSkills, portfolioUrl } = req.body;
    const pitch = generateCandidateOutreachPitch({
      candidateName: candidateName || "Kandidat",
      targetRole: targetRole || "Software Engineer",
      targetCompany: targetCompany || "Perusahaan",
      candidateSkills: Array.isArray(candidateSkills) ? candidateSkills : ["React", "Node.js"],
      portfolioUrl,
    });

    res.json({ success: true, pitch });
  } catch (err) {
    next(err);
  }
}

/**
 * Candidate Toolkit: Analyze custom job text from Google Jobs / LinkedIn
 */
export async function analyzeCustomJobController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { jobText, candidateSkills } = req.body;
    if (!jobText || typeof jobText !== "string") {
      res.status(400).json({ success: false, error: "Teks atau deskripsi lowongan wajib diisi." });
      return;
    }

    const job = await analyzeCustomJobText({
      jobText,
      candidateSkills,
    });

    res.json({ success: true, job });
  } catch (err) {
    next(err);
  }
}

/**
 * Job Importer: Parse a job from a public URL (LinkedIn, Glints, JobStreet, etc.)
 */
export async function importJobFromUrlController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      res.status(400).json({ success: false, error: "URL lowongan tidak valid. Pastikan dimulai dengan https://" });
      return;
    }

    const job = await importJobFromUrl(url.trim());
    res.json({ success: true, job });
  } catch (err) {
    next(err);
  }
}

/**
 * Job Importer: Parse a job from raw pasted text (fallback)
 */
export async function importJobFromTextController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { text, sourceUrl } = req.body;
    if (!text || typeof text !== "string" || text.trim().length < 30) {
      res.status(400).json({ success: false, error: "Teks job description minimal 30 karakter." });
      return;
    }

    const job = await importJobFromText(text.trim(), sourceUrl?.trim());
    res.json({ success: true, job });
  } catch (err) {
    next(err);
  }
}

/**
 * Career Intelligence: Get aggregated outcome metrics for user's applications
 */
export async function getOutcomeMetricsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const metrics = await getOutcomeMetrics(userId);
    res.json({ success: true, metrics });
  } catch (err) {
    next(err);
  }
}
