const assert = require("node:assert/strict");
const test = require("node:test");
const {
  calculateJobMatch,
  detectVisaSponsorship,
  extractSkillsFromText,
  filterJobListings,
  formatPostedAt,
  inferExperienceLevel,
  isVerifiedJobListing,
  parseSalaryDetails,
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

test("job skill extraction recognizes non-technical professional skills", () => {
  const skills = extractSkillsFromText(
    "Manage payroll and monthly accounting reports using Excel. Provide customer service."
  );

  assert.deepEqual(skills, ["Excel", "Customer Service", "Accounting", "Payroll"]);
});

test("professional job skills can be matched against a candidate CV", () => {
  const job = {
    id: "listing-accounting",
    title: "Accounting Specialist",
    company: "Example Co",
    location: "Jakarta",
    source: "Kalibrr",
    url: "https://example.com/jobs/accounting",
    description: "Manage monthly accounting reports and payroll using Excel.",
    skills: extractSkillsFromText(
      "Manage monthly accounting reports and payroll using Excel."
    ),
  };

  const result = calculateJobMatch(["Accounting", "Excel"], job);

  assert.equal(result.matchScore, 67);
  assert.deepEqual(result.matchingSkills, ["Excel", "Accounting"]);
  assert.deepEqual(result.missingSkills, ["Payroll"]);
});

test("profile match explains role preferences and recommends from the recorded evidence", () => {
  const job = {
    id: "listing-analyst",
    title: "Product Analyst",
    company: "Example Co",
    location: "Jakarta",
    source: "Kalibrr",
    url: "https://jobs.example.com/analyst",
    description: "Analyze product performance with SQL and Excel.",
    skills: ["SQL", "Excel"],
    industry: "Finance",
    type: "Hybrid, full-time",
  };

  const result = calculateJobMatch(
    ["SQL", "Excel"],
    job,
    {
      targetRoles: ["Product Analyst"],
      preferredIndustries: ["Finance"],
      preferredLocations: ["Jakarta"],
      employmentPreferences: ["hybrid"],
    }
  );

  assert.equal(result.matchScore, 100);
  assert.equal(result.applyRecommendation, "apply");
  assert.equal(result.matchReasons.length, 5);
  assert.match(result.recommendationReason, /persyaratan lengkap/);
});

test("job filters compare verified salary metadata in the selected currency and period", () => {
  const job = {
    id: "listing-filter",
    title: "Senior Data Analyst",
    company: "Example Co",
    location: "Jakarta",
    salary: "Rp 8.000.000 - Rp 12.000.000 /bln",
    salaryMin: 8_000_000,
    salaryMax: 12_000_000,
    salaryCurrency: "IDR",
    salaryPeriod: "monthly",
    type: "Full-time",
    industry: "Finance",
    experienceLevel: "senior",
    source: "Kalibrr",
    url: "https://jobs.example.com/data",
    description: "Build reports with SQL and Excel.",
    skills: ["SQL", "Excel"],
  };

  assert.deepEqual(
    filterJobListings([job], {
      keyword: "analyst",
      company: "example",
      industry: "finance",
      locationQuery: "jakarta",
      experienceLevel: "senior",
      employmentType: "full-time",
      salaryMin: 10_000_000,
      salaryMax: 13_000_000,
      salaryCurrency: "IDR",
      salaryPeriod: "monthly",
    }),
    [job]
  );
  assert.deepEqual(
    filterJobListings([job], {
      salaryMin: 1_000,
      salaryCurrency: "USD",
      salaryPeriod: "monthly",
    }),
    []
  );
});

test("experience filters use explicit level indicators and leave ambiguous listings unclassified", () => {
  assert.equal(inferExperienceLevel("Senior Product Designer"), "senior");
  assert.equal(inferExperienceLevel("Fresh graduate - entry level"), "entry");
  assert.equal(inferExperienceLevel("Product Specialist"), undefined);
});

test("salary metadata is parsed only with an explicit currency and period", () => {
  assert.deepEqual(parseSalaryDetails("$50,000 - $60,000 /year"), {
    salaryMin: 50_000,
    salaryMax: 60_000,
    salaryCurrency: "USD",
    salaryPeriod: "annual",
  });
  assert.deepEqual(parseSalaryDetails("Rp 5.000.000 - 7.000.000 /bln"), {
    salaryMin: 5_000_000,
    salaryMax: 7_000_000,
    salaryCurrency: "IDR",
    salaryPeriod: "monthly",
  });
  assert.deepEqual(parseSalaryDetails("Competitive"), {});
});

test("only complete HTTPS listings with a named employer pass source validation", () => {
  const listing = {
    id: "listing-verified",
    title: "Support Specialist",
    company: "Example Co",
    location: "Jakarta",
    source: "Kalibrr",
    url: "https://jobs.example.com/123",
    description: "Resolve customer support requests.",
    skills: ["Customer Service"],
  };

  assert.equal(isVerifiedJobListing(listing), true);
  assert.equal(isVerifiedJobListing({ ...listing, url: "http://jobs.example.com/123" }), false);
  assert.equal(isVerifiedJobListing({ ...listing, company: "Perusahaan Tidak Diketahui" }), false);
  assert.equal(isVerifiedJobListing({ ...listing, description: "" }), false);
  assert.equal(isVerifiedJobListing({ ...listing, source: "Curated" }), false);
});

test("skill matching does not award points for partial-word overlaps", () => {
  const job = {
    id: "listing-excel",
    title: "Support Specialist",
    company: "Example Co",
    location: "Jakarta",
    source: "Kalibrr",
    url: "https://example.com/jobs/support",
    description: "Provide excellent customer support.",
    skills: ["Excel", "Customer Service"],
  };

  const result = calculateJobMatch(["Excellent communication", "Customer Service"], job);

  assert.equal(result.matchScore, 50);
  assert.deepEqual(result.matchingSkills, ["Customer Service"]);
  assert.deepEqual(result.missingSkills, ["Excel"]);
});

test("posting dates expose a stable timestamp and handle invalid or far-future values", () => {
  const now = new Date("2026-11-02T10:00:00.000Z");

  assert.deepEqual(formatPostedAt("2026-11-01T10:00:00.000Z", now), {
    postedAt: "Kemarin",
    postedAtDate: "2026-11-01T10:00:00.000Z",
  });
  assert.deepEqual(formatPostedAt("not-a-date", now), {});
  assert.deepEqual(formatPostedAt("2026-11-05T10:00:00.000Z", now), {});
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
