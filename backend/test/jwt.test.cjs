const assert = require("node:assert/strict");
const test = require("node:test");
const { validateJwtConfiguration } = require("../dist/services/auth/jwt");

test("production JWT configuration rejects a missing or weak secret", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.JWT_SECRET;

  try {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;
    assert.throws(() => validateJwtConfiguration(), /at least 32 characters/);

    process.env.JWT_SECRET = "too-short";
    assert.throws(() => validateJwtConfiguration(), /at least 32 characters/);

    process.env.JWT_SECRET = "a-random-production-secret-with-more-than-32-characters";
    assert.doesNotThrow(() => validateJwtConfiguration());
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
});
