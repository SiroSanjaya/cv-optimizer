import PDFDocument from "pdfkit";
import { StructuredCv } from "../../types/cv.types";
import { PassThrough } from "stream";

const MARGIN = 48;
const FONT_REGULAR = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";

function addSectionHeading(doc: PDFKit.PDFDocument, title: string) {
  if (doc.y > doc.page.height - MARGIN - 60) {
    doc.addPage();
  } else {
    doc.moveDown(0.9);
  }

  doc
    .font(FONT_BOLD)
    .fontSize(11)
    .fillColor("#0f172a")
    .text(title.toUpperCase(), { characterSpacing: 0.8 });

  const lineY = doc.y + 3;
  doc
    .moveTo(MARGIN, lineY)
    .lineTo(doc.page.width - MARGIN, lineY)
    .strokeColor("#cbd5e1")
    .lineWidth(0.75)
    .stroke();

  doc.moveDown(0.55);
}

/**
 * Generates an elegant, modern, spacious single-column ATS-friendly PDF.
 * Readable font sizing, generous line spacing, and clean visual hierarchy.
 */
export function generateCvPdf(cv: StructuredCv): PassThrough {
  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    autoFirstPage: true,
    info: {
      Title: `${cv.personalInfo.name || "Curriculum Vitae"} - CV`,
      Author: cv.personalInfo.name || "Candidate",
    },
  });
  const stream = new PassThrough();
  doc.pipe(stream);

  // Header: Name
  doc
    .font(FONT_BOLD)
    .fontSize(22)
    .fillColor("#0f172a")
    .text(cv.personalInfo.name || "Your Name", { characterSpacing: 0.3 });

  // Contact info
  const contactParts = [
    cv.personalInfo.email,
    cv.personalInfo.phone,
    cv.personalInfo.location,
    cv.personalInfo.linkedin,
    cv.personalInfo.github,
  ].filter(Boolean);

  if (contactParts.length) {
    doc.moveDown(0.25);
    doc
      .font(FONT_REGULAR)
      .fontSize(9.5)
      .fillColor("#475569")
      .text(contactParts.join("   •   "), { lineGap: 2 });
  }

  doc.moveDown(0.4);

  // Professional Summary
  if (cv.summary) {
    addSectionHeading(doc, "Professional Summary");
    doc
      .font(FONT_REGULAR)
      .fontSize(9.8)
      .fillColor("#334155")
      .text(cv.summary, { lineGap: 3.5 });
  }

  // Skills
  if (cv.skills.length) {
    addSectionHeading(doc, "Technical & Professional Skills");
    doc
      .font(FONT_REGULAR)
      .fontSize(9.8)
      .fillColor("#334155")
      .text(cv.skills.join("   •   "), { lineGap: 3.8 });
  }

  // Work Experience
  if (cv.experience.length) {
    addSectionHeading(doc, "Work Experience");
    cv.experience.forEach((exp, idx) => {
      if (doc.y > doc.page.height - MARGIN - 70) {
        doc.addPage();
      }

      // Role Title
      doc
        .font(FONT_BOLD)
        .fontSize(10.5)
        .fillColor("#0f172a")
        .text(exp.position || "Role");

      // Company and Date
      const subInfo = [
        exp.company,
        exp.startDate && exp.endDate ? `${exp.startDate} – ${exp.endDate}` : exp.startDate || exp.endDate,
      ].filter(Boolean).join("   |   ");

      if (subInfo) {
        doc.moveDown(0.15);
        doc
          .font(FONT_REGULAR)
          .fontSize(9.5)
          .fillColor("#64748b")
          .text(subInfo);
      }

      doc.moveDown(0.3);

      // Bullets
      if (exp.bullets && exp.bullets.length) {
        for (const bullet of exp.bullets) {
          doc
            .font(FONT_REGULAR)
            .fontSize(9.6)
            .fillColor("#334155")
            .text(`•   ${bullet}`, {
              indent: 6,
              lineGap: 3.2,
              paragraphGap: 2.5,
            });
        }
      }

      // Space between jobs
      if (idx < cv.experience.length - 1) {
        doc.moveDown(0.65);
      }
    });
  }

  // Projects
  if (cv.projects.length) {
    addSectionHeading(doc, "Key Projects");
    cv.projects.forEach((proj, idx) => {
      if (doc.y > doc.page.height - MARGIN - 60) {
        doc.addPage();
      }

      doc
        .font(FONT_BOLD)
        .fontSize(10.5)
        .fillColor("#0f172a")
        .text(proj.name || "Project");

      if (proj.technologies && proj.technologies.length) {
        doc.moveDown(0.15);
        doc
          .font(FONT_REGULAR)
          .fontSize(9.2)
          .fillColor("#64748b")
          .text(`Tech stack: ${proj.technologies.join(", ")}`);
      }

      if (proj.description) {
        doc.moveDown(0.2);
        doc
          .font(FONT_REGULAR)
          .fontSize(9.6)
          .fillColor("#334155")
          .text(proj.description, { lineGap: 3.2, paragraphGap: 2 });
      }

      if (proj.bullets && proj.bullets.length) {
        doc.moveDown(0.2);
        for (const bullet of proj.bullets) {
          doc
            .font(FONT_REGULAR)
            .fontSize(9.6)
            .fillColor("#334155")
            .text(`•   ${bullet}`, {
              indent: 6,
              lineGap: 3.2,
              paragraphGap: 2.5,
            });
        }
      }

      if (idx < cv.projects.length - 1) {
        doc.moveDown(0.6);
      }
    });
  }

  // Education
  if (cv.education.length) {
    addSectionHeading(doc, "Education");
    cv.education.forEach((edu, idx) => {
      if (doc.y > doc.page.height - MARGIN - 50) {
        doc.addPage();
      }

      doc
        .font(FONT_BOLD)
        .fontSize(10.5)
        .fillColor("#0f172a")
        .text(`${edu.degree || ""}${edu.field ? ", " + edu.field : ""}`);

      const eduSub = [
        edu.institution,
        edu.startDate && edu.endDate ? `${edu.startDate} – ${edu.endDate}` : edu.startDate || edu.endDate,
      ].filter(Boolean).join("   |   ");

      if (eduSub) {
        doc.moveDown(0.15);
        doc
          .font(FONT_REGULAR)
          .fontSize(9.5)
          .fillColor("#64748b")
          .text(eduSub);
      }

      if (idx < cv.education.length - 1) {
        doc.moveDown(0.5);
      }
    });
  }

  // Certifications
  if (cv.certifications.length) {
    addSectionHeading(doc, "Certifications");
    doc
      .font(FONT_REGULAR)
      .fontSize(9.8)
      .fillColor("#334155")
      .text(cv.certifications.join("   •   "), { lineGap: 3.5 });
  }

  doc.end();
  return stream;
}
