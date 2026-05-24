/**
 * Stage 1 production shadow event emission — structured logs + optional analytics sink.
 */

import { QuantAnalyticsEvents } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/trackServer";
import { logProductionInfo } from "@/lib/log/productionLog";
import type { NormalizationShadowTelemetry, NormalizationTrayMeta } from "./types";
import { emitNormalizationShadowAuditLog } from "./shadowAuditLog";

export type NormalizationShadowLogPayload = {
  queryLength: number;
  searchLatencyMs: number;
  productCount: number;
  shadow: NormalizationShadowTelemetry;
  meta?: NormalizationTrayMeta;
  queryCategory?: string;
};

/** Emit Stage 1 shadow telemetry to production logs and optional analytics sink. */
export function emitNormalizationShadowTelemetry(payload: NormalizationShadowLogPayload): void {
  const { shadow, queryLength, searchLatencyMs, productCount } = payload;
  if (!shadow.enabled) return;

  const fields = {
    stage: shadow.stage,
    mode: shadow.mode,
    apply: shadow.apply,
    version: shadow.version,
    queryLength,
    searchLatencyMs,
    productCount,
    inputCount: shadow.inputCount,
    outputCount: shadow.outputCount,
    top3DuplicateRateBefore: shadow.top3DuplicateRateBefore,
    top3DuplicateRateAfter: shadow.top3DuplicateRateAfter,
    rankingLiftEstimate: shadow.rankingLiftEstimate,
    projectedRankingLift: shadow.projectedRankingLift ?? shadow.rankingLiftEstimate,
    projectedTop3DuplicateRate: shadow.projectedTop3DuplicateRate,
    equivalenceGroupCount: shadow.equivalenceGroupCount,
    duplicateListingCount: shadow.duplicateListingCount,
    canonicalIdentityCoverage: shadow.canonicalIdentityCoverage,
    merchantDiversityScoreBefore: shadow.merchantDiversityScoreBefore,
    merchantDiversityScoreAfter: shadow.merchantDiversityScoreAfter,
    merchantDiversityDelta: shadow.merchantDiversityDelta,
    semanticCoherenceScore: shadow.semanticCoherenceScore,
    falseCollapseIncidents: shadow.falseCollapseIncidents,
    rolloutReadinessScore: shadow.rolloutReadinessScore,
    rolloutReadinessGrade: shadow.rolloutReadinessGrade,
    normalizationLatencyMs: shadow.latencyMs,
    latencyPctOfSearch:
      searchLatencyMs > 0 ? round4(shadow.latencyMs / searchLatencyMs) : 0,
  };

  logProductionInfo("quantai.normalization.shadow", fields);

  trackServerEvent(QuantAnalyticsEvents.NORMALIZATION_SHADOW, fields);

  emitNormalizationShadowAuditLog({
    queryLength,
    searchLatencyMs,
    productCount,
    shadow,
    meta: payload.meta,
    queryCategory: payload.queryCategory,
  });
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
