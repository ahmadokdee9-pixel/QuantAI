/**
 * Phase 1 — Deterministic normalization lifecycle for search (shadow / APPLY prep).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { finalizeNormalizationGraph } from "./normalizationExecutionGraph";
import { readNormalizationFlags } from "./flags";
import { buildShadowTelemetry } from "./searchIntegration";
import type { NormalizationShadowTelemetry, NormalizationTrayMeta } from "./types";

export type FinalizeSearchNormalizationResult = {
  products: QuantProduct[];
  meta: NormalizationTrayMeta;
  shadowPostControlled: NormalizationShadowTelemetry;
  shadowPostSemantic?: NormalizationShadowTelemetry;
  responseMeta: Record<string, unknown>;
  latencyMs: number;
};

export type FinalizeSearchNormalizationInput = {
  products: QuantProduct[];
  query: string;
  searchLatencyMs: number;
  shadowPostSemantic?: NormalizationShadowTelemetry | null;
  priorMeta?: NormalizationTrayMeta | null;
};

/**
 * Single authoritative post-controlled normalization pass + meta export.
 * Ranking mutation only when flags.apply=true and mode allows (Stage 1 blocks).
 */
export function finalizeSearchNormalization(
  input: FinalizeSearchNormalizationInput
): FinalizeSearchNormalizationResult {
  const flags = readNormalizationFlags();
  const started = Date.now();

  if (!flags.enabled || input.products.length === 0) {
    const emptyMeta: NormalizationTrayMeta = {
      enabled: flags.enabled,
      mode: flags.mode,
      apply: flags.apply,
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
    const emptyShadow = buildShadowTelemetry(
      "post_controlled",
      emptyMeta,
      input.products,
      input.products,
      0
    );
    return {
      products: input.products,
      meta: input.priorMeta ?? emptyMeta,
      shadowPostControlled: emptyShadow,
      shadowPostSemantic: input.shadowPostSemantic ?? undefined,
      responseMeta: {},
      latencyMs: Date.now() - started,
    };
  }

  const finalized = finalizeNormalizationGraph({
    products: input.products,
    query: input.query,
    searchLatencyMs: input.searchLatencyMs,
    shadowPostSemantic: input.shadowPostSemantic,
    priorMeta: input.priorMeta,
  });

  return {
    products: finalized.products,
    meta: finalized.meta,
    shadowPostControlled: finalized.shadowPostControlled,
    shadowPostSemantic: finalized.shadowPostSemantic,
    responseMeta: { ...finalized.responseMeta, normalizationGraph: finalized.graph },
    latencyMs: Date.now() - started,
  };
}
