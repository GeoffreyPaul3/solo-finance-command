import type { AiProvider, AiStructuredRequest } from "./provider";

export class GeminiAiProvider implements AiProvider {
  readonly name = "google-gemini";

  private getApiKey(): string | null {
    if (typeof process === "undefined" || !process.env) {
      return null;
    }
    return process.env["GEMINI_API_KEY"] || process.env["GOOGLE_AI_API_KEY"] || null;
  }

  private getModel(): string {
    if (typeof process !== "undefined" && process.env) {
      const customModel = process.env["GEMINI_MODEL"];
      if (customModel) return customModel;
    }
    return "gemini-1.5-flash";
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.trim().length > 0);
  }

  async generateStructuredResponse<T>(request: AiStructuredRequest): Promise<T> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("AI provider is not configured. Missing GEMINI_API_KEY / GOOGLE_AI_API_KEY.");
    }

    const model = this.getModel();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const payload = {
      systemInstruction: {
        parts: [{ text: request.systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: request.userPrompt }],
        },
      ],
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        responseMimeType: "application/json",
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Gemini API returned an empty response.");
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      // Strip markdown backticks if Gemini wrapped in ```json ... ```
      const cleaned = text
        .replace(/^```json\s*/, "")
        .replace(/```\s*$/, "")
        .trim();
      return JSON.parse(cleaned) as T;
    }
  }
}
