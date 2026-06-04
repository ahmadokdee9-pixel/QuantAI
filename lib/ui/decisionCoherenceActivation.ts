/**
 * Phase 14.0 — Decision Coherence Activation Layer.
 * Single institutional verdict authority with per-product binding (presentation only).
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type {
  Phase93TrustDiscountMeta,
  ProductTrustDiscountAssessment,
} from "@/lib/intelligence/phase93TrustDiscountHardening";
import type { VerdictIntelligenceMeta } from "@/lib/intelligence/verdictEngine";
import type { ExecutedRankingMeta } from "@/lib/ranking/controlledRankingExecution";
import type { RankingEngineMeta } from "@/lib/ranking/deterministicRankingEngine";
import { getProsAndCons, getStoreTrustScore, type QuantProduct } from "@/lib/shoppingScore";
import { resolveActivatedBriefPresentation } from "@/lib/ui/activatedDecisionBriefPresentation";
import {
  primaryVerdictAlignment,
  toPrimaryVerdict,
  trustMicroLabel,
  trustTierFromScore,
  type PrimaryVerdict,
} from "@/lib/ui/decisionLanguage";
import {
  activateMarketContext,
  mergeMarketContextExpandedLines,
  mergeMarketContextSummary,
  type ActivatedMarketContext,
  type MarketContextInput,
} from "@/lib/ui/marketContextActivation";
import {
  optimizeVerdictSurface,
  type OptimizedVerdictSurface,
  type VerdictSurfaceContext,
} from "@/lib/ui/verdictSurfaceOptimization";
import {
  activateDiscountTruth,
  mergeDiscountTruthExpandedLines,
  type ActivatedDiscountTruth,
} from "@/lib/ui/discountTruthActivation";
import {
  activateRankingRationale,
  mergeRankingRationaleExpandedLines,
  mergeRankingRationaleSummary,
} from "@/lib/ui/rankingRationaleActivation";
import type { ProductRankingMeta } from "@/lib/ranking/productRankingApplication";
import type { RankingSignalsMeta } from "@/lib/ranking/rankingSignalsAggregator";

export type DecisionCoherenceTrayContext = {
  verdictIntelligence: VerdictIntelligenceMeta | null;
  decisionBrief: DecisionBriefDTO | null;
  rankingEngine: RankingEngineMeta | null;
  executedRanking: ExecutedRankingMeta | null;
  rankingSignals: RankingSignalsMeta | null;
  productRanking: ProductRankingMeta | null;
  verdictSurface: VerdictSurfaceContext;
  marketContext: MarketContextInput;
  phase93: Phase93TrustDiscountMeta | null;
};

export type CoherentExecutionPosture = {
  label: string;
  line: string;
};

export type CoherentProductDecision = {
  verdict: PrimaryVerdict;
  reasonLine: string;
  alignmentScore: number;
  trustMicro: string;
  decisionBrief: DecisionBriefDTO | null;
  marketContext: MarketContextInput;
  optimizedSurface: OptimizedVerdictSurface;
  activatedMarket: ActivatedMarketContext | null;
  summaryLines: string[];
  expandedSignals: string[];
  smartDecisionLines: string[];
  rankingRationaleLine: string;
  drawerRankingLine: string;
  drawerDecisionLane: string;
  drawerStanceLabel: string;
  drawerSynthesis: string;
  executionPosture: CoherentExecutionPosture | null;
  isLeadProduct: boolean;
  discountTruth: ActivatedDiscountTruth;
};

function clipLine(text: string | undefined | null, max = 112): string {
  if (text == null) return "";
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function uniqueLines(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const line = clipLine(value);
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}

/** Institutional verdict authority — all surfaces derive from this. */
export function resolveInstitutionalVerdict(
  verdictIntelligence: VerdictIntelligenceMeta | null | undefined
): PrimaryVerdict {
  if (!verdictIntelligence?.verdict) return "COMPARE";
  return toPrimaryVerdict(verdictIntelligence.verdict);
}

export function findPhase93Assessment(
  phase93: Phase93TrustDiscountMeta | null | undefined,
  product: QuantProduct
): ProductTrustDiscountAssessment | null {
  if (!phase93?.trayAssessments?.length) return null;
  return phase93.trayAssessments.find((a) => a.link === product.link) ?? null;
}

function phase93ProductVerdict(
  assessment: ProductTrustDiscountAssessment | null
): PrimaryVerdict | null {
  if (!assessment) return null;
  if (assessment.suspiciousSeller || assessment.trustScore < 52) return "AVOID";
  if (assessment.fakeDiscountRisk === "high") return "AVOID";
  if (assessment.fakeDiscountRisk === "medium" || assessment.priceAnomaly === "suspicious_low") {
    return "WAIT";
  }
  return null;
}

/** Per-product verdict bound to institutional authority. */
export function resolveCoherentProductVerdict(args: {
  institutionalVerdict: PrimaryVerdict;
  isLeadProduct: boolean;
  phase93Assessment: ProductTrustDiscountAssessment | null;
}): PrimaryVerdict {
  const productEscalation = phase93ProductVerdict(args.phase93Assessment);
  if (productEscalation === "AVOID") return "AVOID";
  if (args.institutionalVerdict === "AVOID" || args.institutionalVerdict === "WAIT") {
    return args.institutionalVerdict;
  }
  if (productEscalation === "WAIT") return "WAIT";
  if (args.isLeadProduct) return args.institutionalVerdict;
  if (args.institutionalVerdict === "BUY READY") return "COMPARE";
  return args.institutionalVerdict;
}

export function isLeadProduct(args: {
  product: QuantProduct;
  rank: number;
  decisionBrief: DecisionBriefDTO | null;
}): boolean {
  if (args.rank === 0) return true;
  const pickLink = args.decisionBrief?.recommendation?.link;
  return Boolean(pickLink && pickLink === args.product.link);
}

/** Lead gets full brief; secondary cards get no tray-wide brief leakage. */
export function bindProductDecisionBrief(
  brief: DecisionBriefDTO | null,
  product: QuantProduct,
  isLead: boolean
): DecisionBriefDTO | null {
  if (!brief || !isLead) return null;
  const pickLink = brief.recommendation?.link;
  if (pickLink && pickLink !== product.link) return null;
  return brief;
}

export function groundMarketContextInput(
  base: MarketContextInput,
  phase93Assessment: ProductTrustDiscountAssessment | null,
  institutionalVerdict: PrimaryVerdict
): MarketContextInput {
  return {
    ...base,
    phase93Assessment,
    institutionalVerdict,
  };
}

function stanceLabel(verdict: PrimaryVerdict): string {
  if (verdict === "BUY READY") return "Buy lane";
  if (verdict === "WAIT" || verdict === "AVOID") return "Wait lane";
  return "Compare lane";
}

function verdictPosture(verdict: PrimaryVerdict): CoherentExecutionPosture {
  switch (verdict) {
    case "BUY READY":
      return {
        label: "Clear to buy",
        line: "Signals support moving forward on this listing.",
      };
    case "WAIT":
      return {
        label: "Hold timing",
        line: "Wait until trust, pricing, or timing improves.",
      };
    case "AVOID":
      return {
        label: "Avoid checkout",
        line: "Risk outweighs upside on this listing.",
      };
    default:
      return {
        label: "Compare options",
        line: "Line up alternatives before committing.",
      };
  }
}

const WAIT_ACTIONS = new Set([
  "WAIT_FOR_DROP",
  "DISCOUNT_LIKELY_SOON",
  "PREMIUM_PRICING",
  "WAIT",
]);

const BUY_ACTIONS = new Set([
  "BUY_NOW",
  "SAFE_TRUSTED_OFFER",
  "BEST_REGIONAL_DEAL",
  "HIDDEN_VALUE",
  "STRONG_VALUE",
  "BUY",
]);

function actionConflictsWithVerdict(action: string | undefined, verdict: PrimaryVerdict): boolean {
  if (!action) return false;
  const u = action.toUpperCase();
  if (verdict === "BUY READY") return WAIT_ACTIONS.has(u) || u.includes("WAIT");
  if (verdict === "WAIT" || verdict === "AVOID") {
    return BUY_ACTIONS.has(u) || u.includes("BUY");
  }
  return false;
}

function resolveExecutionPosture(
  product: QuantProduct,
  verdict: PrimaryVerdict,
  scopedBrief: DecisionBriefDTO | null
): CoherentExecutionPosture | null {
  const aligned = verdictPosture(verdict);
  const action = product.qiBuyingDecision?.action;
  if (product.qiBuyingDecision && !actionConflictsWithVerdict(action, verdict)) {
    const line = product.qiBuyingDecision.analystLine?.trim();
    if (line) {
      return {
        label: aligned.label,
        line: clipLine(line, 180),
      };
    }
  }

  if (scopedBrief) {
    const reasoning =
      verdict === "BUY READY"
        ? scopedBrief.buyReasoning
        : verdict === "COMPARE"
          ? scopedBrief.compareReasoning
          : scopedBrief.waitReasoning;
    if (reasoning) {
      return { label: aligned.label, line: clipLine(reasoning, 180) };
    }
  }

  if (product.qiBuyingDecision?.analystLine && !actionConflictsWithVerdict(action, verdict)) {
    return {
      label: aligned.label,
      line: clipLine(product.qiBuyingDecision.analystLine, 180),
    };
  }

  return aligned;
}

function buildProductScopedSignals(
  product: QuantProduct,
  list: QuantProduct[],
  assessment: ProductTrustDiscountAssessment | null
): string[] {
  const { pros, cons } = getProsAndCons(product, list);
  const warnings: string[] = [];
  if (assessment?.suspiciousSeller) warnings.push("Seller verification recommended before checkout.");
  if (assessment?.fakeDiscountRisk === "high") {
    warnings.push("Discount authenticity needs verification.");
  }
  if (assessment?.fakeDiscountRisk === "medium") {
    warnings.push("Markdown depth may be overstated.");
  }
  return uniqueLines([...warnings, ...pros.slice(0, 2), ...cons.slice(0, 1)]).slice(0, 3);
}

function buildProductScopedSmartLines(
  product: QuantProduct,
  list: QuantProduct[],
  verdict: PrimaryVerdict,
  assessment: ProductTrustDiscountAssessment | null
): string[] {
  const trust = getStoreTrustScore(product.store);
  const lines: string[] = [];
  if (verdict === "COMPARE") {
    lines.push("Alternative option — compare against the tray lead before buying.");
  }
  if (assessment?.fakeDiscountRisk === "high") {
    lines.push("Verify original price before acting on this discount.");
  }
  if (trust >= 78) lines.push("Seller trust profile looks reliable for this listing.");
  else if (trust < 52) lines.push("Seller trust is below the usual checkout threshold.");
  const { cons } = getProsAndCons(product, list);
  if (cons[0]) lines.push(cons[0]);
  return uniqueLines(lines).slice(0, 3);
}

function buildDrawerSynthesis(
  verdict: PrimaryVerdict,
  reasonLine: string,
  scopedBrief: DecisionBriefDTO | null,
  product: QuantProduct
): string {
  const activated = scopedBrief
    ? resolveActivatedBriefPresentation(scopedBrief, verdict)
    : null;
  return clipLine(
    activated?.reasoning ||
      reasonLine ||
      product.qiReason ||
      product.qiPsychology ||
      "",
    280
  );
}

export function buildTrayCoherenceContext(args: {
  searchMeta: Record<string, unknown> | null | undefined;
  decisionBrief: DecisionBriefDTO | null;
}): DecisionCoherenceTrayContext {
  const meta = args.searchMeta ?? {};
  return {
    verdictIntelligence: (meta.verdictIntelligence as VerdictIntelligenceMeta | null) ?? null,
    decisionBrief: args.decisionBrief,
    rankingEngine: (meta.rankingEngine as RankingEngineMeta | null) ?? null,
    executedRanking: (meta.executedRanking as ExecutedRankingMeta | null) ?? null,
    rankingSignals: (meta.rankingSignals as RankingSignalsMeta | null) ?? null,
    productRanking: (meta.productRanking as ProductRankingMeta | null) ?? null,
    verdictSurface: {
      verdictIntelligence: (meta.verdictIntelligence as VerdictSurfaceContext["verdictIntelligence"]) ?? null,
      rankingEngine: (meta.rankingEngine as VerdictSurfaceContext["rankingEngine"]) ?? null,
      decisionReadiness: (meta.decisionReadiness as VerdictSurfaceContext["decisionReadiness"]) ?? null,
      intentConfidence: (meta.intentConfidence as VerdictSurfaceContext["intentConfidence"]) ?? null,
      valueIntelligence: (meta.valueIntelligence as VerdictSurfaceContext["valueIntelligence"]) ?? null,
    },
    marketContext: {
      decisionBrief: args.decisionBrief,
      valueIntelligence: (meta.valueIntelligence as MarketContextInput["valueIntelligence"]) ?? null,
      realDiscount: (meta.realDiscount as MarketContextInput["realDiscount"]) ?? null,
      retailerTrust: (meta.retailerTrust as MarketContextInput["retailerTrust"]) ?? null,
      reviewCredibility: (meta.reviewCredibility as MarketContextInput["reviewCredibility"]) ?? null,
      decisionReadiness: (meta.decisionReadiness as MarketContextInput["decisionReadiness"]) ?? null,
      rankingEngine: (meta.rankingEngine as MarketContextInput["rankingEngine"]) ?? null,
      verdictIntelligence: (meta.verdictIntelligence as MarketContextInput["verdictIntelligence"]) ?? null,
    },
    phase93: (meta.phase93TrustDiscount as Phase93TrustDiscountMeta | null) ?? null,
  };
}

/** Activate one coherent buyer decision for a product (existing slots only). */
export function activateProductDecisionCoherence(args: {
  product: QuantProduct;
  list: QuantProduct[];
  rank: number;
  tray: DecisionCoherenceTrayContext;
}): CoherentProductDecision {
  const { product, list, rank, tray } = args;
  const institutionalVerdict = resolveInstitutionalVerdict(tray.verdictIntelligence);
  const phase93Assessment = findPhase93Assessment(tray.phase93, product);
  const lead = isLeadProduct({ product, rank, decisionBrief: tray.decisionBrief });
  const verdict = resolveCoherentProductVerdict({
    institutionalVerdict,
    isLeadProduct: lead,
    phase93Assessment,
  });
  const scopedBrief = bindProductDecisionBrief(tray.decisionBrief, product, lead);
  const discountTruth = activateDiscountTruth({ product, list, phase93Assessment });
  const groundedMarket = groundMarketContextInput(
    { ...tray.marketContext, decisionBrief: scopedBrief, discountTruth },
    phase93Assessment,
    institutionalVerdict
  );

  const fallbackReason =
    tray.verdictIntelligence?.rationale?.trim() ||
    tray.verdictIntelligence?.warnings?.[0] ||
    tray.verdictIntelligence?.strengths?.[0] ||
    "";

  const optimizedSurface = optimizeVerdictSurface({
    verdict,
    fallbackReason,
    decisionBrief: scopedBrief,
    ...tray.verdictSurface,
  });

  const activatedMarket = activateMarketContext(groundedMarket);
  const activatedRanking = activateRankingRationale({
    product,
    rank,
    isLeadProduct: lead,
    rankingEngine: tray.rankingEngine,
    executedRanking: tray.executedRanking,
    rankingSignals: tray.rankingSignals,
    productRanking: tray.productRanking,
  });

  let summaryLines = mergeRankingRationaleSummary(
    optimizedSurface.summaryLines,
    activatedRanking,
    2
  );
  summaryLines = mergeMarketContextSummary(summaryLines, activatedMarket, 2);
  const rankingRationaleLine = activatedRanking?.cardLine ?? "";
  const drawerRankingLine = activatedRanking?.drawerLine ?? "";

  const activatedBrief = scopedBrief
    ? resolveActivatedBriefPresentation(scopedBrief, verdict)
    : null;

  const expandedSignals =
    activatedBrief?.topSignals.length || activatedBrief?.riskSignals.length
      ? uniqueLines([...activatedBrief.topSignals, ...activatedBrief.riskSignals]).slice(0, 3)
      : buildProductScopedSignals(product, list, phase93Assessment);

  const smartDecisionLines = activatedBrief
    ? mergeRankingRationaleExpandedLines(
        mergeMarketContextExpandedLines(
          uniqueLines([
            activatedBrief.reasoning,
            activatedBrief.marketStatus,
            activatedBrief.confidenceExplanation,
          ]).slice(0, 3),
          activatedMarket,
          3
        ),
        activatedRanking,
        3
      )
    : mergeRankingRationaleExpandedLines(
        mergeMarketContextExpandedLines(
          buildProductScopedSmartLines(product, list, verdict, phase93Assessment),
          activatedMarket,
          3
        ),
        activatedRanking,
        3
      );

  const drawerDecisionLane = clipLine(
    activatedMarket?.timingFavorable ||
      activatedMarket?.waitRecommended ||
      optimizedSurface.verdictReason ||
      fallbackReason
  );

  const trust = getStoreTrustScore(product.store);
  const trustTier = trustTierFromScore(trust, phase93Assessment?.suspiciousSeller);

  return {
    verdict,
    reasonLine: optimizedSurface.verdictReason || fallbackReason,
    alignmentScore: primaryVerdictAlignment(verdict),
    trustMicro: trustMicroLabel(trustTier),
    decisionBrief: scopedBrief,
    marketContext: groundedMarket,
    optimizedSurface,
    activatedMarket,
    summaryLines,
    expandedSignals,
    smartDecisionLines,
    rankingRationaleLine,
    drawerRankingLine,
    drawerDecisionLane,
    drawerStanceLabel: stanceLabel(verdict),
    drawerSynthesis: buildDrawerSynthesis(verdict, optimizedSurface.verdictReason, scopedBrief, product),
    executionPosture: resolveExecutionPosture(product, verdict, scopedBrief),
    isLeadProduct: lead,
    discountTruth,
  };
}
