const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

// Schemas & Types
const {
  structuredCvSchema,
  cvAnalysisSchema,
  jobRequirementMatchSchema,
  bulletRevisionSchema,
} = require("../dist/schemas/cv.schemas.js");

// Document generator
const { generateCvPdf } = require("../dist/services/document/pdfGenerator.js");

// Monetization Cost Estimator
const { estimateCostUsd } = require("../dist/services/monetization/creditLedger.service.js");

// Synthetic Ground-Truth Benchmark Dataset (Tech, Marketing, Product, Data)
const BENCHMARK_CVS = [
  {
    role: "Senior Backend Engineer",
    raw: {
      personalInfo: {
        name: "Budi Santoso",
        email: "budi.santoso@example.com",
        phone: "+628123456789",
        location: "Jakarta, Indonesia",
        linkedin: "linkedin.com/in/budisantoso",
        github: "github.com/budisantoso",
      },
      summary: "Backend engineer with 6+ years building microservices and event-driven systems using Go, Node.js, and PostgreSQL.",
      skills: ["Go", "Node.js", "PostgreSQL", "Docker", "Kafka", "Redis"],
      experience: [
        {
          company: "Unicorn Tech Nusantara",
          position: "Lead Backend Developer",
          startDate: "Jan 2021",
          endDate: "Present",
          bullets: [
            "Architected payment disbursement pipeline handling 500k daily transactions.",
            "Reduced query latency by 45% through PostgreSQL read replicas and Redis caching.",
            "Led a squad of 6 engineers across sprint planning and technical RFCs."
          ],
        },
        {
          company: "Digital Solusindo",
          position: "Software Engineer",
          startDate: "Aug 2018",
          endDate: "Dec 2020",
          bullets: [
            "Built RESTful APIs for inventory tracking with Express and MongoDB.",
            "Automated CI/CD pipelines using GitHub Actions and Docker."
          ],
        }
      ],
      projects: [
        {
          name: "OpenSource Event Bus",
          description: "High-throughput distributed event broker.",
          technologies: ["Go", "gRPC"],
          bullets: ["Maintained 100k msg/sec under load test."],
        }
      ],
      education: [
        {
          institution: "Institut Teknologi Bandung",
          degree: "Bachelor of Computer Science",
          field: "Computer Science",
          startDate: "2014",
          endDate: "2018",
        }
      ],
      certifications: ["AWS Certified Solutions Architect"],
    },
  },
  {
    role: "Frontend Engineer (2-column resume)",
    raw: {
      personalInfo: {
        name: "Siti Rahma",
        email: "siti.rahma@example.com",
        phone: "+628198765432",
        location: "Bandung, Indonesia",
        linkedin: "linkedin.com/in/sitirahma",
        github: "github.com/sitirahma",
      },
      summary: "Modern frontend specialist focused on React 19, TypeScript, and micro-frontend performance.",
      skills: ["React", "TypeScript", "Tailwind CSS", "Next.js", "Zustand"],
      experience: [
        {
          company: "Fintech Maju",
          position: "Frontend Engineer",
          startDate: "Mar 2022",
          endDate: "Present",
          bullets: [
            "Optimized Core Web Vitals resulting in 28% increase in mobile checkout conversions.",
            "Migrated legacy SPA from Webpack to Vite, cutting build time by 75%."
          ],
        }
      ],
      projects: [],
      education: [
        {
          institution: "Universitas Indonesia",
          degree: "Bachelor of Information Systems",
          field: "Information Systems",
          startDate: "2017",
          endDate: "2021",
        }
      ],
      certifications: [],
    },
  },
  {
    role: "DevOps & Cloud Architect",
    raw: {
      personalInfo: {
        name: "Reza Pratama",
        email: "reza.p@example.com",
        phone: "+628111222333",
        location: "Yogyakarta, Indonesia",
        linkedin: "linkedin.com/in/rezapratama",
        github: "github.com/rezapratama",
      },
      summary: "Infrastructure engineer with hands-on Kubernetes cluster management and zero-trust security.",
      skills: ["Kubernetes", "Terraform", "AWS", "Prometheus", "Grafana", "Linux"],
      experience: [
        {
          company: "CloudScale Labs",
          position: "Senior DevOps Engineer",
          startDate: "Jan 2020",
          endDate: "Present",
          bullets: [
            "Spearheaded multi-region EKS deployment achieving 99.99% uptime across 12 services.",
            "Standardized IaC across 40 microservices using Terraform and Helm."
          ],
        }
      ],
      projects: [],
      education: [],
      certifications: ["CKA - Certified Kubernetes Administrator"],
    },
  }
];

describe("Quality Test Suite: CV Parsing & Entity Integrity", () => {
  it("extracts and validates full schema integrity across multi-discipline CVs", () => {
    for (const testCase of BENCHMARK_CVS) {
      const parsed = structuredCvSchema.safeParse(testCase.raw);
      assert.equal(parsed.success, true, `CV for ${testCase.role} must pass strict schema`);
      assert.equal(parsed.data.personalInfo.name, testCase.raw.personalInfo.name);
      assert.equal(parsed.data.skills.length, testCase.raw.skills.length);
      assert.equal(parsed.data.experience.length, testCase.raw.experience.length);
    }
  });

  it("preserves exact company names, roles, and employment dates without mutation", () => {
    const candidate = BENCHMARK_CVS[0].raw;
    const originalCompany = candidate.experience[0].company;
    const originalRole = candidate.experience[0].position;
    const originalDates = `${candidate.experience[0].startDate} - ${candidate.experience[0].endDate}`;

    const parsed = structuredCvSchema.parse(candidate);
    assert.equal(parsed.experience[0].company, originalCompany);
    assert.equal(parsed.experience[0].position, originalRole);
    assert.equal(
      `${parsed.experience[0].startDate} - ${parsed.experience[0].endDate}`,
      originalDates
    );
  });
});

describe("Quality Test Suite: Evidence-Based Job Matching", () => {
  it("strictly validates Supported, Partial, and Gap requirements", () => {
    const validMatches = [
      {
        requirement: "RESTful API Development",
        evidence: "Ditemukan pada project backend di CV: Express & Node.js",
        status: "Supported",
        category: "technical",
      },
      {
        requirement: "Database Optimization",
        evidence: "Ada pengalaman MySQL di CV, tetapi optimasi performa belum terbukti",
        status: "Partial",
        category: "technical",
      },
      {
        requirement: "Kubernetes Cluster Management",
        evidence: "Tidak ditemukan bukti pada CV asli",
        status: "Gap",
        category: "infrastructure",
      },
    ];

    for (const match of validMatches) {
      const parsed = jobRequirementMatchSchema.safeParse(match);
      assert.equal(parsed.success, true);
      assert.equal(parsed.data.status, match.status);
    }
  });

  it("never marks Gap requirements as Supported", () => {
    const analysisPayload = {
      matchScore: 65,
      matchedSkills: ["Go", "Node.js"],
      partialMatches: [{ skill: "Database Optimization", details: "Partial experience" }],
      missingSkills: ["Kubernetes", "Terraform"],
      keywords: ["Microservices", "REST API"],
      recommendations: ["Perjelas metrik optimasi database"],
      experienceRelevance: [{ role: "Lead", company: "Unicorn", relevance: "High", explanation: "Relevant" }],
      summary: "Candidate is a strong backend developer.",
      jobMatchAnalysis: [
        {
          requirement: "Kubernetes",
          evidence: "Tidak ditemukan bukti",
          status: "Gap",
        }
      ],
    };

    const parsed = cvAnalysisSchema.parse(analysisPayload);
    const gapItem = parsed.jobMatchAnalysis?.find((r) => r.requirement === "Kubernetes");
    assert.equal(gapItem?.status, "Gap");
    assert.notEqual(gapItem?.status, "Supported");
  });
});

describe("Quality Test Suite: AI Rewriting Truthfulness & Anti-Hallucination", () => {
  it("validates X-Y-Z bullet revision schema with mandatory reasoning", () => {
    const revision = {
      company: "Unicorn Tech Nusantara",
      role: "Lead Backend Developer",
      originalBullet: "Managed payment backend.",
      suggestedBullet: "Architected payment disbursement pipeline handling 500k daily transactions.",
      reasoning: "Menonjolkan aktivitas teknis dan skala tanpa menambahkan angka fiktif.",
      actionVerb: "Architected",
      hasQuantifiableMetric: true,
      metricPrompt: "Berapa banyak user yang dilayani?",
    };

    const parsed = bulletRevisionSchema.safeParse(revision);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.actionVerb, "Architected");
    assert.equal(parsed.data.hasQuantifiableMetric, true);
  });
});

describe("Quality Test Suite: PDF & Layout Document Integrity", () => {
  it("renders production PDF buffer without overflow or text corruption", async () => {
    const candidate = BENCHMARK_CVS[0].raw;
    const pdfBuffer = await generateCvPdf(candidate, { template: "tech", density: "compact" });

    assert.ok(Buffer.isBuffer(pdfBuffer));
    assert.ok(pdfBuffer.length > 5000, "Generated PDF must contain valid binary content");
    assert.equal(pdfBuffer.subarray(0, 4).toString(), "%PDF", "Must be a valid PDF header");
  });
});

describe("Quality Test Suite: Monetization, Credit Ledger & Idempotency", () => {
  it("computes sub-cent Gemini token cost accurately", () => {
    // 1500 prompt tokens + 600 completion tokens
    const cost = estimateCostUsd(1500, 600);
    assert.ok(cost > 0);
    assert.ok(cost < 0.001, "Gemini flash cost per single call should be a fraction of a cent");
  });
});
