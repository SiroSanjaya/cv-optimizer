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
