import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { StructuredCv } from "../../types/cv.types";
import { Errors } from "../../utils/AppError";
import { logger } from "../../utils/logger";

const geminiApiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(geminiApiKey);

const STRUCTURE_PROMPT = `
You are an expert HR and ATS data parser. Convert the given profile information (scraped web page, LinkedIn text, or profile export) into a structured JSON CV matching this exact schema:

{
  "personalInfo": {
    "name": "Full Name",
    "email": "email if available or empty string",
    "phone": "phone if available or empty string",
    "location": "City, Country or empty string",
    "linkedin": "LinkedIn profile link or empty string",
    "portfolio": "website or github if found or empty string"
  },
  "summary": "Professional executive summary of candidate (2-3 sentences)",
  "skills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4"],
  "experience": [
    {
      "company": "Company Name",
      "position": "Job Title",
      "startDate": "Start Date (e.g. Jan 2022)",
      "endDate": "End Date or Present",
      "highlights": [
        "Achievement or responsibility with action verb and metric if available"
      ]
    }
  ],
  "education": [
    {
      "institution": "University / School Name",
      "degree": "Degree / Major",
      "startDate": "Start Date or empty",
      "endDate": "End Date or empty"
    }
  ],
  "certifications": [
    {
      "name": "Certification name if found",
      "issuer": "Issuer",
      "date": "Date if found"
    }
  ]
}

Return ONLY valid JSON. Do not include markdown codeblocks or extra text.
`;

export async function parseProfileFromUrl(url: string): Promise<StructuredCv> {
  try {
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      throw Errors.validation("Invalid URL. Please include https://");
    }

    logger.info("scraping_profile_url", { url: cleanUrl });

    // Fetch page text
    const response = await axios.get(cleanUrl, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
      },
    });

    const $ = cheerio.load(response.data);

    // Remove script, style, navigation noise
    $("script, style, nav, footer, noscript, svg").remove();
    const rawText = $("body").text().replace(/\s+/g, " ").trim();

    if (rawText.length < 50) {
      throw new Error("Page content too short or blocked by authentication wall.");
    }

    return await structureProfileTextWithAI(rawText.slice(0, 10000), `Source URL: ${cleanUrl}`);
  } catch (err: any) {
    logger.warn("scrape_url_failed", { message: err.message });
    throw Errors.validation(
      `Could not automatically extract profile from ${url} (${err.message}). Social networks often block direct bots. Please try copying & pasting your profile text or JSON export instead!`
    );
  }
}

export async function parseProfileFromExportJson(jsonContent: string): Promise<StructuredCv> {
  try {
    const parsed = typeof jsonContent === "string" ? JSON.parse(jsonContent) : jsonContent;
    const textRepresentation = JSON.stringify(parsed, null, 2);
    return await structureProfileTextWithAI(textRepresentation.slice(0, 12000), "LinkedIn JSON Export");
  } catch (err: any) {
    throw Errors.validation("Invalid JSON file. Please provide a valid LinkedIn export JSON.");
  }
}

export async function parseProfileFromRawText(text: string): Promise<StructuredCv> {
  if (!text || text.trim().length < 40) {
    throw Errors.validation("Profile text is too short. Please paste at least 40 characters.");
  }
  return await structureProfileTextWithAI(text.trim().slice(0, 10000), "Pasted Profile Text");
}

async function structureProfileTextWithAI(content: string, contextLabel: string): Promise<StructuredCv> {
  try {
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const prompt = `${STRUCTURE_PROMPT}\n\nContext: ${contextLabel}\nRaw Content:\n${content}`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const start = responseText.indexOf("{");
    const end = responseText.lastIndexOf("}");
    const jsonStr = start !== -1 && end !== -1 ? responseText.slice(start, end + 1) : responseText;
    const structured = JSON.parse(jsonStr) as StructuredCv;
    return structured;
  } catch (err: any) {
    logger.error("gemini_structure_profile_failed", { error: err.message });
    throw Errors.internal("Failed to process profile data with AI. Please try again.");
  }
}
