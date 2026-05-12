/**
 * Commerce AI engine selection — extend with additional providers (e.g. Anthropic) without changing callers.
 */
export type CommerceAiEngineId = "openai-responses" | "heuristic-only";

export function resolveCommerceAiEngine(): CommerceAiEngineId {
  return process.env.OPENAI_API_KEY?.trim() ? "openai-responses" : "heuristic-only";
}
