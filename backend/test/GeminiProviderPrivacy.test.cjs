const assert = require("node:assert/strict");
const test = require("node:test");
const { GeminiProvider } = require("../dist/services/ai/GeminiProvider");

test("invalid AI output is not written to application logs", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalConsoleError = console.error;
  const sensitiveMarker = "PRIVATE_CV_DATA_SENTINEL";
  const logLines = [];

  process.env.GEMINI_API_KEY = "test-api-key";
  console.error = (line) => logLines.push(String(line));

  try {
    const provider = new GeminiProvider(process.env.GEMINI_API_KEY);
    provider.client.getGenerativeModel = () => ({
      generateContent: async () => ({
        response: {
          text: () => JSON.stringify({ personalInfo: [sensitiveMarker] }),
        },
      }),
    });

    await assert.rejects(provider.extractStructuredCv("private CV contents"));

    assert.equal(logLines.length, 1);
    assert.match(logLines[0], /schema_validation_failed/);
    assert.doesNotMatch(logLines.join("\n"), /PRIVATE_CV_DATA_SENTINEL|private CV contents/);
  } finally {
    console.error = originalConsoleError;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});
