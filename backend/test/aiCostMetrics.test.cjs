const assert = require("node:assert/strict");
const test = require("node:test");
const {
  estimateCostUsd,
  getAiCostRates,
} = require("../dist/services/monetization/creditLedger.service");
const { normalizeDashboardPeriod } = require("../dist/services/adminDashboard.service");

const rateVariables = [
  "AI_COST_INPUT_USD_PER_MILLION",
  "AI_COST_OUTPUT_USD_PER_MILLION",
];

function withRates(values, run) {
  const previous = Object.fromEntries(rateVariables.map((key) => [key, process.env[key]]));
  for (const key of rateVariables) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  try {
    run();
  } finally {
    for (const key of rateVariables) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test("cost estimates remain unpriced until both provider token rates are configured", () => {
  withRates({}, () => {
    assert.equal(getAiCostRates(), null);
    assert.equal(estimateCostUsd(1_000_000, 1_000_000), 0);
  });
  withRates({
    AI_COST_INPUT_USD_PER_MILLION: "0.1",
    AI_COST_OUTPUT_USD_PER_MILLION: "0.4",
  }, () => {
    assert.deepEqual(getAiCostRates(), {
      inputUsdPerMillion: 0.1,
      outputUsdPerMillion: 0.4,
    });
    assert.equal(estimateCostUsd(1_000_000, 1_000_000), 0.5);
  });
});

test("cost rates reject partial and invalid configuration", () => {
  withRates({ AI_COST_INPUT_USD_PER_MILLION: "0.1" }, () => {
    assert.throws(() => getAiCostRates(), /configured together/);
  });
  withRates({
    AI_COST_INPUT_USD_PER_MILLION: "-1",
    AI_COST_OUTPUT_USD_PER_MILLION: "0.4",
  }, () => {
    assert.throws(() => getAiCostRates(), /non-negative numbers/);
  });
});

test("admin dashboard periods are bounded to 1 through 90 days", () => {
  assert.equal(normalizeDashboardPeriod(0), 1);
  assert.equal(normalizeDashboardPeriod(30), 30);
  assert.equal(normalizeDashboardPeriod(365), 90);
});
