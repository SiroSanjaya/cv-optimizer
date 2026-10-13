import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export interface CoverLetterPdfInput {
  subject: string;
  recipient: string;
  content: string;
  applicantName: string;
  email?: string;
  phone?: string;
}

export function generateCoverLetterPdf(
  coverLetter: CoverLetterPdfInput
): PassThrough {
  const doc = new PDFDocument({ size: "A4", margin: 56 });
  const stream = new PassThrough();
  doc.pipe(stream);

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#173b32")
    .text(coverLetter.applicantName || "Applicant");

  const contactDetails = [coverLetter.email, coverLetter.phone].filter(Boolean);
  if (contactDetails.length) {
    doc
      .moveDown(0.25)
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#5b6470")
      .text(contactDetails.join(" | "));
  }

  doc
    .moveDown(1.5)
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111827")
    .text(coverLetter.subject);

  doc
    .moveDown(1)
    .font("Helvetica")
    .fontSize(10.5)
    .fillColor("#111827")
    .text(coverLetter.recipient || "Hiring Team");

  doc
    .moveDown(1)
    .font("Helvetica")
    .fontSize(10.5)
    .fillColor("#222222")
    .text(coverLetter.content, { lineGap: 4, paragraphGap: 8 });

  doc
    .moveDown(1.5)
    .font("Helvetica")
    .fontSize(10.5)
    .fillColor("#222222")
    .text("Hormat saya,");

  doc
    .moveDown(0.5)
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor("#111827")
    .text(coverLetter.applicantName || "Applicant");

  doc.end();
  return stream;
}
