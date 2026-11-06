import type { AiJobRequest } from "../../schemas/aiJob.schemas";
import { getAIProvider } from "./aiProviderFactory";
import {
  parseProfileFromExportJson,
  parseProfileFromRawText,
  parseProfileFromUrl,
} from "../profile/profileParser";
import {
  analyzeCvAgainstJob,
  generateCoverLetter,
  generateInterviewPrep,
  generateTailoredCv,
} from "../cv/cvService";
import {
  bulkScreenCvs,
} from "../jobs/talentSearch.service";
import {
  evaluateInterviewAnswer,
  generateInterviewSession,
} from "./interview.service";
import { prisma } from "../../utils/prisma";
import { structuredCvSchema } from "../../schemas/cv.schemas";
import type { Prisma } from "@prisma/client";
import { saveCareerDevelopmentPlan } from "../careerDevelopment.service";
import { importJobFromUrl, importJobFromText } from "../jobs/jobImporter.service";
import { extractStarStoriesFromCv } from "../vault/vault.service";

async function saveCvVersion(
  userId: string,
  jobId: string,
  label: string,
  cv: unknown
): Promise<string> {
  const parsedCv = structuredCvSchema.safeParse(cv);
  if (!parsedCv.success) {
    throw new Error("Cannot persist an invalid structured CV version.");
  }

  const version = await prisma.cvVersion.upsert({
    where: { sourceJobId: jobId },
    create: {
      userId,
      sourceJobId: jobId,
      label,
      structured: parsedCv.data as Prisma.InputJsonValue,
    },
    update: {
      userId,
      label,
      structured: parsedCv.data as Prisma.InputJsonValue,
    },
  });
  return version.id;
}

export async function processAiJob(
  request: AiJobRequest,
  userId: string,
  jobId: string
): Promise<unknown> {
  switch (request.task) {
    case "cv.analyze": {
      const cv = request.input.cvData ??
        await getAIProvider().extractStructuredCv(request.input.rawCvText!);
      const analysis = await analyzeCvAgainstJob(cv, request.input.jobDescription);
      const cvVersionId = await saveCvVersion(userId, jobId, "CV asli", cv);
      return { success: true, cv, analysis, cvVersionId };
    }
    case "cv.generate": {
      const { cvData, jobDescription, analysis } = request.input;
      const cv = await generateTailoredCv(cvData, jobDescription, analysis);
      const cvVersionId = await saveCvVersion(userId, jobId, "CV disesuaikan", cv);
      return { success: true, cv, cvVersionId };
    }
    case "cv.cover-letter": {
      const { cvData, jobDescription, ...options } = request.input;
      const coverLetter = await generateCoverLetter(cvData, jobDescription, options);
      return { success: true, coverLetter };
    }
    case "cv.interview-prep": {
      const { cvData, jobDescription } = request.input;
      const questions = await generateInterviewPrep(cvData, jobDescription);
      return { success: true, questions };
    }
    case "cv.interview-start": {
      const questions = await generateInterviewSession(request.input);
      return { success: true, questions };
    }
    case "cv.interview-evaluate": {
      const evaluation = await evaluateInterviewAnswer(request.input);
      return { success: true, evaluation };
    }
    case "profile.import": {
      const { type, url, content, jobDescription } = request.input;
      const cv = type === "url"
        ? await parseProfileFromUrl(url!)
        : type === "json"
          ? await parseProfileFromExportJson(content!)
          : await parseProfileFromRawText(content!);
      const analysis = jobDescription && jobDescription.trim().length >= 20
        ? await analyzeCvAgainstJob(cv, jobDescription.trim())
        : null;
      const cvVersionId = await saveCvVersion(userId, jobId, "CV impor", cv);
      return { success: true, cv, analysis, cvVersionId };
    }
    case "jobs.bulk-screen": {
      const results = await bulkScreenCvs(
        request.input.requirementText,
        request.input.rawCvs
      );
      return { success: true, results };
    }
    case "career-development.plan": {
      const plan = await saveCareerDevelopmentPlan(
        userId,
        request.input,
        request.input.skillGaps
      );
      return { success: true, plan };
    }
    case "jobs.import-url": {
      const job = await importJobFromUrl(request.input.url);
      return { success: true, job };
    }
    case "jobs.import-text": {
      const job = await importJobFromText(
        request.input.text,
        request.input.sourceUrl
      );
      return { success: true, job };
    }
    case "vault.extract-star": {
      const extracted = await extractStarStoriesFromCv(request.input.cvContent);
      return { success: true, count: extracted.length, extracted };
    }
  }
}
