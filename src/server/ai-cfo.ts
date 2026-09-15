import { createServerFn } from "@tanstack/react-start";

import {
  aiCfoResponseSchema,
  AI_CFO_SYSTEM_PROMPT,
  buildDeterministicFinancialContext,
  getUnavailableAiCfoResult,
  type AiCfoResult,
  type FinancialContextParams,
} from "@/domain/ai-cfo";
import { getAiProvider } from "@/lib/ai";

export interface AskAiCfoPayload {
  workspaceId: string;
  question: string;
  context: FinancialContextParams;
}

export const askAiCfoServerFn = createServerFn({ method: "POST" })
  .validator((data: AskAiCfoPayload) => data)
  .handler(async ({ data }): Promise<AiCfoResult> => {
    const provider = getAiProvider();

    if (!provider.isConfigured()) {
      return getUnavailableAiCfoResult();
    }

    try {
      const contextStr = buildDeterministicFinancialContext(data.context);
      const userPrompt = `FINANCIAL CONTEXT (DETERMINISTIC FACTS):\n${contextStr}\n\nUSER QUESTION / FOCUS:\n${data.question}\n\nAnalyze the financial context above and address the user's question. Remember to ground every number strictly in the provided context. Return valid JSON matching the schema: summary, key_points, risks, opportunities, recommended_actions (title, description, action_type, suggested_route), metric_references (label, value).`;

      const rawResponse = await provider.generateStructuredResponse({
        systemPrompt: AI_CFO_SYSTEM_PROMPT,
        userPrompt,
        temperature: 0.2,
      });

      const validated = aiCfoResponseSchema.parse(rawResponse);

      return {
        status: "ready",
        response: validated,
        isAvailable: true,
      };
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while consulting AI CFO.";
      return {
        status: "error",
        isAvailable: true,
        errorMessage: errorMsg,
      };
    }
  });
