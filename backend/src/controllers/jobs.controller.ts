import { Request, Response, NextFunction } from "express";
import { getAggregatedRecommendations } from "../services/jobs/jobAggregator";
import {
  searchTalentByRequirements,
  bulkScreenCvs,
  generateInterviewInvitationTemplate,
  generateCandidateOutreachPitch,
  analyzeCustomJobText,
} from "../services/jobs/talentSearch.service";
import { prisma } from "../utils/prisma";

export async function getRecommendedJobs(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { keyword = "", skills = "", location = "all", category = "all" } = req.query;

    let candidateSkills: string[] = [];
    let isPersonalized = false;

    if (typeof skills === "string" && skills.trim().length > 0) {
      candidateSkills = skills.split(",").map((s) => s.trim()).filter(Boolean);
      isPersonalized = true;
    }

    // If candidate skills weren't passed in query, try to get from user's latest CV version in DB
    if (candidateSkills.length === 0 && req.userPayload?.userId) {
      const latestCv = await prisma.cvVersion.findFirst({
        where: { userId: req.userPayload.userId },
        orderBy: { createdAt: "desc" },
      });

      if (latestCv && typeof latestCv.structured === "object" && latestCv.structured !== null) {
        const struct = latestCv.structured as any;
        if (Array.isArray(struct.skills)) {
          candidateSkills = struct.skills.map((s: any) => (typeof s === "string" ? s : s.name || ""));
          if (candidateSkills.length > 0) {
            isPersonalized = true;
          }
        }
      }
    }

    const searchKeyword = (typeof keyword === "string" && keyword.trim()) ? keyword.trim() : "";
    const supportedLocations = ["indonesia", "malaysia", "singapore", "australia", "remote", "all"] as const;
    const locFilter = supportedLocations.includes(String(location) as (typeof supportedLocations)[number])
      ? String(location) as (typeof supportedLocations)[number]
      : "all";
    const catFilter = (["frontend", "backend", "fullstack", "data", "devops", "mobile", "all"].includes(String(category)) ? String(category) : "all") as any;

    const jobs = await getAggregatedRecommendations(candidateSkills, {
      keyword: searchKeyword || candidateSkills[0] || "developer",
      location: locFilter,
      category: catFilter,
    });

    res.json({
      success: true,
      query: {
        keyword: searchKeyword,
        location: locFilter,
        category: catFilter,
        skillsCount: candidateSkills.length,
        skills: candidateSkills,
        isPersonalized,
      },
      jobs,
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
