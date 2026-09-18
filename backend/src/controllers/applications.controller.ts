import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { Errors } from "../utils/AppError";
import { ApplicationStatus } from "@prisma/client";

export async function listApplications(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    const { status } = req.query;

    const applications = await prisma.application.findMany({
      where: {
        userId,
        ...(status ? { status: status as ApplicationStatus } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json({ success: true, applications });
  } catch (err) {
    next(err);
  }
}

export async function getApplicationMetrics(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    const apps = await prisma.application.findMany({
      where: { userId },
      select: {
        status: true,
        matchScore: true,
        hireProb: true,
        appliedAt: true,
      },
    });

    const total = apps.length;
    const byStatus = apps.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const interviewing =
      (byStatus["hr_interview"] || 0) +
      (byStatus["user_interview"] || 0) +
      (byStatus["technical_test"] || 0);

    const offers = byStatus["offer"] || 0;
    const rejected = byStatus["rejected"] || 0;

    const scores = apps
      .map((a) => a.matchScore)
      .filter((s): s is number => typeof s === "number");
    const avgMatchScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    res.json({
      success: true,
      metrics: {
        total,
        interviewing,
        offers,
        rejected,
        byStatus,
        avgMatchScore,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createApplication(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    const {
      company,
      position,
      jobDescription,
      jobUrl,
      matchScore,
      hireProb,
      status,
      notes,
      analysis,
    } = req.body;

    if (!jobDescription && !company && !position) {
      throw Errors.validation("Company, position, or job description is required.");
    }

    const application = await prisma.application.create({
      data: {
        userId,
        company: company?.trim() || "Untitled Company",
        position: position?.trim() || "Untitled Role",
        jobDescription: jobDescription || "",
        jobUrl: jobUrl?.trim() || null,
        matchScore: typeof matchScore === "number" ? matchScore : null,
        hireProb: typeof hireProb === "number" ? hireProb : null,
        status: (status as ApplicationStatus) || ApplicationStatus.applied,
        notes: notes?.trim() || null,
        analysis: analysis || undefined,
      },
    });

    res.status(201).json({ success: true, application });
  } catch (err) {
    next(err);
  }
}

export async function updateApplication(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    const { id } = req.params;
    const { company, position, status, notes, jobUrl, hireProb, matchScore } = req.body;

    // Verify ownership
    const existing = await prisma.application.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw Errors.notFound("Application not found");
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        ...(company !== undefined && { company: company.trim() }),
        ...(position !== undefined && { position: position.trim() }),
        ...(status !== undefined && { status: status as ApplicationStatus }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(jobUrl !== undefined && { jobUrl: jobUrl?.trim() || null }),
        ...(hireProb !== undefined && { hireProb }),
        ...(matchScore !== undefined && { matchScore }),
      },
    });

    res.json({ success: true, application: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteApplication(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    const { id } = req.params;

    const existing = await prisma.application.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw Errors.notFound("Application not found");
    }

    await prisma.application.delete({
      where: { id },
    });

    res.json({ success: true, message: "Application deleted successfully" });
  } catch (err) {
    next(err);
  }
}
