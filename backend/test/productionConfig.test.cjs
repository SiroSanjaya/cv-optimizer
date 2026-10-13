const assert = require("node:assert/strict");
const test = require("node:test");
const { validateProductionConfiguration } = require("../dist/utils/productionConfig");

const configuredEnv = [
  "NODE_ENV",
  "JWT_SECRET",
  "DATABASE_URL",
  "REDIS_URL",
  "FRONTEND_URL",
  "AI_JOB_ENCRYPTION_KEY",
  "AI_MONTHLY_QUOTA",
  "TRUST_PROXY_HOPS",
];

function withProductionEnv(overrides, run) {
  const previous = Object.fromEntries(
    configuredEnv.map((key) => [key, process.env[key]])
  );
  Object.assign(process.env, {
    NODE_ENV: "production",
    JWT_SECRET: "a-secure-production-jwt-secret-with-at-least-32-characters",
    DATABASE_URL: "postgresql://user:password@db.example.com:5432/app",
    REDIS_URL: "rediss://:password@redis.example.com:6379",
    FRONTEND_URL: "https://cv.example.com",
    AI_JOB_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64"),
    AI_MONTHLY_QUOTA: "10",
    TRUST_PROXY_HOPS: "1",
    ...overrides,
  });

  try {
    run();
  } finally {
    for (const key of configuredEnv) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test("production config accepts complete secure service configuration", () => {
  withProductionEnv({}, () => {
    assert.doesNotThrow(() => validateProductionConfiguration());
  });
});

test("production config rejects missing Redis and insecure public frontend URLs", () => {
  withProductionEnv({ REDIS_URL: "" }, () => {
    assert.throws(() => validateProductionConfiguration(), /REDIS_URL is required/);
  });
  withProductionEnv({ FRONTEND_URL: "http://cv.example.com" }, () => {
    assert.throws(() => validateProductionConfiguration(), /must use HTTPS/);
  });
});

test("production config validates trusted proxy hop count", () => {
  withProductionEnv({ TRUST_PROXY_HOPS: "not-a-number" }, () => {
    assert.throws(() => validateProductionConfiguration(), /TRUST_PROXY_HOPS/);
  });
});
