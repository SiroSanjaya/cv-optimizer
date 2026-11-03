const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildCareerDevelopmentAnalysis,
} = require("../dist/services/careerDevelopment.service");
const {
  careerDevelopmentProgressSchema,
  careerDevelopmentTargetSchema,
} = require("../dist/schemas/careerDevelopment.schemas");
const { aiJobRequestSchema } = require("../dist/schemas/aiJob.schemas");

test("skill demand counts each verified listing once and identifies CV skill gaps", () => {
  const analysis = buildCareerDevelopmentAnalysis(
    "Frontend Developer",
    ["React", "TypeScript"],
    [
      { skills: ["React", "TypeScript", "Node.js", "React"] },
      { skills: ["React", "Node.js", "AWS"] },
      { skills: ["TypeScript", "AWS"] },
    ]
  );

  assert.equal(analysis.jobCount, 3);
  assert.deepEqual(analysis.skillDemand, [
    { skill: "AWS", count: 2 },
    { skill: "Node.js", count: 2 },
    { skill: "React", count: 2 },
    { skill: "TypeScript", count: 2 },
  ]);
  assert.deepEqual(analysis.skillGaps, ["AWS", "Node.js"]);
  assert.equal(analysis.certifications.every((item) =>
    item.officialUrl.startsWith("https://")
  ), true);
});

test("skill analysis is empty when there is no verified listing evidence", () => {
  const analysis = buildCareerDevelopmentAnalysis("Data Analyst", ["SQL"], []);

  assert.equal(analysis.jobCount, 0);
  assert.deepEqual(analysis.skillDemand, []);
  assert.deepEqual(analysis.skillGaps, []);
  assert.deepEqual(analysis.certifications, []);
});

test("career development request schemas validate target roles and milestone status", () => {
  assert.equal(careerDevelopmentTargetSchema.safeParse({ targetRole: "Data Analyst" }).success, true);
  assert.equal(careerDevelopmentTargetSchema.safeParse({ targetRole: " " }).success, false);
  assert.equal(careerDevelopmentProgressSchema.safeParse({
    milestoneId: "learn-123",
    status: "completed",
  }).success, true);
  assert.equal(careerDevelopmentProgressSchema.safeParse({
    milestoneId: "unknown",
    status: "done",
  }).success, false);
});

test("career development plans are an accepted quota-backed AI job task", () => {
  const parsed = aiJobRequestSchema.safeParse({
    task: "career-development.plan",
    input: {
      targetRole: "Frontend Developer",
      jobCount: 2,
      skillDemand: [{ skill: "React", count: 2 }],
      skillGaps: ["React"],
      currentSkills: ["JavaScript"],
      experienceSummary: [],
      existingProjects: [],
      certificationCatalog: [],
    },
  });

  assert.equal(parsed.success, true);
});
