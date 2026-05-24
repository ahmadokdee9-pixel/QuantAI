/**
 * Phase 3 — Explicit normalization execution graph (shadow-safe, APPLY blocked in production).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { resolveGlobalMutationPolicy, assertNormalizationApplyBlocked } from "@/lib/governance/applyMutationGuard";
import { integrateNormalizationInSearchTray } from "./searchIntegration";
import type { NormalizationStage, NormalizationShadowTelemetry, NormalizationTrayMeta } from "./types";
import { readNormalizationFlags } from "./flags";
import { buildShadowTelemetry } from "./searchIntegration";
import { emitNormalizationShadowTelemetry } from "./shadowTelemetry";
import { normalizationMetaForSearchResponse } from "./searchIntegration";
import { isPhase2ShadowObservation } from "./flags";

export type NormalizationNodeContract = {
  stage: NormalizationStage;
  latencyBudgetMs: number;
  replaySafe: boolean;
  mutationPermission: "none" | "shadow_meta" | "apply_dedup";
  shadowCapable: boolean;
  applyCapable: boolean;
};

export const NORMALIZATION_GRAPH_NODES: Record<NormalizationStage, NormalizationNodeContract> = {
  post_semantic: {
    stage: "post_semantic",
    latencyBudgetMs: 8,
    replaySafe: true,
    mutationPermission: "shadow_meta",
    shadowCapable: true,
    applyCapable: false,
  },
  post_controlled: {
    stage: "post_controlled",
    latencyBudgetMs: 10,
    replaySafe: true,
    mutationPermission: "shadow_meta",
    shadowCapable: true,
    applyCapable: false,
  },
};

export type NormalizationGraphNodeRecord = {
  stage: NormalizationStage;
  executed: boolean;
  skipped: boolean;
  skipReason?: string;
  latencyMs: number;
  inputCount: number;
  outputCount: number;
  apply: boolean;
  rankingMutation: boolean;
};

export type NormalizationExecutionGraphSnapshot = {
  version: "phase3";
  nodes: NormalizationGraphNodeRecord[];
  mutationPolicyReason: string;
};

export type ExecuteNormalizationStageInput = {
  products: QuantProduct[];
  query: string;
  stage: NormalizationStage;
  searchLatencyMs?: number;
};

export type ExecuteNormalizationStageResult = {
  products: QuantProduct[];
  meta: NormalizationTrayMeta;
  shadowTelemetry: NormalizationShadowTelemetry;
  latencyMs: number;
  graphNode: NormalizationGraphNodeRecord;
};

/** Run a single normalization graph node with APPLY hard-block in production. */
export function executeNormalizationStage(
  input: ExecuteNormalizationStageInput
): ExecuteNormalizationStageResult {
  const policy = resolveGlobalMutationPolicy();
  assertNormalizationApplyBlocked();
  const flags = readNormalizationFlags();
  const contract = NORMALIZATION_GRAPH_NODES[input.stage];
  const started = Date.now();

  if (!flags.enabled || input.products.length === 0) {
    const emptyMeta: NormalizationTrayMeta = {
      enabled: flags.enabled,
      mode: flags.mode,
      apply: false,
      version: "p0.1",
      inputCount: input.products.length,
      outputCount: input.products.length,
      duplicateListingCount: 0,
      collapsedListingCount: 0,
      equivalenceGroupCount: 0,
      uniqueCommerceIdCount: 0,
      uniqueFamilyGraphIdCount: 0,
      top3DuplicateRateBefore: 0,
      top3DuplicateRateAfter: 0,
      groups: [],
    };
    return {
      products: input.products,
      meta: emptyMeta,
      shadowTelemetry: buildShadowTelemetry(input.stage, emptyMeta, input.products, input.products, 0),
      latencyMs: Date.now() - started,
      graphNode: {
        stage: input.stage,
        executed: false,
        skipped: true,
        skipReason: "normalization_disabled",
        latencyMs: Date.now() - started,
        inputCount: input.products.length,
        outputCount: input.products.length,
        apply: false,
        rankingMutation: false,
      },
    };
  }

  const effectiveApply = policy.normalizationApplyBlocked ? false : flags.apply;
  const result = integrateNormalizationInSearchTray(input.products, input.query, input.stage, {
    searchLatencyMs: input.searchLatencyMs ?? 0,
  });

  const inputCount = result.meta.inputCount;
  const outputCount = result.meta.outputCount;
  const trayUnchanged = inputCount === outputCount;
  const rankingMutation = effectiveApply && !trayUnchanged;

  if (input.stage === "post_controlled" && isPhase2ShadowObservation()) {
    emitNormalizationShadowTelemetry({
      queryLength: input.query.length,
      searchLatencyMs: input.searchLatencyMs ?? 0,
      productCount: result.products.length,
      shadow: result.shadowTelemetry,
      meta: result.meta,
    });
  }

  return {
    ...result,
    meta: { ...result.meta, apply: effectiveApply },
    graphNode: {
      stage: input.stage,
      executed: true,
      skipped: false,
      latencyMs: Date.now() - started,
      inputCount,
      outputCount,
      apply: effectiveApply,
      rankingMutation,
    },
  };
}

export type FinalizeNormalizationGraphInput = {
  products: QuantProduct[];
  query: string;
  searchLatencyMs: number;
  shadowPostSemantic?: NormalizationShadowTelemetry | null;
  priorMeta?: NormalizationTrayMeta | null;
};

export type FinalizeNormalizationGraphResult = {
  products: QuantProduct[];
  meta: NormalizationTrayMeta;
  shadowPostControlled: NormalizationShadowTelemetry;
  shadowPostSemantic?: NormalizationShadowTelemetry;
  responseMeta: Record<string, unknown>;
  latencyMs: number;
  graph: NormalizationExecutionGraphSnapshot;
};

/** Post-controlled graph terminus — wraps stage executor + response meta export. */
export function finalizeNormalizationGraph(
  input: FinalizeNormalizationGraphInput
): FinalizeNormalizationGraphResult {
  const policy = resolveGlobalMutationPolicy();
  const started = Date.now();
  const stageResult = executeNormalizationStage({
    products: input.products,
    query: input.query,
    stage: "post_controlled",
    searchLatencyMs: input.searchLatencyMs,
  });

  const responseMeta = normalizationMetaForSearchResponse(
    stageResult.meta,
    stageResult.shadowTelemetry,
    input.searchLatencyMs
  );

  const graph: NormalizationExecutionGraphSnapshot = {
    version: "phase3",
    mutationPolicyReason: policy.reason,
    nodes: [stageResult.graphNode],
  };

  return {
    products: stageResult.products,
    meta: input.priorMeta ?? stageResult.meta,
    shadowPostControlled: stageResult.shadowTelemetry,
    shadowPostSemantic: input.shadowPostSemantic ?? undefined,
    responseMeta,
    latencyMs: Date.now() - started,
    graph,
  };
}
