/**
 * Commerce AI engine selection — extend with additional providers (e.g. Anthropic) without changing callers.
 */
export type CommerceAiEngineId = "openai-responses" | "heuristic-only";

export function resolveCommerceAiEngine(): CommerceAiEngineId {
  const forceHeuristic = process.env.QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI?.trim().toLowerCase();
  if (forceHeuristic === "true" || forceHeuristic === "1" || forceHeuristic === "yes") {
    return "heuristic-only";
  }
  return process.env.OPENAI_API_KEY?.trim() ? "openai-responses" : "heuristic-only";
}
