const assert = require("node:assert/strict");
const test = require("node:test");
const {
  analyzeRequestSchema,
  coverLetterPdfRequestSchema,
  coverLetterRequestSchema,
  pdfRequestSchema,
  structuredCvSchema,
} = require("../dist/schemas/cv.schemas");

test("analysis schema trims valid job descriptions and rejects short input", () => {
  assert.equal(
    analyzeRequestSchema.parse({ jobDescription: "  Senior engineer role  " }).jobDescription,
    "Senior engineer role"
  );
  assert.equal(analyzeRequestSchema.safeParse({ jobDescription: "short" }).success, false);
});

test("structured CV schema normalizes nullable and missing fields", () => {
  const cv = structuredCvSchema.parse({
    personalInfo: { name: null },
    skills: "TypeScript, React",
  });

  assert.equal(cv.personalInfo.name, "");
  assert.deepEqual(cv.skills, ["TypeScript", "React"]);
  assert.deepEqual(cv.experience, []);
  assert.deepEqual(cv.education, []);
});

test("PDF request schema validates template and density with compatible defaults", () => {
  const defaults = pdfRequestSchema.parse({ cv: {} });
  assert.equal(defaults.template, "executive");
  assert.equal(defaults.density, "spacious");

  const customized = pdfRequestSchema.safeParse({
    cv: {},
    template: "tech",
    density: "compact",
  });
  assert.equal(customized.success, true);
  assert.equal(
    pdfRequestSchema.safeParse({ cv: {}, template: "unknown" }).success,
    false
  );
});

test("cover letter schema accepts company-specific context and limits personalization text", () => {
  const cvData = structuredCvSchema.parse({});
  const request = coverLetterRequestSchema.safeParse({
    cvData,
    jobDescription: "A detailed job description for a product designer role.",
    companyName: "Northstar Labs",
    targetRole: "Product Designer",
    hiringManager: "Jordan Lee",
    motivation: "I am interested in the accessibility work described by the company.",
  });

  assert.equal(request.success, true);
  assert.equal(
    coverLetterRequestSchema.safeParse({
      cvData,
      jobDescription: "A detailed job description for a product designer role.",
      motivation: "x".repeat(2001),
    }).success,
    false
  );
});

test("cover letter PDF schema requires non-empty letter content", () => {
  const request = {
    subject: "Application for Product Designer",
    recipient: "Hiring Team",
    content: "I am excited to apply for this role.",
    applicantName: "Jordan Lee",
  };

  assert.equal(coverLetterPdfRequestSchema.safeParse(request).success, true);
  assert.equal(
    coverLetterPdfRequestSchema.safeParse({ ...request, content: " " }).success,
    false
  );
});
