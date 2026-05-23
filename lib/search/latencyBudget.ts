/**
 * Phase 1 latency discipline — real stage timings + budget gates for production meta.
 */

import type { PipelineStageRow } from "@/lib/search/pipelineTrace";

export type StageSuppressionRow = {
  stage?: string;
  before?: number;
  after?: number;
  suppressed?: number;
  durationMs?: number;
};

export type LatencyBudgetReport = {
  totalMs: number;
  warmCacheTargetMs: number;
  coldCacheTargetMs: number;
  withinWarmBudget: boolean;
  withinColdBudget: boolean;
  controlledStackMs: number;
  normalizationMs: number;
  preStackMs: number;
  heaviestStages: { stage: string; durationMs: number; label: string }[];
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
  normalization_post_semantic: "normalization_semantic",
  final_commerce_quality_order: "commerce_quality",
  buying_decision_order: "buying_decision",
  controlled_stack: "controlled_stack",
  controlled_stack_fast_path: "controlled_fast_path",
  normalization_post_controlled: "normalization_controlled",
  tray_artifacts_rebuild: "tray_rebuild",
};

function sumStageMs(rows: PipelineStageRow[], stagePrefix: string): number {
  return rows
    .filter((r) => r.stage.startsWith(stagePrefix))
    .reduce((s, r) => s + r.durationMs, 0);
}

export function buildLatencyBudgetReport(
  searchLatencyMs: number,
  stageRows: PipelineStageRow[] | StageSuppressionRow[] = []
): LatencyBudgetReport {
  const normalized: PipelineStageRow[] = stageRows.map((row) => ({
    stage: row.stage ?? "unknown",
    before: row.before ?? 0,
    after: row.after ?? 0,
    suppressed: row.suppressed ?? Math.max(0, (row.before ?? 0) - (row.after ?? 0)),
    durationMs: row.durationMs ?? 0,
  }));

  const heaviestStages = [...normalized]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 6)
    .map((row) => ({
      stage: row.stage,
      durationMs: row.durationMs,
      label: STAGE_LABELS[row.stage] ?? row.stage,
    }));

  const controlledStackMs = sumStageMs(normalized, "controlled_stack");
  const normalizationMs =
    sumStageMs(normalized, "normalization_post_semantic") +
    sumStageMs(normalized, "normalization_post_controlled");
  const preStackMs =
    sumStageMs(normalized, "predictive_ranking") +
    sumStageMs(normalized, "persona_ranking") +
    sumStageMs(normalized, "semantic_rerank") +
    sumStageMs(normalized, "final_commerce_quality_order") +
    sumStageMs(normalized, "buying_decision_order");

  return {
    totalMs: searchLatencyMs,
    warmCacheTargetMs: WARM_MS,
    coldCacheTargetMs: COLD_MS,
    withinWarmBudget: searchLatencyMs <= WARM_MS,
    withinColdBudget: searchLatencyMs <= COLD_MS,
    controlledStackMs,
    normalizationMs,
    preStackMs,
    heaviestStages,
  };
}
