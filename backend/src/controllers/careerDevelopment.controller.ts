import { Request, Response, NextFunction } from "express";
import type { Prisma } from "@prisma/client";
import {
  careerDevelopmentProgressSchema,
  careerDevelopmentTargetSchema,
} from "../schemas/careerDevelopment.schemas";
import { structuredCvSchema } from "../schemas/cv.schemas";
import {
  buildCareerDevelopmentAnalysis,
  toCareerDevelopmentPlanResponse,
} from "../services/careerDevelopment.service";
import { getAggregatedRecommendations } from "../services/jobs/jobAggregator";
import { submitAiJob } from "../services/ai/aiTasks";
import { prisma } from "../utils/prisma";
import { Errors } from "../utils/AppError";

async function getCareerContext(userId: string, targetRole: string) {
  const profile = await prisma.careerProfile.findUnique({
    where: { userId },
    select: { structuredCv: true },
  });
  if (!profile) {
    throw Errors.validation("Lengkapi profil karier dan tambahkan CV sebelum membuat rencana.");
  }
  const parsedCv = structuredCvSchema.safeParse(profile.structuredCv);
  if (!parsedCv.success) {
    throw Errors.internal("Data CV di profil karier tidak valid.");
  }

  const { jobs, sources } = await getAggregatedRecommendations(
    parsedCv.data.skills,
    { keyword: targetRole, location: "all" }
  );
  const analysis = buildCareerDevelopmentAnalysis(
    targetRole,
    parsedCv.data.skills,
    jobs
  );
  return { cv: parsedCv.data, analysis, sources };
}

function getUserId(req: Request): string {
  const userId = req.userPayload?.userId;
  if (!userId) throw Errors.unauthorized();
  return userId;
}

export async function analyzeCareerDevelopment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = careerDevelopmentTargetSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation("Target role tidak valid.");
    const { analysis, sources } = await getCareerContext(getUserId(req), parsed.data.targetRole);
    res.json({ success: true, analysis, sources });
  } catch (error) {
    next(error);
  }
}

export async function generateCareerDevelopmentPlan(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = careerDevelopmentTargetSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation("Target role tidak valid.");
    const userId = getUserId(req);
    const { cv, analysis } = await getCareerContext(userId, parsed.data.targetRole);
    if (analysis.jobCount === 0 || analysis.skillDemand.length === 0) {
      throw Errors.validation(
        "Belum ada lowongan terverifikasi dengan informasi skill untuk role ini. Coba lagi nanti atau gunakan kata kunci role yang lebih umum."
      );
    }

    const experienceSummary = cv.experience.slice(0, 5).map((experience) =>
      `${experience.position}: ${experience.bullets.slice(0, 2).join("; ")}`.slice(0, 500)
    );
    const existingProjects = cv.projects.slice(0, 5).map((project) =>
      `${project.name}: ${project.description}`.slice(0, 300)
    );
    const job = await submitAiJob(userId, {
      task: "career-development.plan",
      input: {
        targetRole: analysis.targetRole,
        jobCount: analysis.jobCount,
        skillDemand: analysis.skillDemand,
        skillGaps: analysis.skillGaps,
        currentSkills: cv.skills.slice(0, 100),
        experienceSummary,
        existingProjects,
        certificationCatalog: analysis.certifications,
      },
    });
    res.status(202).json({ success: true, ...job });
  } catch (error) {
    next(error);
  }
}

export async function getCareerDevelopmentPlan(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const record = await prisma.careerDevelopmentPlan.findUnique({
      where: { userId: getUserId(req) },
    });
    res.json({
      success: true,
      plan: record ? toCareerDevelopmentPlanResponse(record) : null,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCareerDevelopmentProgress(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = careerDevelopmentProgressSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation("Progress milestone tidak valid.");
    const record = await prisma.careerDevelopmentPlan.findUnique({
      where: { userId: getUserId(req) },
    });
    if (!record) throw Errors.notFound("Rencana pengembangan karier belum tersedia.");
    const plan = toCareerDevelopmentPlanResponse(record);
    const milestoneExists = [
      ...plan.learningRecommendations.map((item) => item.id),
      ...plan.portfolioProjects.map((item) => item.id),
      ...plan.certifications.map((item) => item.id),
    ].includes(parsed.data.milestoneId);
    if (!milestoneExists) throw Errors.notFound("Milestone tidak ditemukan.");

    const progress = {
      ...plan.progress,
      [parsed.data.milestoneId]: parsed.data.status,
    };
    const updated = await prisma.careerDevelopmentPlan.update({
      where: { userId: getUserId(req) },
      data: { progress: progress as Prisma.InputJsonValue },
    });
    res.json({ success: true, plan: toCareerDevelopmentPlanResponse(updated) });
  } catch (error) {
    next(error);
  }
}
