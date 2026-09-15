import { GeminiAiProvider } from "./gemini-provider";
import type { AiProvider } from "./provider";

export * from "./provider";
export * from "./gemini-provider";

export function getAiProvider(): AiProvider {
  const providerType =
    (typeof process !== "undefined" && process.env && process.env["AI_PROVIDER"]) || "gemini";

  switch (providerType.toLowerCase()) {
    case "gemini":
    default:
      return new GeminiAiProvider();
  }
}
