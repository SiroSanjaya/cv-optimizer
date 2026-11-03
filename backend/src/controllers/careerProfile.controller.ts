import { Request, Response, NextFunction } from "express";
import { careerProfileInputSchema } from "../schemas/profile.schemas";
import { Errors } from "../utils/AppError";
import { prisma } from "../utils/prisma";
import type { Prisma } from "@prisma/client";

export async function getCareerProfile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    const profile = await prisma.careerProfile.findUnique({ where: { userId } });
    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
}

export async function saveCareerProfile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    const parsed = careerProfileInputSchema.safeParse(req.body);
    if (!parsed.success) {
      throw Errors.validation(parsed.error.issues[0]?.message || "Profil karier tidak valid.");
    }

    const { structuredCv, ...fields } = parsed.data;
    const profile = await prisma.careerProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...fields,
        structuredCv: structuredCv as Prisma.InputJsonValue,
      },
      update: {
        ...fields,
        structuredCv: structuredCv as Prisma.InputJsonValue,
      },
    });

    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
}

export async function listCvVersions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    const versions = await prisma.cvVersion.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true, structured: true, createdAt: true },
      take: 20,
    });

    res.json({ success: true, versions });
  } catch (error) {
    next(error);
  }
}
