const assert = require("node:assert/strict");
const test = require("node:test");

process.env.NODE_ENV = "test";
const { createApp } = require("../dist/app");

test("feedback routes reject invalid payloads before database writes", async (t) => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  );

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}/api/feedback`;
  const invalidFeedback = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ valueRating: 10 }),
  });
  assert.equal(invalidFeedback.status, 400);

  const invalidEvent = await fetch(`${baseUrl}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName: "arbitrary", sessionId: "invalid" }),
  });
  assert.equal(invalidEvent.status, 400);

  const invalidDeletion = await fetch(`${baseUrl}/not-a-session-id`, {
    method: "DELETE",
  });
  assert.equal(invalidDeletion.status, 400);
});
