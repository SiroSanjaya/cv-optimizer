import { Request, Response, NextFunction } from "express";
import { Errors } from "../utils/AppError";
import {
  StarStoryInputSchema,
  StarStoryUpdateSchema,
} from "../types/vault.types";
import {
  listVaultStories,
  getVaultStory,
  createVaultStory,
  updateVaultStory,
  deleteVaultStory,
  extractStarStoriesFromCv,
  matchStoriesForJob,
} from "../services/vault/vault.service";

export async function listVaultController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    const { category, search } = req.query;

    const stories = await listVaultStories(userId, {
      category: typeof category === "string" ? category : undefined,
      search: typeof search === "string" ? search : undefined,
    });

    res.json({
      success: true,
      count: stories.length,
      stories,
    });
  } catch (err) {
    next(err);
  }
}

export async function getVaultController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    const story = await getVaultStory(req.params.id, userId);

    res.json({
      success: true,
      story,
    });
  } catch (err) {
    next(err);
  }
}

export async function createVaultController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    const parsed = StarStoryInputSchema.safeParse(req.body);
    if (!parsed.success) {
      throw Errors.validation(parsed.error.errors[0]?.message || "Data input tidak valid.");
    }

    const story = await createVaultStory(userId, parsed.data);

    res.status(201).json({
      success: true,
      story,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateVaultController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    const parsed = StarStoryUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw Errors.validation(parsed.error.errors[0]?.message || "Data update tidak valid.");
    }

    const story = await updateVaultStory(req.params.id, userId, parsed.data);

    res.json({
      success: true,
      story,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteVaultController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    await deleteVaultStory(req.params.id, userId);

    res.json({
      success: true,
      message: "STAR story berhasil dihapus.",
    });
  } catch (err) {
    next(err);
  }
}

export async function extractFromCvController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    const { cvContent } = req.body;
    if (!cvContent || typeof cvContent !== "string" || cvContent.trim().length < 30) {
      throw Errors.validation("Mohon sertakan teks atau konten CV (minimal 30 karakter).");
    }

    const extracted = await extractStarStoriesFromCv(cvContent);

    res.json({
      success: true,
      count: extracted.length,
      extracted,
    });
  } catch (err) {
    next(err);
  }
}

export async function matchForJobController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userPayload?.userId;
    if (!userId) throw Errors.unauthorized();

    const { jobDescription } = req.body;
    if (!jobDescription || typeof jobDescription !== "string" || jobDescription.trim().length < 20) {
      throw Errors.validation("Mohon masukkan deskripsi pekerjaan (minimal 20 karakter).");
    }

    const result = await matchStoriesForJob(userId, jobDescription);

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}
