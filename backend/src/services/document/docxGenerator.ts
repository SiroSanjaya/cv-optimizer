import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  BorderStyle,
} from "docx";
import { StructuredCv } from "../../types/cv.types";

function sectionHeading(title: string): Paragraph {
  return new Paragraph({
    text: title.toUpperCase(),
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    border: {
      bottom: { color: "CCCCCC", space: 1, style: BorderStyle.SINGLE, size: 4 },
    },
  });
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({ text: `- ${text}`, spacing: { after: 60 } });
}

export async function generateCvDocx(cv: StructuredCv): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: cv.personalInfo.name || "Your Name", bold: true, size: 32 }),
      ],
      spacing: { after: 60 },
    })
  );

  const contactParts = [
    cv.personalInfo.email,
    cv.personalInfo.phone,
    cv.personalInfo.location,
    cv.personalInfo.linkedin,
    cv.personalInfo.github,
  ].filter(Boolean);

  if (contactParts.length) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: contactParts.join("  |  "), size: 20, color: "444444" })],
        spacing: { after: 120 },
      })
    );
  }

  if (cv.summary) {
    children.push(sectionHeading("Professional Summary"));
    children.push(new Paragraph({ text: cv.summary, spacing: { after: 120 } }));
  }

  if (cv.skills.length) {
    children.push(sectionHeading("Skills"));
    children.push(new Paragraph({ text: cv.skills.join(" • "), spacing: { after: 120 } }));
  }

  if (cv.experience.length) {
    children.push(sectionHeading("Work Experience"));
    for (const exp of cv.experience) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${exp.position || "Role"} — ${exp.company || "Company"}`, bold: true }),
          ],
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${exp.startDate || ""} - ${exp.endDate || ""}`, color: "666666", size: 18 }),
          ],
        })
      );
      exp.bullets.forEach((b) => children.push(bulletParagraph(b)));
      children.push(new Paragraph({ text: "", spacing: { after: 100 } }));
    }
  }

  if (cv.projects.length) {
    children.push(sectionHeading("Projects"));
    for (const proj of cv.projects) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: proj.name || "Project", bold: true })] })
      );
      if (proj.technologies.length) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: proj.technologies.join(", "), color: "666666", size: 18 })],
          })
        );
      }
      if (proj.description) {
        children.push(new Paragraph({ text: proj.description }));
      }
      proj.bullets.forEach((b) => children.push(bulletParagraph(b)));
      children.push(new Paragraph({ text: "", spacing: { after: 100 } }));
    }
  }

  if (cv.education.length) {
    children.push(sectionHeading("Education"));
    for (const edu of cv.education) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${edu.degree || ""}${edu.field ? ", " + edu.field : ""}`, bold: true }),
          ],
        })
      );
      children.push(new Paragraph({ text: edu.institution || "" }));
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${edu.startDate || ""} - ${edu.endDate || ""}`, color: "666666", size: 18 }),
          ],
          spacing: { after: 100 },
        })
      );
    }
  }

  if (cv.certifications.length) {
    children.push(sectionHeading("Certifications"));
    children.push(new Paragraph({ text: cv.certifications.join(", ") }));
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}
