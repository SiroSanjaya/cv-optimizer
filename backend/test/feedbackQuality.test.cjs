const assert = require("node:assert/strict");
const test = require("node:test");
const { assessFeedbackQuality } = require("../dist/services/feedbackQuality.service");

test("feedback quality assessment accepts a valid AI verdict", async () => {
  const provider = {
    generateJsonResponse: async () => JSON.stringify({
      eligible: true,
      tip: "Terima kasih, masukanmu menjelaskan masalah dan perubahan yang diharapkan.",
    }),
  };

  const result = await assessFeedbackQuality(
    "Saat filter lowongan berubah halaman, pilihan lokasi hilang. Saya berharap filter tetap tersimpan.",
    provider
  );
  assert.equal(result.eligible, true);
  assert.match(result.tip, /masukanmu/);
});

test("feedback quality assessment returns a revision tip for generic feedback", async () => {
  const provider = {
    generateJsonResponse: async () => JSON.stringify({
      eligible: false,
      tip: "Ceritakan bagian yang dicoba, masalah yang muncul, dan perubahan yang kamu harapkan.",
    }),
  };

  const result = await assessFeedbackQuality("CV perlu diperbaiki", provider);
  assert.equal(result.eligible, false);
  assert.match(result.tip, /masalah/);
});

test("feedback quality assessment rejects malformed model output", async () => {
  const provider = {
    generateJsonResponse: async () => JSON.stringify({
      eligible: "yes",
      tip: "Terima kasih.",
    }),
  };

  await assert.rejects(
    assessFeedbackQuality("A sufficiently detailed product feedback example.", provider),
    (error) => error.code === "AI_RESPONSE_INVALID"
  );
});
