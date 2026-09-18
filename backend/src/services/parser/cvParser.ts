import fs from "fs/promises";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { Errors } from "../../utils/AppError";

export type SupportedMime =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function extractTextFromFile(
  filePath: string,
  mimeType: string
): Promise<string> {
  let text = "";

  try {
    if (mimeType === "application/pdf") {
      const buffer = await fs.readFile(filePath);
      const result = await pdfParse(buffer);
      text = result.text;
    } else if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      throw Errors.invalidFileType();
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("Only .pdf")) throw err;
    throw Errors.parsingFailed();
  }

  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  if (!cleaned || cleaned.length < 30) {
    throw Errors.emptyCv();
  }

  return cleaned;
}
