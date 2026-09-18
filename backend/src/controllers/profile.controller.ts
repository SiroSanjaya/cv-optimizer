import { Request, Response, NextFunction } from "express";
import {
  parseProfileFromUrl,
  parseProfileFromExportJson,
  parseProfileFromRawText,
} from "../services/profile/profileParser";
import { analyzeCvAgainstJob } from "../services/cv/cvService";
import { Errors } from "../utils/AppError";

export async function importProfile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { type, url, content, jobDescription } = req.body;

    let structuredCv;

    if (type === "url") {
      if (!url) throw Errors.validation("Profile URL is required.");
      structuredCv = await parseProfileFromUrl(url);
    } else if (type === "json") {
      if (!content) throw Errors.validation("JSON content is required.");
      structuredCv = await parseProfileFromExportJson(content);
    } else if (type === "text") {
      if (!content) throw Errors.validation("Profile text is required.");
      structuredCv = await parseProfileFromRawText(content);
    } else {
      throw Errors.validation("Invalid import type. Use 'url', 'json', or 'text'.");
    }

    let analysis = null;
    if (jobDescription && typeof jobDescription === "string" && jobDescription.trim().length >= 20) {
      analysis = await analyzeCvAgainstJob(structuredCv, jobDescription.trim());
    }

    res.json({
      success: true,
      cv: structuredCv,
      analysis,
    });
  } catch (err) {
    next(err);
  }
}
