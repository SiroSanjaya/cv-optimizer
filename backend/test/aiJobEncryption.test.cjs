const assert = require("node:assert/strict");
const test = require("node:test");
const {
  decryptJobValue,
  encryptJobValue,
  validateJobEncryptionKey,
} = require("../dist/services/ai/jobEncryption");

test("AI job payloads round-trip with an AES-256-GCM key", () => {
  const originalKey = process.env.AI_JOB_ENCRYPTION_KEY;
  process.env.AI_JOB_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

  try {
    const value = { cv: "private candidate data", nested: { score: 84 } };
    const encrypted = encryptJobValue(value);

    assert.notEqual(encrypted.ciphertext, JSON.stringify(value));
    assert.deepEqual(decryptJobValue(encrypted), value);
  } finally {
    if (originalKey === undefined) delete process.env.AI_JOB_ENCRYPTION_KEY;
    else process.env.AI_JOB_ENCRYPTION_KEY = originalKey;
  }
});

test("job encryption rejects missing and malformed keys", () => {
  const originalKey = process.env.AI_JOB_ENCRYPTION_KEY;

  try {
    delete process.env.AI_JOB_ENCRYPTION_KEY;
    assert.throws(() => validateJobEncryptionKey(), /is required/);

    process.env.AI_JOB_ENCRYPTION_KEY = Buffer.alloc(16).toString("base64");
    assert.throws(() => validateJobEncryptionKey(), /32-byte key/);
  } finally {
    if (originalKey === undefined) delete process.env.AI_JOB_ENCRYPTION_KEY;
    else process.env.AI_JOB_ENCRYPTION_KEY = originalKey;
  }
});

test("job encryption detects modified ciphertext", () => {
  const originalKey = process.env.AI_JOB_ENCRYPTION_KEY;
  process.env.AI_JOB_ENCRYPTION_KEY = Buffer.alloc(32, 11).toString("base64");

  try {
    const encrypted = encryptJobValue({ payload: "sensitive" });
    const changedCiphertext = Buffer.from(encrypted.ciphertext, "base64");
    changedCiphertext[0] ^= 1;
    assert.throws(() =>
      decryptJobValue({
        ...encrypted,
        ciphertext: changedCiphertext.toString("base64"),
      })
    );
  } finally {
    if (originalKey === undefined) delete process.env.AI_JOB_ENCRYPTION_KEY;
    else process.env.AI_JOB_ENCRYPTION_KEY = originalKey;
  }
});
