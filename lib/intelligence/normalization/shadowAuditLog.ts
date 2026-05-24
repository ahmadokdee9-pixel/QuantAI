/**
 * Phase 2 — Shadow normalization audit logs (duplicate collapse monitoring).
 */

import { QuantAnalyticsEvents } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/trackServer";
import { logProductionInfo } from "@/lib/log/productionLog";
import type { NormalizationShadowTelemetry, NormalizationTrayMeta } from "./types";
import { top3DuplicateReduction } from "./applyReadiness";

export type NormalizationShadowAuditPayload = {
  queryLength: number;
  searchLatencyMs: number;
  productCount: number;
  shadow: NormalizationShadowTelemetry;
  meta?: NormalizationTrayMeta;
  queryCategory?: string;
};

/** Extended audit event for live duplicate-collapse monitoring. */
export function emitNormalizationShadowAuditLog(payload: NormalizationShadowAuditPayload): void {
  const { shadow, queryLength, searchLatencyMs, productCount, meta, queryCategory } = payload;
  if (!shadow.enabled) return;

  const projected = shadow.projectedTop3DuplicateRate ?? shadow.top3DuplicateRateAfter;
  const dupReduction = top3DuplicateReduction(shadow.top3DuplicateRateBefore, projected);
  const trayInvariant = shadow.inputCount === shadow.outputCount;
  const duplicateCollapseRate =
    meta && meta.inputCount > 0
      ? round4(meta.collapsedListingCount / meta.inputCount)
      : 0;

  const fields = {
    auditVersion: "phase2.1",
    stage: shadow.stage,
    mode: shadow.mode,
    apply: shadow.apply,
    rankingMutation: shadow.apply === true,
    queryLength,
    queryCategory: queryCategory ?? "unknown",
    searchLatencyMs,
    productCount,
    inputCount: shadow.inputCount,
    outputCount: shadow.outputCount,
    trayInvariant,
    top3DuplicateRateBefore: shadow.top3DuplicateRateBefore,
    top3DuplicateRateAfter: shadow.top3DuplicateRateAfter,
    top3DuplicateReduction: dupReduction,
    projectedTop3DuplicateRate: projected,
    projectedRankingLift: shadow.projectedRankingLift ?? shadow.rankingLiftEstimate,
    measuredDuplicateReduction: dupReduction,
    duplicateListingCount: shadow.duplicateListingCount,
    duplicateCollapseRate,
    equivalenceGroupCount: shadow.equivalenceGroupCount,
    canonicalIdentityCoverage: shadow.canonicalIdentityCoverage,
    uniqueCommerceIdCount: meta?.uniqueCommerceIdCount ?? null,
    merchantDiversityBefore: shadow.merchantDiversityScoreBefore,
    merchantDiversityAfter: shadow.merchantDiversityScoreAfter,
    merchantDiversityDelta: shadow.merchantDiversityDelta,
    semanticCoherenceScore: shadow.semanticCoherenceScore,
    falseCollapseIncidents: shadow.falseCollapseIncidents,
    falseCollapseAlert: (shadow.falseCollapseIncidents ?? 0) > 0,
    rolloutReadinessScore: shadow.rolloutReadinessScore,
    rolloutReadinessGrade: shadow.rolloutReadinessGrade,
    normalizationLatencyMs: shadow.latencyMs,
    latencyPctOfSearch: searchLatencyMs > 0 ? round4(shadow.latencyMs / searchLatencyMs) : 0,
  };

  logProductionInfo("quantai.normalization.shadow.audit", fields);
  trackServerEvent(QuantAnalyticsEvents.NORMALIZATION_SHADOW_AUDIT, fields);
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
