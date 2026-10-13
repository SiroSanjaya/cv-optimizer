const assert = require("node:assert/strict");
const test = require("node:test");
const {
  calculateJobMatch,
  detectVisaSponsorship,
} = require("../dist/services/jobs/jobAggregator");
const {
  analyzeCustomJobText,
  searchTalentByRequirements,
  bulkScreenCvs,
} = require("../dist/services/jobs/talentSearch.service");

test("job listing without candidate CV skills has no personalized score", () => {
  const job = {
    id: "listing-1",
    title: "Frontend Engineer",
    company: "Example Co",
    location: "Remote",
    source: "Remotive",
    url: "https://example.com/jobs/1",
    description: "Build frontend applications.",
    skills: ["React", "TypeScript"],
  };

  const result = calculateJobMatch([], job);

  assert.equal(result.matchScore, undefined);
  assert.deepEqual(result.matchingSkills, []);
  assert.deepEqual(result.missingSkills, []);
  assert.equal("hireProbability" in result, false);
});

test("visa sponsorship status requires explicit evidence from the listing", () => {
  assert.equal(
    detectVisaSponsorship("We offer visa sponsorship for qualified candidates."),
    "available"
  );
  assert.equal(
    detectVisaSponsorship("We do not provide visa sponsorship for this role."),
    "unavailable"
  );
  assert.equal(
    detectVisaSponsorship("Candidates must be eligible for a work visa."),
    "not_mentioned"
  );
  assert.equal(detectVisaSponsorship(""), "not_mentioned");
});

test("custom job analysis does not invent a candidate skill profile", async () => {
  const result = await analyzeCustomJobText({
    jobText: "Frontend Engineer\nExample Co\nWe need React, TypeScript, and Node.js.",
  });

  assert.equal(result.matchScore, null);
  assert.deepEqual(result.matchingSkills, []);
  assert.deepEqual(result.missingSkills, []);
  assert.deepEqual(result.skills, ["React", "TypeScript", "Node.js"]);
});

test("custom job skill score only compares provided CV skills", async () => {
  const result = await analyzeCustomJobText({
    jobText: "Frontend Engineer\nExample Co\nWe need React and TypeScript.",
    candidateSkills: ["React"],
  });

  assert.equal(result.matchScore, 50);
  assert.deepEqual(result.matchingSkills, ["React"]);
  assert.deepEqual(result.missingSkills, ["TypeScript"]);
});

test("talent sourcing does not return fabricated candidate profiles", async () => {
  const result = await searchTalentByRequirements("Frontend Engineer with React and TypeScript");

  assert.deepEqual(result.candidates, []);
  assert.equal(result.extractedRequirements.role, "Frontend Engineer with React and TypeScript");
});

test("bulk screening reports unavailable AI instead of returning invented scores", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    await assert.rejects(
      bulkScreenCvs("Frontend Engineer", [{ id: "cv-1", name: "Candidate", content: "React developer" }]),
      /AI CV screener belum dikonfigurasi/
    );
  } finally {
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});
