import { AIProvider } from "./AIProvider";
import { GeminiProvider } from "./GeminiProvider";

let cachedProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;

  const providerName = process.env.AI_PROVIDER ?? "gemini";
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";

  switch (providerName) {
    case "gemini":
      cachedProvider = new GeminiProvider(apiKey, model);
      break;
    default:
      throw new Error(`Unknown AI_PROVIDER: ${providerName}`);
  }

  return cachedProvider;
}
