import PDFDocument from "pdfkit";
import { StructuredCv } from "../../types/cv.types";
import { PassThrough } from "stream";

const MARGIN = 50;
const FONT_REGULAR = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";

function addSectionHeading(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.8);
  doc
    .font(FONT_BOLD)
    .fontSize(12)
    .fillColor("#111111")
    .text(title.toUpperCase(), { characterSpacing: 0.5 });
  doc
    .moveTo(doc.x, doc.y + 2)
    .lineTo(doc.page.width - MARGIN, doc.y + 2)
    .strokeColor("#cccccc")
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.5);
}

/**
 * Generates a clean, single-column, ATS-friendly PDF.
 * No tables, no text boxes, no images, no multi-column layout.
 */
export function generateCvPdf(cv: StructuredCv): PassThrough {
  const doc = new PDFDocument({ size: "A4", margin: MARGIN });
  const stream = new PassThrough();
  doc.pipe(stream);

  // Header: name + contact
  doc.font(FONT_BOLD).fontSize(20).fillColor("#111111").text(
    cv.personalInfo.name || "Your Name"
  );

  const contactParts = [
    cv.personalInfo.email,
    cv.personalInfo.phone,
    cv.personalInfo.location,
    cv.personalInfo.linkedin,
    cv.personalInfo.github,
  ].filter(Boolean);

  if (contactParts.length) {
    doc
      .font(FONT_REGULAR)
      .fontSize(10)
      .fillColor("#444444")
      .text(contactParts.join("  |  "));
  }

  // Summary
  if (cv.summary) {
    addSectionHeading(doc, "Professional Summary");
    doc.font(FONT_REGULAR).fontSize(10.5).fillColor("#222222").text(cv.summary, {
      lineGap: 2,
    });
  }

  // Skills
  if (cv.skills.length) {
    addSectionHeading(doc, "Skills");
    doc
      .font(FONT_REGULAR)
      .fontSize(10.5)
      .fillColor("#222222")
      .text(cv.skills.join(" • "), { lineGap: 2 });
  }

  // Experience
  if (cv.experience.length) {
    addSectionHeading(doc, "Work Experience");
    for (const exp of cv.experience) {
      doc
        .font(FONT_BOLD)
        .fontSize(11)
        .fillColor("#111111")
        .text(`${exp.position || "Role"} — ${exp.company || "Company"}`);
      doc
        .font(FONT_REGULAR)
        .fontSize(9.5)
        .fillColor("#666666")
        .text(`${exp.startDate || ""} - ${exp.endDate || ""}`);
      doc.moveDown(0.2);
      for (const bullet of exp.bullets) {
        doc
          .font(FONT_REGULAR)
          .fontSize(10.5)
          .fillColor("#222222")
          .text(`- ${bullet}`, { indent: 10, lineGap: 1 });
      }
      doc.moveDown(0.4);
    }
  }

  // Projects
  if (cv.projects.length) {
    addSectionHeading(doc, "Projects");
    for (const proj of cv.projects) {
      doc.font(FONT_BOLD).fontSize(11).fillColor("#111111").text(proj.name || "Project");
      if (proj.technologies.length) {
        doc
          .font(FONT_REGULAR)
          .fontSize(9.5)
          .fillColor("#666666")
          .text(proj.technologies.join(", "));
      }
      if (proj.description) {
        doc
          .font(FONT_REGULAR)
          .fontSize(10.5)
          .fillColor("#222222")
          .text(proj.description, { lineGap: 1 });
      }
      for (const bullet of proj.bullets) {
        doc
          .font(FONT_REGULAR)
          .fontSize(10.5)
          .fillColor("#222222")
          .text(`- ${bullet}`, { indent: 10, lineGap: 1 });
      }
      doc.moveDown(0.4);
    }
  }

  // Education
  if (cv.education.length) {
    addSectionHeading(doc, "Education");
    for (const edu of cv.education) {
      doc
        .font(FONT_BOLD)
        .fontSize(11)
        .fillColor("#111111")
        .text(`${edu.degree || ""}${edu.field ? ", " + edu.field : ""}`);
      doc
        .font(FONT_REGULAR)
        .fontSize(10)
        .fillColor("#444444")
        .text(edu.institution || "");
      doc
        .font(FONT_REGULAR)
        .fontSize(9.5)
        .fillColor("#666666")
        .text(`${edu.startDate || ""} - ${edu.endDate || ""}`);
      doc.moveDown(0.3);
    }
  }

  // Certifications
  if (cv.certifications.length) {
    addSectionHeading(doc, "Certifications");
    doc
      .font(FONT_REGULAR)
      .fontSize(10.5)
      .fillColor("#222222")
      .text(cv.certifications.join(", "), { lineGap: 2 });
  }

  doc.end();
  return stream;
}
