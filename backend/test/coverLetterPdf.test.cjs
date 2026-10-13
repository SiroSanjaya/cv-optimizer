const assert = require("node:assert/strict");
const test = require("node:test");
const { generateCoverLetterPdf } = require("../dist/services/document/coverLetterPdfGenerator");

test("cover letter PDF generator emits a PDF document", async () => {
  const stream = generateCoverLetterPdf({
    subject: "Application for Product Designer",
    recipient: "Hiring Team",
    content: "I am excited to apply for this role.",
    applicantName: "Jordan Lee",
    email: "jordan@example.com",
  });

  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const pdf = Buffer.concat(chunks);

  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.includes(Buffer.from("%%EOF")));
});
