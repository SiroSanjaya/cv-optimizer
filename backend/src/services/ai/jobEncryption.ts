import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

interface EncryptedValue {
  iv: string;
  authTag: string;
  ciphertext: string;
}

function getEncryptionKey(): Buffer {
  const encodedKey = process.env.AI_JOB_ENCRYPTION_KEY;
  if (!encodedKey) {
    throw new Error("AI_JOB_ENCRYPTION_KEY is required to process AI jobs.");
  }

  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32 || key.toString("base64") !== encodedKey) {
    throw new Error("AI_JOB_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return key;
}

export function encryptJobValue(value: unknown): EncryptedValue {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);

  return {
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptJobValue<T>(encrypted: EncryptedValue): T {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(encrypted.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext) as T;
}

export function validateJobEncryptionKey(): void {
  getEncryptionKey();
}
