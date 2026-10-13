const assert = require("node:assert/strict");
const test = require("node:test");
const { aiJobRequestSchema } = require("../dist/schemas/aiJob.schemas");
const {
  evaluateInterviewAnswer,
  generateInterviewSession,
} = require("../dist/services/ai/interview.service");

test("mock interview jobs accept Indonesian and English and default to Indonesian", () => {
  const startInput = {
    task: "cv.interview-start",
    input: { role: "Software Engineer" },
  };
  const evaluateInput = {
    task: "cv.interview-evaluate",
    input: { question: "Question?", answer: "A sufficiently detailed answer." },
  };

  assert.equal(aiJobRequestSchema.parse(startInput).input.language, "id");
  assert.equal(aiJobRequestSchema.parse(evaluateInput).input.language, "id");
  assert.equal(
    aiJobRequestSchema.parse({
      ...startInput,
      input: { ...startInput.input, language: "en" },
    }).input.language,
    "en"
  );
  assert.equal(
    aiJobRequestSchema.safeParse({
      ...evaluateInput,
      input: { ...evaluateInput.input, language: "fr" },
    }).success,
    false
  );
});

test("English fallback interview questions and short-answer feedback use English", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const questions = await generateInterviewSession({
      language: "en",
      type: "technical",
      questionCount: 1,
    });
    const evaluation = await evaluateInterviewAnswer({
      question: "How would you resolve this?",
      answer: "Yes.",
      language: "en",
    });

    assert.match(questions[0].question, /^How would you/);
    assert.match(evaluation.interviewerResponse, /I appreciate/);
    assert.match(evaluation.followUpQuestion, /Could you/);
  } finally {
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});
