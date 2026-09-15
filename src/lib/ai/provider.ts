// ============================================================================
// SoloOS AI Provider Abstraction Interface
// ============================================================================
// Principle: Zero coupling between financial engine and any specific AI SDK.
// Any AI vendor (Gemini, Claude, OpenAI, Ollama) can implement this interface.
// ============================================================================

export interface AiStructuredRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

export interface AiProvider {
  readonly name: string;
  isConfigured(): boolean;
  generateStructuredResponse<T>(request: AiStructuredRequest): Promise<T>;
}
