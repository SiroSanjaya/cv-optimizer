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

export async function processAiJob(request: AiJobRequest): Promise<unknown> {
  switch (request.task) {
    case "cv.analyze": {
      const cv = request.input.cvData ??
        await getAIProvider().extractStructuredCv(request.input.rawCvText!);
      const analysis = await analyzeCvAgainstJob(cv, request.input.jobDescription);
      return { success: true, cv, analysis };
    }
    case "cv.generate": {
      const { cvData, jobDescription, analysis } = request.input;
      const cv = await generateTailoredCv(cvData, jobDescription, analysis);
      return { success: true, cv };
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
      return { success: true, cv, analysis };
    }
    case "jobs.bulk-screen": {
      const results = await bulkScreenCvs(
        request.input.requirementText,
        request.input.rawCvs
      );
      return { success: true, results };
    }
  }
}
