/**
 * Phase 10.0 — Verdict Intelligence Engine.
 * Deterministic institutional purchase verdict from existing tray signals only.
 * No ranking mutation, no external APIs, no SerpAPI.
 */

import { hardCategoryMismatch } from "@/lib/commerce/queryCategoryGuard";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { DiscountIntelligenceResult } from "@/lib/intelligence/discountIntelligenceLayer";
import type { Phase93TrustDiscountMeta, ProductTrustDiscountAssessment } from "@/lib/intelligence/phase93TrustDiscountHardening";
import type { Phase95CommerceMemoryMeta } from "@/lib/intelligence/phase95CommerceMemory";
import type { ComparisonIntelligenceResult } from "@/lib/intelligence/recommendationClassification";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { ExtractedSearchIntent } from "@/lib/search/intentExtractionEngine";
import type { Phase92TrayIntegrityMeta } from "@/lib/search/phase92TrayIntegrity";
import type { QueryIntelligenceMeta } from "@/lib/search/phase94QueryIntelligence";
import type { SparseResultAssessment } from "@/lib/search/sparseResultIntelligence";
import type { TrustRankingMeta } from "@/lib/search/searchIntelligenceUpgrade";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";

export type CommerceVerdict =
  | "STRONG BUY"
  | "BUY READY"
  | "BEST VALUE"
  | "PREMIUM PICK"
  | "CONSIDER"
  | "WAIT"
  | "AVOID";

export type VerdictIntelligenceMeta = {
  version: "phase10-v1";
  verdict: CommerceVerdict;
  confidence: number;
  rationale: string;
  strengths: string[];
  warnings: string[];
  factorTrace: Record<string, number | boolean | string>;
};

export type VerdictIntelligenceInput = {
  query: string;
  products: QuantProduct[];
  decisionBrief: DecisionBriefDTO | null;
  phase93: Phase93TrustDiscountMeta;
  phase92?: Phase92TrayIntegrityMeta;
  queryIntelligence?: QueryIntelligenceMeta;
  commerceMemory?: Phase95CommerceMemoryMeta;
  comparison?: ComparisonIntelligenceResult;
  intent: ExtractedSearchIntent;
  canonicalQuery?: CanonicalQueryContract;
  sparse?: SparseResultAssessment;
  trustRanking?: TrustRankingMeta;
};

const RATIONALE: Record<CommerceVerdict, string> = {
  "STRONG BUY":
    "High-confidence purchase opportunity supported by trust, pricing and retailer quality signals.",
  "BUY READY": "Product clears all major quality and trust checks.",
  "BEST VALUE": "Strongest value proposition among evaluated options.",
  "PREMIUM PICK": "Premium option with quality leadership at an acceptable tier price.",
  CONSIDER: "Mixed strengths across trust, pricing, and market signals — compare before committing.",
  WAIT: "Current market conditions do not support an immediate purchase.",
  AVOID: "Risk profile exceeds acceptable purchase thresholds.",
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function pickAssessment(
  brief: DecisionBriefDTO | null,
  phase93: Phase93TrustDiscountMeta,
  products: QuantProduct[]
): ProductTrustDiscountAssessment | null {
  if (!brief) return phase93.trayAssessments[0] ?? null;
  const byLink = phase93.trayAssessments.find((a) => a.link === brief.recommendation.link);
  if (byLink) return byLink;
  const top = products[0];
  if (!top) return null;
  return (
    phase93.trayAssessments.find((a) => a.link === top.link) ??
    phase93.trayAssessments[0] ??
    null
  );
}

function inventoryStable(p: QuantProduct | undefined): boolean {
  if (!p) return true;
  const avail = (p.availability ?? "").toLowerCase();
  if (/out\s*of\s*stock|unavailable|sold\s*out/i.test(avail)) return false;
  return true;
}

type FactorSnapshot = {
  trustScore: number;
  retailerConfidence: number;
  fakeDiscountRisk: string;
  suspiciousSeller: boolean;
  priceAnomaly: string;
  discountAuthentic: boolean;
  verifiedDiscountOnPick: boolean;
  rankingConfidence: number;
  queryConfidence: number;
  memoryConfidence: number;
  categoryOk: boolean;
  compareIntegrityOk: boolean;
  sparseTray: boolean;
  inventoryStable: boolean;
  intentPremium: boolean;
  intentValue: boolean;
  exactSkuMode: boolean;
  pickIsBestValue: boolean;
  pickIsPremium: boolean;
  trustRankingApplied: boolean;
};

function buildFactorSnapshot(args: VerdictIntelligenceInput): FactorSnapshot {
  const { query, products, decisionBrief, phase93, phase92, queryIntelligence, commerceMemory, comparison, intent, canonicalQuery, sparse, trustRanking } = args;
  const pick = pickAssessment(decisionBrief, phase93, products);
  const recLink = decisionBrief?.recommendation.link;
  const recTitle = decisionBrief?.recommendation.title ?? products[0]?.title ?? "";
  const recProduct = products.find((p) => p.link === recLink) ?? products[0];

  const verifiedDiscountOnPick = Boolean(
    phase93.discountIntelligence.bestVerifiedDiscount &&
      recLink &&
      phase93.discountIntelligence.bestVerifiedDiscount.link === recLink
  );

  const priceIntent = queryIntelligence?.detectedIntent.priceIntent;
  const intentPremium =
    priceIntent === "premium" ||
    (canonicalQuery?.intent.premium01 ?? 0) >= 0.56 ||
    intent.userGoal === "premium_purchase" ||
    /\b(premium|luxury|flagship)\b/i.test(query);
  const intentValue =
    priceIntent === "value" ||
    priceIntent === "budget" ||
    priceIntent === "discount" ||
    intent.budgetConstraints.bestValue ||
    intent.userGoal === "best_value" ||
    /\b(best\s+value|cheapest|under\s+\d|budget)\b/i.test(query);

  return {
    trustScore: pick?.trustScore ?? getStoreTrustScore(decisionBrief?.recommendation.store ?? ""),
    retailerConfidence: pick?.retailerConfidence ?? 50,
    fakeDiscountRisk: pick?.fakeDiscountRisk ?? "low",
    suspiciousSeller: pick?.suspiciousSeller ?? false,
    priceAnomaly: pick?.priceAnomaly ?? "none",
    discountAuthentic: phase93.verdictConfidence.discountAuthentic,
    verifiedDiscountOnPick,
    rankingConfidence: decisionBrief?.confidence ?? phase93.verdictConfidence.score,
    queryConfidence: queryIntelligence?.confidence ?? 0.45,
    memoryConfidence: commerceMemory?.confidence ?? 0,
    categoryOk: recTitle ? !hardCategoryMismatch(query, recTitle) : true,
    compareIntegrityOk: phase92?.compareIntegrity.bothEntitiesRepresented !== false,
    sparseTray: Boolean(sparse?.sparse || decisionBrief?.sparseTrayWarning),
    inventoryStable: inventoryStable(recProduct),
    intentPremium,
    intentValue,
    exactSkuMode:
      queryIntelligence?.detectedIntent.skuIntent === "exact" ||
      canonicalQuery?.marketMode === "exact_sku",
    pickIsBestValue: Boolean(comparison?.bestValue?.link && comparison.bestValue.link === recLink),
    pickIsPremium: Boolean(comparison?.bestPremium?.link && comparison.bestPremium.link === recLink),
    trustRankingApplied: trustRanking?.applied ?? false,
  };
}

function selectVerdict(f: FactorSnapshot): CommerceVerdict {
  const severeRisk =
    f.suspiciousSeller &&
    (f.fakeDiscountRisk === "high" || f.priceAnomaly === "suspicious_low");
  const hardAvoid =
    severeRisk ||
    f.trustScore < 52 ||
    (f.fakeDiscountRisk === "high" && f.trustScore < 72);

  if (hardAvoid) {
    if (f.exactSkuMode && f.trustScore >= 78 && !f.suspiciousSeller && f.fakeDiscountRisk !== "high") {
      return f.rankingConfidence >= 70 ? "BUY READY" : "CONSIDER";
    }
    return "AVOID";
  }

  if (f.sparseTray || !f.inventoryStable) return "WAIT";
  if (f.priceAnomaly === "premium_outlier" && f.intentValue) return "WAIT";
  if (f.intentValue && f.fakeDiscountRisk === "high") return "WAIT";

  if (f.intentPremium && f.trustScore >= 68 && f.retailerConfidence >= 62 && !f.suspiciousSeller) {
    if (f.pickIsPremium || f.trustScore >= 74) return "PREMIUM PICK";
  }

  if (
    f.intentValue &&
    f.pickIsBestValue &&
    f.trustScore >= 62 &&
    !f.suspiciousSeller &&
    f.categoryOk
  ) {
    return "BEST VALUE";
  }

  const strongBuyEligible =
    f.trustScore >= 78 &&
    f.retailerConfidence >= 75 &&
    !f.suspiciousSeller &&
    f.fakeDiscountRisk === "low" &&
    f.categoryOk &&
    f.rankingConfidence >= 72 &&
    f.priceAnomaly !== "suspicious_low";

  if (strongBuyEligible && (f.verifiedDiscountOnPick || f.discountAuthentic || f.retailerConfidence >= 80)) {
    return "STRONG BUY";
  }

  if (
    f.intentValue &&
    f.trustScore >= 62 &&
    !f.suspiciousSeller &&
    (f.verifiedDiscountOnPick || f.discountAuthentic)
  ) {
    return "BEST VALUE";
  }

  if (
    f.trustScore >= 68 &&
    f.retailerConfidence >= 62 &&
    !f.suspiciousSeller &&
    f.fakeDiscountRisk !== "high" &&
    f.priceAnomaly !== "suspicious_low" &&
    f.categoryOk
  ) {
    return "BUY READY";
  }

  if (f.trustScore >= 55 && !f.suspiciousSeller && f.fakeDiscountRisk !== "high") {
    return "CONSIDER";
  }

  return "WAIT";
}

function computeConfidence(f: FactorSnapshot, verdict: CommerceVerdict): number {
  let score = f.rankingConfidence * 0.45 + f.retailerConfidence * 0.35 + f.queryConfidence * 100 * 0.08 + f.memoryConfidence * 100 * 0.05;

  if (verdict === "STRONG BUY") score += 6;
  if (verdict === "BUY READY") score += 3;
  if (verdict === "AVOID") score = Math.min(score, 42);
  if (verdict === "WAIT") score = Math.min(score, 58);
  if (verdict === "CONSIDER") score = Math.min(score, 68);

  if (f.suspiciousSeller) score -= 20;
  if (f.fakeDiscountRisk === "high") score -= 18;
  if (f.fakeDiscountRisk === "medium") score -= 6;
  if (f.priceAnomaly === "suspicious_low") score -= 14;
  if (!f.categoryOk) score -= 12;
  if (!f.compareIntegrityOk) score -= 5;
  if (f.sparseTray) score -= 10;
  if (!f.inventoryStable) score -= 8;
  if (f.discountAuthentic) score += 4;
  if (f.verifiedDiscountOnPick) score += 3;

  return clamp(Math.round(score), 28, 96);
}

function buildStrengths(f: FactorSnapshot, verdict: CommerceVerdict): string[] {
  const out: string[] = [];
  if (f.trustScore >= 78) out.push("Trusted retailer and listing quality.");
  if (f.retailerConfidence >= 75) out.push("High retailer confidence score.");
  if (f.discountAuthentic || f.verifiedDiscountOnPick) out.push("Discount signal verified against tray peers.");
  if (f.categoryOk) out.push("Listing matches query category intent.");
  if (f.compareIntegrityOk) out.push("Compare entities represented in results.");
  if (f.memoryConfidence >= 0.72) out.push("Aligned with session shopping preferences.");
  if (verdict === "BEST VALUE" && f.intentValue) out.push("Value intent satisfied for this query.");
  if (verdict === "PREMIUM PICK" && f.intentPremium) out.push("Premium tier leadership for stated intent.");
  return out.slice(0, 4);
}

function buildWarnings(f: FactorSnapshot): string[] {
  const out: string[] = [];
  if (f.suspiciousSeller) out.push("Seller signals require verification before checkout.");
  if (f.fakeDiscountRisk === "high") out.push("Discount anchor may be inflated versus peer listings.");
  if (f.fakeDiscountRisk === "medium") out.push("Discount authenticity is uncertain.");
  if (f.priceAnomaly === "suspicious_low") out.push("Price sits far below peer median with thin proof.");
  if (f.priceAnomaly === "deep_discount") out.push("Deep discount warrants price sanity check.");
  if (!f.categoryOk) out.push("Category alignment with query is weak.");
  if (f.sparseTray) out.push("Limited listings in this scan — treat as directional.");
  if (!f.inventoryStable) out.push("Availability signals are weak or out of stock.");
  if (!f.compareIntegrityOk) out.push("Compare coverage across entities is incomplete.");
  return out.slice(0, 4);
}

function buildFactorTrace(f: FactorSnapshot): Record<string, number | boolean | string> {
  return {
    trustScore: f.trustScore,
    retailerConfidence: f.retailerConfidence,
    fakeDiscountRisk: f.fakeDiscountRisk,
    suspiciousSeller: f.suspiciousSeller,
    priceAnomaly: f.priceAnomaly,
    discountAuthentic: f.discountAuthentic,
    verifiedDiscountOnPick: f.verifiedDiscountOnPick,
    rankingConfidence: f.rankingConfidence,
    queryConfidence: Math.round(f.queryConfidence * 100) / 100,
    memoryConfidence: Math.round(f.memoryConfidence * 100) / 100,
    categoryOk: f.categoryOk,
    compareIntegrityOk: f.compareIntegrityOk,
    sparseTray: f.sparseTray,
    inventoryStable: f.inventoryStable,
    exactSkuMode: f.exactSkuMode,
    intentPremium: f.intentPremium,
    intentValue: f.intentValue,
  };
}

function enhanceDecisionBrief(
  brief: DecisionBriefDTO | null,
  meta: VerdictIntelligenceMeta
): DecisionBriefDTO | null {
  if (!brief || meta.confidence < 62) return brief;
  const why = [meta.rationale, ...brief.why.filter((w) => w !== meta.rationale)].slice(0, 6);
  return { ...brief, why, confidence: Math.max(brief.confidence, meta.confidence) };
}

/** Build institutional verdict from consumed intelligence signals. */
export function buildVerdictIntelligence(input: VerdictIntelligenceInput): VerdictIntelligenceMeta {
  if (!input.products.length || !input.decisionBrief) {
    return {
      version: "phase10-v1",
      verdict: "WAIT",
      confidence: 32,
      rationale: RATIONALE.WAIT,
      strengths: [],
      warnings: ["Insufficient tray depth for a confident purchase verdict."],
      factorTrace: { emptyTray: true },
    };
  }

  const factors = buildFactorSnapshot(input);
  const verdict = selectVerdict(factors);
  const confidence = computeConfidence(factors, verdict);

  return {
    version: "phase10-v1",
    verdict,
    confidence,
    rationale: RATIONALE[verdict],
    strengths: buildStrengths(factors, verdict),
    warnings: buildWarnings(factors),
    factorTrace: buildFactorTrace(factors),
  };
}

/** Post-pipeline verdict pass — meta + decision brief only; never reorders products. */
export function applyVerdictIntelligence(input: VerdictIntelligenceInput): {
  meta: VerdictIntelligenceMeta;
  decisionBrief: DecisionBriefDTO | null;
  products: QuantProduct[];
} {
  const meta = buildVerdictIntelligence(input);
  return {
    meta,
    decisionBrief: enhanceDecisionBrief(input.decisionBrief, meta),
    products: input.products,
  };
}
