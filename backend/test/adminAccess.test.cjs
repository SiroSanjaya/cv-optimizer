const assert = require("node:assert/strict");
const test = require("node:test");
const { requireAdmin } = require("../dist/middleware/admin.middleware");

function invoke(email, configuredEmails) {
  const previous = process.env.ADMIN_EMAILS;
  if (configuredEmails === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = configuredEmails;

  let forwardedError;
  const req = { userPayload: email ? { email } : undefined };
  requireAdmin(req, {}, (error) => {
    forwardedError = error;
  });

  if (previous === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = previous;
  return forwardedError;
}

test("admin allowlist matches normalized email addresses", () => {
  assert.equal(invoke("Owner@Example.com", " owner@example.com , second@example.com "), undefined);
});

test("admin middleware denies unlisted users and empty allowlists", () => {
  assert.equal(invoke("user@example.com", "owner@example.com").code, "FORBIDDEN");
  assert.equal(invoke("owner@example.com", undefined).code, "FORBIDDEN");
  assert.equal(invoke(undefined, "owner@example.com").code, "FORBIDDEN");
});
