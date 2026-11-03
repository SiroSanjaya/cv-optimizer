const assert = require("node:assert/strict");
const test = require("node:test");
const { GeminiProvider } = require("../dist/services/ai/GeminiProvider");

test("analysis uses an evidence score and omits personal CV information from the prompt", async () => {
  let promptSentToModel = "";
  const provider = new GeminiProvider("test-api-key");
  provider.client.getGenerativeModel = () => ({
    generateContent: async (prompt) => {
      promptSentToModel = prompt;
      return {
        response: {
          text: () => JSON.stringify({
            matchScore: 99,
            matchedSkills: ["TypeScript"],
            partialMatches: [],
            missingSkills: ["Kubernetes"],
            keywords: [],
            recommendations: [],
            experienceRelevance: [],
            summary: "Evidence-based match.",
            jobMatchAnalysis: [
              {
                requirement: "TypeScript",
                evidence: "Listed in CV skills.",
                status: "Supported",
              },
              {
                requirement: "System design",
                evidence: "Related project experience.",
                status: "Partial",
              },
              {
                requirement: "Kubernetes",
                evidence: "No evidence found.",
                status: "Gap",
              },
            ],
          }),
        },
      };
    },
  });

  const analysis = await provider.analyzeMatch(
    {
      personalInfo: {
        name: "candidate-private-marker",
        email: "private-marker@example.test",
        phone: "private-phone-marker",
        location: "private-location-marker",
        linkedin: "",
        github: "",
      },
      summary: "Backend developer",
      skills: ["TypeScript"],
      experience: [],
      projects: [],
      education: [],
      certifications: [],
    },
    "A backend developer role requiring TypeScript and Kubernetes."
  );

  assert.equal(analysis.matchScore, 50);
  assert.doesNotMatch(promptSentToModel, /candidate-private-marker|private-marker@example\.test|private-phone-marker|private-location-marker/);
});
