const assert = require("node:assert/strict");
const test = require("node:test");
const {
  validatePublicJobUrl,
} = require("../dist/services/jobs/jobImporter.service");

test("job importer rejects non-HTTPS URLs", async () => {
  await assert.rejects(
    validatePublicJobUrl("http://example.com/jobs/1"),
    /HTTPS/
  );
});

test("job importer rejects private and loopback IP targets", async () => {
  await assert.rejects(
    validatePublicJobUrl("https://127.0.0.1/admin"),
    /privat/
  );
  await assert.rejects(
    validatePublicJobUrl("https://169.254.169.254/latest/meta-data"),
    /privat/
  );
  await assert.rejects(
    validatePublicJobUrl("https://10.0.0.1/internal"),
    /privat/
  );
});

test("job importer rejects URL credentials and special ports", async () => {
  await assert.rejects(
    validatePublicJobUrl("https://user:pass@example.com/jobs"),
    /credential/
  );
  await assert.rejects(
    validatePublicJobUrl("https://example.com:8443/jobs"),
    /port/
  );
});
