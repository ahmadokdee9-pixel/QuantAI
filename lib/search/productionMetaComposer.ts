/**
 * Phase 1 — Production meta composition: trim duplicate debug payloads without UI changes.
 */

export function isSearchMetaLiteMode(): boolean {
  const raw = process.env.QUANTAI_SEARCH_META_LITE;
  if (raw == null || raw.trim() === "") {
    return process.env.NODE_ENV === "production";
  }
  const v = raw.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

const LITE_OMIT_KEYS = new Set([
  "searchDebug",
  "identityDebug",
  "discoveryValidationTrace",
  "rankingReasonTrace",
  "volatilitySignals",
  "marketSpreadAnalysis",
  "dealStrength",
  "fakeDiscountRisk",
  "buyTimingSignal",
  "merchantTrustConfidence",
  "valueScore",
]);

const CONTROLLED_LAYER_META_KEYS = [
  "intentRuntime",
  "intentOrchestration",
  "intentMemory",
  "intentCoordination",
  "intentFusion",
  "adaptiveReasoning",
  "decisionIntelligence",
  "strategyIntelligence",
  "marketIntelligence",
  "behavioralCommerce",
  "cognitionEngine",
  "intentCognition",
  "multiObjectiveCommerce",
  "adaptiveStrategicRanking",
  "memorylessCommerceLearning",
  "marketRealityIntelligence",
  "commerceDecisionIntelligence",
  "autonomousCommerceReasoningGraph",
  "unifiedCognitiveGovernance",
  "economicWorldSimulation",
  "intentEvaluation",
  "intentOptimization",
] as const;

export type ComposeProductionMetaArgs = {
  meta: Record<string, unknown>;
  controlledStackFastPath: boolean;
};

/** Apply lite meta policy — response shape unchanged for required consumer fields. */
export function composeProductionMeta(args: ComposeProductionMetaArgs): Record<string, unknown> {
  const { meta, controlledStackFastPath } = args;
  if (!isSearchMetaLiteMode()) return meta;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (LITE_OMIT_KEYS.has(key)) continue;
    if (controlledStackFastPath && CONTROLLED_LAYER_META_KEYS.includes(key as (typeof CONTROLLED_LAYER_META_KEYS)[number])) {
      continue;
    }
    out[key] = value;
  }

  out.metaLite = true;
  out.controlledStackFastPath = controlledStackFastPath;
  return out;
}
