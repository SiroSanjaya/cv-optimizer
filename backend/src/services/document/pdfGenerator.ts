import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { StructuredCv } from "../../types/cv.types";

export type CvPdfTemplate = "executive" | "classic" | "tech";
export type CvPdfDensity = "spacious" | "compact";

export interface CvPdfOptions {
  template?: CvPdfTemplate;
  density?: CvPdfDensity;
}

interface PdfStyle {
  margin: number;
  regularFont: string;
  boldFont: string;
  accentColor: string;
  headingColor: string;
  bodyColor: string;
  mutedColor: string;
  ruleColor: string;
  compact: boolean;
}

function getStyle(template: CvPdfTemplate, density: CvPdfDensity): PdfStyle {
  const templateStyle = {
    executive: {
      regularFont: "Helvetica",
      boldFont: "Helvetica-Bold",
      accentColor: "#047857",
      headingColor: "#065f46",
      bodyColor: "#334155",
      mutedColor: "#64748b",
      ruleColor: "#a7c9bb",
    },
    classic: {
      regularFont: "Times-Roman",
      boldFont: "Times-Bold",
      accentColor: "#57534e",
      headingColor: "#44403c",
      bodyColor: "#44403c",
      mutedColor: "#78716c",
      ruleColor: "#d6d3d1",
    },
    tech: {
      regularFont: "Courier",
      boldFont: "Courier-Bold",
      accentColor: "#0f172a",
      headingColor: "#0f172a",
      bodyColor: "#334155",
      mutedColor: "#64748b",
      ruleColor: "#94a3b8",
    },
  }[template];

  return {
    ...templateStyle,
    margin: density === "compact" ? 38 : 48,
    compact: density === "compact",
  };
}

function addSectionHeading(
  doc: PDFKit.PDFDocument,
  title: string,
  style: PdfStyle
) {
  if (doc.y > doc.page.height - style.margin - 60) {
    doc.addPage();
  } else {
    doc.moveDown(style.compact ? 0.6 : 0.9);
  }

  doc
    .font(style.boldFont)
    .fontSize(style.compact ? 10.5 : 11)
    .fillColor(style.headingColor)
    .text(title.toUpperCase(), { characterSpacing: style.compact ? 0.4 : 0.8 });

  const lineY = doc.y + 3;
  doc
    .moveTo(style.margin, lineY)
    .lineTo(doc.page.width - style.margin, lineY)
    .strokeColor(style.ruleColor)
    .lineWidth(0.75)
    .stroke();

  doc.moveDown(style.compact ? 0.35 : 0.55);
}

export function generateCvPdf(
  cv: StructuredCv,
  options: CvPdfOptions = {}
): PassThrough {
  const template = options.template ?? "executive";
  const density = options.density ?? "spacious";
  const style = getStyle(template, density);
  const bodyFontSize = style.compact ? 9.2 : 9.8;
  const bodyLineGap = style.compact ? 2 : 3.5;
  const itemGap = style.compact ? 0.3 : 0.6;
  const doc = new PDFDocument({
    size: "A4",
    margin: style.margin,
    autoFirstPage: true,
    info: {
      Title: `${cv.personalInfo.name || "Curriculum Vitae"} - CV`,
      Author: cv.personalInfo.name || "Candidate",
    },
  });
  const stream = new PassThrough();
  doc.pipe(stream);

  if (template === "tech") {
    doc
      .moveTo(style.margin, doc.y)
      .lineTo(doc.page.width - style.margin, doc.y)
      .strokeColor(style.accentColor)
      .lineWidth(1.5)
      .stroke();
    doc.moveDown(0.5);
  }

  doc
    .font(style.boldFont)
    .fontSize(style.compact ? 20 : 22)
    .fillColor(template === "executive" ? style.headingColor : "#0f172a")
    .text(cv.personalInfo.name || "Your Name", {
      characterSpacing: template === "tech" ? 0 : 0.3,
      align: template === "classic" ? "center" : "left",
    });

  const contactParts = [
    cv.personalInfo.email,
    cv.personalInfo.phone,
    cv.personalInfo.location,
    cv.personalInfo.linkedin,
    cv.personalInfo.github,
  ].filter(Boolean);

  if (contactParts.length) {
    doc.moveDown(style.compact ? 0.15 : 0.25);
    doc
      .font(style.regularFont)
      .fontSize(style.compact ? 8.8 : 9.5)
      .fillColor(style.mutedColor)
      .text(contactParts.join("   •   "), {
        lineGap: style.compact ? 1 : 2,
        align: template === "classic" ? "center" : "left",
      });
  }

  doc.moveDown(style.compact ? 0.25 : 0.4);

  if (cv.summary) {
    addSectionHeading(doc, "Professional Summary", style);
    doc
      .font(style.regularFont)
      .fontSize(bodyFontSize)
      .fillColor(style.bodyColor)
      .text(cv.summary, { lineGap: bodyLineGap });
  }

  if (cv.skills.length) {
    addSectionHeading(doc, "Technical & Professional Skills", style);
    doc
      .font(style.regularFont)
      .fontSize(bodyFontSize)
      .fillColor(style.bodyColor)
      .text(cv.skills.join("   •   "), { lineGap: bodyLineGap });
  }

  if (cv.experience.length) {
    addSectionHeading(doc, "Work Experience", style);
    cv.experience.forEach((exp, idx) => {
      if (doc.y > doc.page.height - style.margin - 70) {
        doc.addPage();
      }

      doc
        .font(style.boldFont)
        .fontSize(style.compact ? 10 : 10.5)
        .fillColor("#0f172a")
        .text(exp.position || "Role");

      const subInfo = [
        exp.company,
        exp.startDate && exp.endDate
          ? `${exp.startDate} – ${exp.endDate}`
          : exp.startDate || exp.endDate,
      ].filter(Boolean).join("   |   ");

      if (subInfo) {
        doc.moveDown(0.15);
        doc
          .font(style.regularFont)
          .fontSize(style.compact ? 9 : 9.5)
          .fillColor(style.mutedColor)
          .text(subInfo);
      }

      doc.moveDown(style.compact ? 0.15 : 0.3);

      if (exp.bullets.length) {
        for (const bullet of exp.bullets) {
          doc
            .font(style.regularFont)
            .fontSize(style.compact ? 9.1 : 9.6)
            .fillColor(style.bodyColor)
            .text(`•   ${bullet}`, {
              indent: 6,
              lineGap: bodyLineGap,
              paragraphGap: style.compact ? 1 : 2.5,
            });
        }
      }

      if (idx < cv.experience.length - 1) {
        doc.moveDown(style.compact ? 0.4 : 0.65);
      }
    });
  }

  if (cv.projects.length) {
    addSectionHeading(doc, "Key Projects", style);
    cv.projects.forEach((proj, idx) => {
      if (doc.y > doc.page.height - style.margin - 60) {
        doc.addPage();
      }

      doc
        .font(style.boldFont)
        .fontSize(style.compact ? 10 : 10.5)
        .fillColor("#0f172a")
        .text(proj.name || "Project");

      if (proj.technologies.length) {
        doc.moveDown(0.15);
        doc
          .font(style.regularFont)
          .fontSize(style.compact ? 8.8 : 9.2)
          .fillColor(style.mutedColor)
          .text(`Tech stack: ${proj.technologies.join(", ")}`);
      }

      if (proj.description) {
        doc.moveDown(style.compact ? 0.1 : 0.2);
        doc
          .font(style.regularFont)
          .fontSize(style.compact ? 9 : 9.6)
          .fillColor(style.bodyColor)
          .text(proj.description, {
            lineGap: bodyLineGap,
            paragraphGap: style.compact ? 1 : 2,
          });
      }

      if (proj.bullets.length) {
        doc.moveDown(style.compact ? 0.1 : 0.2);
        for (const bullet of proj.bullets) {
          doc
            .font(style.regularFont)
            .fontSize(style.compact ? 9 : 9.6)
            .fillColor(style.bodyColor)
            .text(`•   ${bullet}`, {
              indent: 6,
              lineGap: bodyLineGap,
              paragraphGap: style.compact ? 1 : 2.5,
            });
        }
      }

      if (idx < cv.projects.length - 1) {
        doc.moveDown(itemGap);
      }
    });
  }

  if (cv.education.length) {
    addSectionHeading(doc, "Education", style);
    cv.education.forEach((edu, idx) => {
      if (doc.y > doc.page.height - style.margin - 50) {
        doc.addPage();
      }

      doc
        .font(style.boldFont)
        .fontSize(style.compact ? 10 : 10.5)
        .fillColor("#0f172a")
        .text(`${edu.degree || ""}${edu.field ? ", " + edu.field : ""}`);

      const eduSub = [
        edu.institution,
        edu.startDate && edu.endDate
          ? `${edu.startDate} – ${edu.endDate}`
          : edu.startDate || edu.endDate,
      ].filter(Boolean).join("   |   ");

      if (eduSub) {
        doc.moveDown(0.15);
        doc
          .font(style.regularFont)
          .fontSize(style.compact ? 9 : 9.5)
          .fillColor(style.mutedColor)
          .text(eduSub);
      }

      if (idx < cv.education.length - 1) {
        doc.moveDown(style.compact ? 0.3 : 0.5);
      }
    });
  }

  if (cv.certifications.length) {
    addSectionHeading(doc, "Certifications", style);
    doc
      .font(style.regularFont)
      .fontSize(bodyFontSize)
      .fillColor(style.bodyColor)
      .text(cv.certifications.join("   •   "), { lineGap: bodyLineGap });
  }

  doc.end();
  return stream;
}
