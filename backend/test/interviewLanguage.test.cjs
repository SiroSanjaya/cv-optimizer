const assert = require("node:assert/strict");
const test = require("node:test");
const { GoogleGenerativeAI } = require("@google/generative-ai");
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
  const contextualStartInput = {
    ...startInput,
    input: {
      ...startInput.input,
      companyName: "Example Corp",
      jobDescription: "Build and operate payment APIs using Node.js and PostgreSQL.",
    },
  };
  const contextualEvaluateInput = {
    ...evaluateInput,
    input: {
      ...evaluateInput.input,
      companyName: "Example Corp",
      jobDescription: "Build and operate payment APIs using Node.js and PostgreSQL.",
    },
  };

  assert.equal(aiJobRequestSchema.parse(startInput).input.language, "id");
  assert.equal(aiJobRequestSchema.parse(evaluateInput).input.language, "id");
  assert.equal(aiJobRequestSchema.parse(contextualStartInput).input.companyName, "Example Corp");
  assert.equal(aiJobRequestSchema.parse(contextualEvaluateInput).input.companyName, "Example Corp");
  assert.equal(
    aiJobRequestSchema.safeParse({
      ...evaluateInput,
      input: {
        ...evaluateInput.input,
        conversationHistory: Array.from({ length: 9 }, () => ({
          question: "Question?",
          answer: "Answer.",
        })),
      },
    }).success,
    false
  );
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
      remainingTurns: 1,
    });

    assert.match(questions[0].question, /^How would you/);
    assert.match(evaluation.interviewerResponse, /I appreciate/);
    assert.equal(evaluation.nextTurnType, "probe");
    assert.match(evaluation.nextQuestion.question, /Could you/);
    await assert.rejects(
      generateInterviewSession({
        companyName: "Example Corp",
        jobDescription: "Build and operate payment APIs.",
        language: "en",
      }),
      /AI interviewer tidak tersedia/
    );
  } finally {
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("interview questions and adaptive follow-ups use company and job-description context", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalGetGenerativeModel = GoogleGenerativeAI.prototype.getGenerativeModel;
  const prompts = [];
  process.env.GEMINI_API_KEY = "test-key";
  GoogleGenerativeAI.prototype.getGenerativeModel = function () {
    return {
      generateContent: async (prompt) => {
        prompts.push(prompt);
        const response = prompts.length === 1
          ? {
              questions: [{
                id: "q-1",
                question: "How would you design the payment API?",
                category: "technical",
                targetSkillOrTopic: "Payment APIs",
                context: "The role owns payment APIs.",
                hint: "Discuss reliability.",
                keyConceptsExpected: ["Idempotency"],
              }],
            }
          : {
              score: 75,
              starRubric: {
                situation: { present: true, note: "Clear context." },
                task: { present: true, note: "Responsibility is clear." },
                action: { present: true, note: "Action is described." },
                result: { present: true, note: "Outcome is described." },
              },
              technicalAccuracy: { score: 75, feedback: "Relevant trade-offs." },
              matchedKeywords: ["Idempotency"],
              missingKeywords: [],
              strengths: ["Explained a concrete design choice."],
              improvements: ["Quantify the impact."],
              idealAnswer: "A concise practice example.",
              interviewerResponse: "You mentioned idempotency for retries.",
              nextTurnType: prompts.length === 3 ? "new_topic" : "probe",
              nextQuestion: {
                question: prompts.length === 3
                  ? "Tell me about a different project where you balanced delivery speed and reliability."
                  : "How would you monitor duplicate payment attempts?",
                category: prompts.length === 3 ? "behavioral" : "technical",
                targetSkillOrTopic: prompts.length === 3
                  ? "Reliability trade-offs"
                  : "Payment API observability",
                context: "The candidate discussed idempotency for retries.",
                hint: "Ask how the solution is observed in production.",
                keyConceptsExpected: ["Metrics", "Duplicate requests"],
              },
            };
        return { response: { text: () => JSON.stringify(response) } };
      },
    };
  };

  try {
    const context = {
      companyName: "Example Corp",
      jobDescription: "Build and operate payment APIs using Node.js and PostgreSQL.",
      language: "en",
    };
    await generateInterviewSession({
      ...context,
      role: "Backend Engineer",
      questionCount: 1,
    });
    const turnWithMoreTime = await evaluateInterviewAnswer({
      ...context,
      question: "How would you design the payment API?",
      answer: "I would use idempotency keys to prevent duplicate payment requests.",
      role: "Backend Engineer",
      targetSkillOrTopic: "Payment APIs",
      conversationHistory: [{
        question: "How would you ensure payment reliability?",
        answer: "I would use retries and idempotency.",
      }],
      remainingTurns: 2,
    });
    const newTopicTurn = await evaluateInterviewAnswer({
      ...context,
      question: "How would you monitor duplicate payment attempts?",
      answer: "I would alert on duplicate transaction IDs.",
      role: "Backend Engineer",
      targetSkillOrTopic: "Payment API observability",
      conversationHistory: [{
        question: "How would you ensure payment reliability?",
        answer: "I would use retries and idempotency.",
      }],
      remainingTurns: 1,
      consecutiveProbeCount: 1,
    });
    const lastAllowedTurn = await evaluateInterviewAnswer({
      ...context,
      question: "How would you design the payment API?",
      answer: "Not sure.",
      role: "Backend Engineer",
      targetSkillOrTopic: "Payment APIs",
      remainingTurns: 0,
    });
    const probeLimitTurn = await evaluateInterviewAnswer({
      ...context,
      question: "How would you design the payment API?",
      answer: "I would add idempotency.",
      role: "Backend Engineer",
      targetSkillOrTopic: "Payment APIs",
      remainingTurns: 2,
      consecutiveProbeCount: 2,
    });

    assert.equal(prompts.length, 5);
    assert.equal(turnWithMoreTime.nextTurnType, "probe");
    assert.equal(turnWithMoreTime.nextQuestion.question, "How would you monitor duplicate payment attempts?");
    assert.equal(newTopicTurn.nextTurnType, "new_topic");
    assert.match(newTopicTurn.nextQuestion.question, /different project/);
    assert.equal(lastAllowedTurn.nextTurnType, "complete");
    assert.equal(lastAllowedTurn.nextQuestion, null);
    assert.equal(probeLimitTurn.nextTurnType, "complete");
    assert.equal(probeLimitTurn.nextQuestion, null);
    for (const prompt of prompts) {
      assert.match(prompt, /Example Corp/);
      assert.match(prompt, /Build and operate payment APIs/);
      assert.match(prompt, /Do not invent|Do not assert/);
    }
    assert.match(prompts[1], /nextTurnType/);
    assert.match(prompts[1], /idempotency/);
    assert.match(prompts[1], /Remaining interviewer turns after this answer: 2/);
    assert.match(prompts[3], /Not sure\./);
    assert.match(prompts[2], /How would you monitor duplicate payment attempts/);
  } finally {
    GoogleGenerativeAI.prototype.getGenerativeModel = originalGetGenerativeModel;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});
