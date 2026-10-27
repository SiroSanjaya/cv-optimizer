const assert = require("node:assert/strict");
const test = require("node:test");
const { generateCvPdf } = require("../dist/services/document/pdfGenerator");
const { structuredCvSchema } = require("../dist/schemas/cv.schemas");

async function toBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

test("PDF generation applies the selected template and density", async () => {
  const cv = structuredCvSchema.parse({
    personalInfo: { name: "Avery Example", email: "avery@example.com" },
    summary: "Experienced engineer focused on reliable systems.",
    skills: ["TypeScript", "Node.js"],
    experience: [{
      company: "Example Labs",
      position: "Software Engineer",
      startDate: "2022",
      endDate: "Present",
      bullets: ["Built a reliable API used by thousands of people."],
    }],
    projects: [{
      name: "Resume Optimizer",
      description: "A tool for creating tailored resumes.",
      technologies: ["TypeScript", "PDFKit"],
      bullets: ["Improved document export."],
    }],
    education: [{
      institution: "Example University",
      degree: "BSc",
      field: "Computer Science",
      startDate: "2018",
      endDate: "2022",
    }],
    certifications: ["Cloud Practitioner"],
  });
  const defaultPdf = await toBuffer(generateCvPdf(cv));
  const classicPdf = await toBuffer(generateCvPdf(cv, {
    template: "classic",
    density: "spacious",
  }));
  const compactPdf = await toBuffer(generateCvPdf(cv, {
    template: "executive",
    density: "compact",
  }));

  assert.equal(defaultPdf.subarray(0, 5).toString(), "%PDF-");
  assert.notDeepEqual(classicPdf, defaultPdf);
  assert.notDeepEqual(compactPdf, defaultPdf);
});
