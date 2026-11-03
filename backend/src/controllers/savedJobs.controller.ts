import { Request, Response, NextFunction } from "express";
import { savedJobInputSchema } from "../schemas/profile.schemas";
import { Errors } from "../utils/AppError";
import { prisma } from "../utils/prisma";

export async function listSavedJobs(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    const jobs = await prisma.savedJob.findMany({
      where: { userId },
      orderBy: { savedAt: "desc" },
    });
    res.json({ success: true, jobs });
  } catch (error) {
    next(error);
  }
}

export async function saveJob(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    const parsed = savedJobInputSchema.safeParse(req.body);
    if (!parsed.success) {
      throw Errors.validation(parsed.error.issues[0]?.message || "Data lowongan tidak valid.");
    }

    const {
      postedAtDate,
      applicationDeadline,
      ...fields
    } = parsed.data;
    const job = await prisma.savedJob.upsert({
      where: { userId_externalId: { userId, externalId: fields.externalId } },
      create: {
        userId,
        ...fields,
        postedAtDate: postedAtDate ? new Date(postedAtDate) : null,
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
      },
      update: {
        ...fields,
        postedAtDate: postedAtDate ? new Date(postedAtDate) : null,
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
      },
    });
    res.status(201).json({ success: true, job });
  } catch (error) {
    next(error);
  }
}

export async function removeSavedJob(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    const externalId = req.params.externalId;
    const result = await prisma.savedJob.deleteMany({
      where: { userId, externalId },
    });
    if (result.count === 0) throw Errors.notFound("Lowongan tersimpan tidak ditemukan.");
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
