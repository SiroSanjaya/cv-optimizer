const assert = require("node:assert/strict");
const test = require("node:test");
const { prisma } = require("../dist/utils/prisma");
const { getOutcomeMetrics } = require("../dist/services/jobs/outcomeAnalytics.service");

test("saved jobs do not count as submitted applications in outcome metrics", async () => {
  const originalFindMany = prisma.application.findMany;
  prisma.application.findMany = async () => [
    {
      status: "saved",
      appliedAt: new Date(),
      position: "Product Designer",
      matchScore: 80,
      analysis: null,
      cvVersionId: null,
      cvVersion: null,
    },
  ];

  try {
    const metrics = await getOutcomeMetrics("user-1");
    assert.equal(metrics.total, 0);
    assert.equal(metrics.byStatus.saved, 1);
    assert.match(metrics.insights[0], /tersimpan/);
  } finally {
    prisma.application.findMany = originalFindMany;
  }
});

test("preparing documents are not submitted; new recruitment stages count in interview outcomes", async () => {
  const originalFindMany = prisma.application.findMany;
  const appliedAt = new Date();
  prisma.application.findMany = async () => [
    {
      status: "preparing_documents",
      appliedAt,
      position: "Support Specialist",
      matchScore: null,
      analysis: null,
      cvVersionId: null,
      cvVersion: null,
    },
    {
      status: "hr_screening",
      appliedAt,
      position: "Support Specialist",
      matchScore: 70,
      analysis: null,
      cvVersionId: null,
      cvVersion: null,
    },
    {
      status: "hired",
      appliedAt,
      position: "Support Specialist",
      matchScore: 80,
      analysis: null,
      cvVersionId: null,
      cvVersion: null,
    },
  ];

  try {
    const metrics = await getOutcomeMetrics("user-1");
    assert.equal(metrics.total, 2);
    assert.equal(metrics.interviewRate, 100);
    assert.equal(metrics.offerRate, 50);
  } finally {
    prisma.application.findMany = originalFindMany;
  }
});
