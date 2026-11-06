const assert = require("node:assert/strict");
const test = require("node:test");

process.env.NODE_ENV = "test";
const { createApp } = require("../dist/app");
const { signToken } = require("../dist/services/auth/jwt");

test("admin dashboard API requires an authenticated allowlisted email", async (t) => {
  const previous = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "owner@example.com";
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(async () => {
    if (previous === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previous;
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const url = `http://127.0.0.1:${address.port}/api/admin/dashboard`;
  const unauthorized = await fetch(url);
  assert.equal(unauthorized.status, 401);

  const token = signToken({ userId: "user-1", email: "user@example.com" });
  const forbidden = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(forbidden.status, 403);
});
