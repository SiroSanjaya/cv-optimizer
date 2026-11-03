const assert = require("node:assert/strict");
const test = require("node:test");
const { betaFeedbackSchema, productEventSchema } = require("../dist/schemas/feedback.schemas");

const sessionId = "d9428888-122b-4a2d-91bd-3f9f0e2d4d7a";

test("beta feedback accepts only bounded research answers", () => {
  const result = betaFeedbackSchema.safeParse({
    sessionId,
    feedbackDetail: "Job search filters reset when I open a listing; I expect them to stay selected.",
    qualityReviewConsent: true,
    applicationFrequency: "one_to_two_weekly",
    valueRating: 4,
    mainValue: "cv_tailoring",
    reuseIntent: "yes",
    willingnessToPay: "25k_to_50k",
    mainBlocker: "job_sources",
  });
  assert.equal(result.success, true);
});

test("beta feedback rejects personal free text and invalid ratings", () => {
  const base = {
    sessionId,
    feedbackDetail: "Job search filters reset when I open a listing; I expect them to stay selected.",
    qualityReviewConsent: true,
    applicationFrequency: "one_to_two_weekly",
    valueRating: 4,
    mainValue: "cv_tailoring",
    reuseIntent: "yes",
    willingnessToPay: "25k_to_50k",
    mainBlocker: "job_sources",
  };
  assert.equal(betaFeedbackSchema.safeParse({ ...base, valueRating: 6 }).success, false);
  assert.equal(betaFeedbackSchema.safeParse({ ...base, cv: "private content" }).success, false);
  assert.equal(betaFeedbackSchema.safeParse({ ...base, feedbackDetail: "improve CV" }).success, false);
  assert.equal(betaFeedbackSchema.safeParse({ ...base, qualityReviewConsent: false }).success, false);
});

test("product events are limited to the explicit allowlist", () => {
  assert.equal(
    productEventSchema.safeParse({ sessionId, eventName: "optimization_completed" }).success,
    true
  );
  assert.equal(
    productEventSchema.safeParse({ sessionId, eventName: "unknown_event" }).success,
    false
  );
});
