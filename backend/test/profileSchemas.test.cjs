const assert = require("node:assert/strict");
const test = require("node:test");
const { ApplicationStatus } = require("@prisma/client");
const {
  careerProfileInputSchema,
  savedJobInputSchema,
} = require("../dist/schemas/profile.schemas");

const careerProfile = {
  structuredCv: {
    personalInfo: {
      name: "Ayu",
      email: "ayu@example.com",
      phone: "",
      location: "Jakarta",
      linkedin: "",
      github: "",
    },
    summary: "Customer support specialist",
    skills: ["Customer Service"],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
  },
  languages: ["Bahasa Indonesia — Native"],
  targetRoles: ["Customer Service"],
  preferredIndustries: ["Teknologi"],
  preferredLocations: ["Jakarta"],
  employmentPreferences: ["hybrid"],
  expectedSalaryMin: 5_000_000,
  expectedSalaryMax: 10_000_000,
  salaryCurrency: "IDR",
};

test("career profile accepts structured CV data and Indonesian job preferences", () => {
  const parsed = careerProfileInputSchema.safeParse(careerProfile);

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.deepEqual(parsed.data.structuredCv.skills, ["Customer Service"]);
    assert.deepEqual(parsed.data.preferredLocations, ["Jakarta"]);
  }
});

test("career profile rejects an expected salary range with minimum above maximum", () => {
  const parsed = careerProfileInputSchema.safeParse({
    ...careerProfile,
    expectedSalaryMin: 11_000_000,
  });

  assert.equal(parsed.success, false);
});

test("saved job accepts a source listing and rejects unsafe URL protocols", () => {
  const listing = {
    externalId: "kalibrr-123",
    source: "Kalibrr",
    title: "Customer Support",
    company: "Example Co",
    location: "Jakarta",
    url: "https://jobs.example.com/123",
    description: "Help customers resolve product questions.",
    skills: ["Customer Service"],
    matchScore: 80,
  };

  assert.equal(savedJobInputSchema.safeParse(listing).success, true);
  assert.equal(
    savedJobInputSchema.safeParse({ ...listing, url: "javascript:alert(1)" }).success,
    false
  );
  assert.equal(
    savedJobInputSchema.safeParse({ ...listing, url: "http://jobs.example.com/123" }).success,
    false
  );
});

test("saved job preserves explicit deadline and rejects an invalid salary range", () => {
  const listing = {
    externalId: "kalibrr-deadline",
    source: "Kalibrr",
    title: "Customer Support",
    company: "Example Co",
    location: "Jakarta",
    url: "https://jobs.example.com/123",
    description: "Help customers resolve product questions.",
    skills: ["Customer Service"],
    salaryMin: 5_000_000,
    salaryMax: 10_000_000,
    salaryCurrency: "IDR",
    salaryPeriod: "monthly",
    applicationDeadline: "2026-12-01T00:00:00.000Z",
  };

  assert.equal(savedJobInputSchema.safeParse(listing).success, true);
  assert.equal(
    savedJobInputSchema.safeParse({
      ...listing,
      salaryMin: 12_000_000,
      salaryMax: 8_000_000,
    }).success,
    false
  );
});

test("application stages cover the full recruitment journey", () => {
  const requiredStages = [
    "saved",
    "preparing_documents",
    "applied",
    "hr_screening",
    "assessment_test",
    "hr_interview",
    "technical_interview",
    "technical_test",
    "user_interview",
    "final_interview",
    "offer",
    "hired",
    "rejected",
    "withdrawn",
  ];

  for (const stage of requiredStages) {
    assert.ok(Object.values(ApplicationStatus).includes(stage), `${stage} is available`);
  }
});
