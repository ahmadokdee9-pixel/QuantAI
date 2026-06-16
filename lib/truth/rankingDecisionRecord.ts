/**
 * Phase 3C — Ranking decision record layer.
 * Auditable attribution for why a product ranked — consumes existing Truth snapshots only.
 */

import { buildRankExplanation } from "@/lib/intelligence/rankExplanationEngine";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";
import {
  computeTruthRankContributions,
  type TruthRankBundle,
  type TruthRankLayerContribution,
  type TruthRankLayerId,
} from "@/lib/truth/truthIntegrationKernel";
import { computeTrustDrivenRankScore } from "@/lib/truth/trustDrivenCompositeRank";
import type { TruthFoundationPrefetchEntry, TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";
import type { QuantProduct } from "@/lib/shoppingScore";

export type RankingCompositeBreakdown = {
  relevance: number;
  trust: number;
  recommendation: number;
  taste: number;
  motivation: number;
  constraints: number;
  decision: number;
};

export type RankingDecisionRecord = {
  version: 1;
  link: string;
  finalRankScore: number;
  baseScore: number;
  truthDelta: number;
  compositeBreakdown: RankingCompositeBreakdown;
  layers: TruthRankLayerContribution[];
  whyRanked: string;
  influencedLayers: TruthRankLayerId[];
  evidenceChain: string[];
};

const INFLUENCE_THRESHOLD = 0.5;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function resolveBaseScore(
  foundation: TruthFoundationSnapshot,
  baseScore?: number
): number {
  if (typeof baseScore === "number" && Number.isFinite(baseScore)) {
    return clampScore(baseScore);
  }
  const decisionScore = foundation.decisionEngine.decisionScore;
  if (Number.isFinite(decisionScore) && decisionScore > 0) {
    return clampScore(decisionScore);
  }
  return clampScore(
    (foundation.productMatch.overallMatchScore +
      foundation.trustEngine.trustScore +
      foundation.recommendationIntelligence.recommendationScore) /
      3
  );
}

export function buildCompositeBreakdown(
  foundation: TruthFoundationSnapshot
): RankingCompositeBreakdown {
  const taste = foundation.tastePreference;
  const tasteAvg = clampScore(
    (taste.premiumAffinity +
      taste.valueAffinity +
      taste.performancePreference +
      taste.portabilityPreference) /
      4
  );

  return {
    relevance: clampScore(
      (foundation.productMatch.overallMatchScore + foundation.intentRetrieval.retrievalIntentScore) / 2
    ),
    trust: clampScore(foundation.trustEngine.trustScore),
    recommendation: clampScore(foundation.recommendationIntelligence.recommendationScore),
    taste: tasteAvg,
    motivation: clampScore(foundation.purchaseMotivation.motivationConfidence),
    constraints: clampScore(foundation.purchaseConstraints.constraintConfidence),
    decision: clampScore(foundation.userDecisionIntelligence.decisionConfidence),
  };
}

function buildInfluencedLayers(layers: TruthRankLayerContribution[]): TruthRankLayerId[] {
  return layers
    .filter((layer) => Math.abs(layer.scoreContribution) >= INFLUENCE_THRESHOLD)
    .sort((a, b) => Math.abs(b.scoreContribution) - Math.abs(a.scoreContribution))
    .map((layer) => layer.layer);
}

function buildEvidenceChain(
  foundation: TruthFoundationSnapshot,
  layers: TruthRankLayerContribution[]
): string[] {
  const fromLayers = layers.flatMap((layer) => layer.signals);
  const fromFoundation = [
    foundation.productMatch.strongestMatchReason,
    foundation.recommendationIntelligence.primaryRecommendationReason,
    foundation.productReasoning.shortReason,
    foundation.explainableAI.headline,
    foundation.purchaseMotivation.motivationEvidenceChain[0] ?? "",
    foundation.purchaseConstraints.constraintEvidenceChain[0] ?? "",
    foundation.userDecisionIntelligence.decisionEvidenceChain[0] ?? "",
  ];
  return [...new Set([...fromLayers, ...fromFoundation].map((item) => item.trim()).filter(Boolean))].slice(
    0,
    8
  );
}

function layerLabel(layer: TruthRankLayerId): string {
  switch (layer) {
    case "2C_productMatch":
      return "product match";
    case "2D_productReasoning":
      return "product reasoning";
    case "2E_recommendation":
      return "recommendation";
    case "2F_explainableAI":
      return "explainability";
    case "2G_conversationalIntent":
      return "conversational intent";
    case "2H_tastePreference":
      return "taste affinity";
    case "2I_userDecision":
      return "decision intelligence";
    case "2J_purchaseMotivation":
      return "purchase motivation";
    case "2K_purchaseConstraints":
      return "purchase constraints";
    default:
      return layer;
  }
}

export function buildWhyRanked(args: {
  foundation: TruthFoundationSnapshot;
  bundle: TruthRankBundle;
  influencedLayers: TruthRankLayerId[];
  baseScore: number;
}): string {
  const { foundation, bundle, influencedLayers, baseScore } = args;
  const topLayers = influencedLayers.slice(0, 3).map(layerLabel);
  const layerText =
    topLayers.length > 0
      ? ` Influenced by ${topLayers.join(", ")}.`
      : "";
  const matchReason = foundation.productMatch.strongestMatchReason;
  const recSummary = foundation.recommendationIntelligence.recommendationSummary;
  const core = matchReason || recSummary || foundation.productReasoning.summaryReason;
  const deltaText =
    bundle.truthRankDelta !== 0
      ? ` Truth intelligence ${bundle.truthRankDelta > 0 ? "boost" : "adjustment"} ${bundle.truthRankDelta > 0 ? "+" : ""}${bundle.truthRankDelta}.`
      : "";
  return `${core || "Ranked from query fit and commerce evidence."} Base score ${baseScore}.${deltaText}${layerText}`.trim();
}

/** Build auditable ranking decision record from an existing Truth foundation snapshot. */
export function buildRankingDecisionRecord(args: {
  link: string;
  foundation: TruthFoundationSnapshot;
  baseScore?: number;
  finalRankScore?: number;
}): RankingDecisionRecord {
  const bundle = computeTruthRankContributions(args.foundation);
  const baseScore =
    typeof args.baseScore === "number" && Number.isFinite(args.baseScore)
      ? Math.round(args.baseScore * 10) / 10
      : resolveBaseScore(args.foundation, args.baseScore);
  const truthDelta = bundle.truthRankDelta;
  const compositeBreakdown = buildCompositeBreakdown(args.foundation);
  const influencedLayers = buildInfluencedLayers(bundle.layers);
  const evidenceChain = buildEvidenceChain(args.foundation, bundle.layers);
  const whyRanked = buildWhyRanked({
    foundation: args.foundation,
    bundle,
    influencedLayers,
    baseScore,
  });
  const finalRankScore =
    typeof args.finalRankScore === "number" && Number.isFinite(args.finalRankScore)
      ? Math.round(args.finalRankScore * 10) / 10
      : Math.round((baseScore + truthDelta) * 10) / 10;

  return {
    version: 1,
    link: args.link,
    finalRankScore,
    baseScore,
    truthDelta,
    compositeBreakdown,
    layers: bundle.layers,
    whyRanked,
    influencedLayers,
    evidenceChain,
  };
}

/** Serialize ranking records for search API meta (JSON-safe). */
export function serializeTruthRankingByLink(
  records: Map<string, RankingDecisionRecord>
): Record<string, RankingDecisionRecord> {
  return Object.fromEntries(records.entries());
}

/** Parse ranking records from search meta on the client. */
export function parseTruthRankingByLink(raw: unknown): Map<string, RankingDecisionRecord> {
  const out = new Map<string, RankingDecisionRecord>();
  if (!raw || typeof raw !== "object") return out;

  for (const [link, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Partial<RankingDecisionRecord>;
    if (row.version !== 1 || typeof row.link !== "string") continue;
    if (!row.compositeBreakdown || !Array.isArray(row.layers)) continue;
    out.set(link, row as RankingDecisionRecord);
  }

  return out;
}

/** Attach decision record and enrich existing rank explanation fields (no ranking order change). */
export function enrichDecisionWithRankingRecord(
  decision: UniversalProductDecision,
  options?: {
    productTitle?: string;
    product?: QuantProduct;
    list?: QuantProduct[];
    searchQuery?: string;
    prefetch?: TruthFoundationPrefetchEntry | null;
  }
): UniversalProductDecision {
  const intel = decision.productIntelligence;
  const foundation = intel?.truthFoundation;
  if (!intel || !foundation) return decision;

  let rankingDecisionRecord: RankingDecisionRecord;
  if (options?.product && options.list && options.searchQuery) {
    const trustDriven = computeTrustDrivenRankScore({
      product: options.product,
      list: options.list,
      query: options.searchQuery,
      prefetch: options.prefetch ?? null,
    });
    rankingDecisionRecord = trustDriven.record;
  } else {
    rankingDecisionRecord = buildRankingDecisionRecord({
      link: decision.link,
      foundation,
      baseScore: intel.searchRank?.rankScore,
    });
  }

  let rankExplanation = intel.rankExplanation;
  if (intel.searchRank && intel.globalCategoryIntelligence) {
    rankExplanation = buildRankExplanation({
      productTitle: options?.productTitle ?? decision.link,
      searchRank: intel.searchRank,
      verdict: decision.verdict,
      categoryIntel: intel.globalCategoryIntelligence,
      beatsItTitle: null,
      isGlobalWinner: intel.globalWinner?.isWinner ?? false,
      rankingDecisionRecord,
    });
  }

  const commerceReasoning = intel.commerceReasoning
    ? {
        ...intel.commerceReasoning,
        whyWon: rankingDecisionRecord.whyRanked,
      }
    : {
        whyWon: rankingDecisionRecord.whyRanked,
        whyLost: "",
        competitorEdge: "",
        improvementPath: rankingDecisionRecord.evidenceChain.slice(0, 2).join(" "),
      };

  return {
    ...decision,
    productIntelligence: {
      ...intel,
      rankingDecisionRecord,
      rankExplanation,
      commerceReasoning,
    },
  };
}
