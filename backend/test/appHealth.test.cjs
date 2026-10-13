const assert = require("node:assert/strict");
const test = require("node:test");

process.env.NODE_ENV = "test";
const { createApp } = require("../dist/app");

test("health stays available beyond the rate limit and demo login is unmounted", async (t) => {
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
  for (let request = 0; request < 70; request += 1) {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
    assert.equal(response.status, 200);
  }

  const demoLoginResponse = await fetch(
    `http://127.0.0.1:${address.port}/api/auth/demo-login`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
  );
  assert.equal(demoLoginResponse.status, 404);
});
