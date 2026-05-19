/**
 * Phase 1 latency discipline — stage budgets for production meta (no UI).
 */

export type StageSuppressionRow = {
  stage?: string;
  before?: number;
  after?: number;
  suppressed?: number;
};

export type LatencyBudgetReport = {
  totalMs: number;
  warmCacheTargetMs: number;
  coldCacheTargetMs: number;
  withinWarmBudget: boolean;
  withinColdBudget: boolean;
  heaviestStages: { stage: string; deltaMs: number; label: string }[];
};

const WARM_MS = Number(process.env.SEARCH_WARM_BUDGET_MS || 4500);
const COLD_MS = Number(process.env.SEARCH_COLD_BUDGET_MS || 8500);

const STAGE_LABELS: Record<string, string> = {
  pipeline_enrichment_and_ai: "upstream_pipeline",
  predictive_ranking: "predictive",
  persona_ranking: "persona",
  market_awareness_ranking: "market",
  hard_identity_gate: "identity_gate",
  semantic_rerank: "semantic_rerank",
  final_commerce_quality_order: "commerce_quality",
  buying_decision_order: "buying_decision",
};

export function buildLatencyBudgetReport(
  searchLatencyMs: number,
  stageSuppression: StageSuppressionRow[] = []
): LatencyBudgetReport {
  const heaviestStages = stageSuppression
    .map((row) => {
      const stage = row.stage ?? "unknown";
      const deltaMs = Math.max(0, (row.suppressed ?? 0) * 12 + (row.before ?? 0) > (row.after ?? 0) ? 8 : 0);
      return { stage, deltaMs, label: STAGE_LABELS[stage] ?? stage };
    })
    .sort((a, b) => b.deltaMs - a.deltaMs)
    .slice(0, 5);

  return {
    totalMs: searchLatencyMs,
    warmCacheTargetMs: WARM_MS,
    coldCacheTargetMs: COLD_MS,
    withinWarmBudget: searchLatencyMs <= WARM_MS,
    withinColdBudget: searchLatencyMs <= COLD_MS,
    heaviestStages,
  };
}
