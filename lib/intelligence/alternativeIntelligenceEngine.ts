/**
 * Phase 10.2 — Alternative Intelligence Engine.
 * Surfaces 2–4 tray alternatives with institutional classification.
 * No tray reorder, no external APIs, no SerpAPI.
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { ExplainabilityMeta } from "@/lib/intelligence/explainabilityEngine";
import type { Phase93TrustDiscountMeta, ProductTrustDiscountAssessment } from "@/lib/intelligence/phase93TrustDiscountHardening";
import type { Phase95CommerceMemoryMeta } from "@/lib/intelligence/phase95CommerceMemory";
import type { ComparisonIntelligenceResult } from "@/lib/intelligence/recommendationClassification";
import type { QueryIntelligenceMeta } from "@/lib/search/phase94QueryIntelligence";
import type { VerdictIntelligenceMeta } from "@/lib/intelligence/verdictEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";

export type AlternativeClassification =
  | "safer_alternative"
  | "better_value"
  | "premium_upgrade"
  | "budget_pick"
  | "avoid_replacement";

export type AlternativeCandidate = {
  classification: AlternativeClassification;
  label: string;
  title: string;
  store: string;
  link: string;
  price: number | null;
  trustScore: number;
  confidence: number;
  reason: string;
};

export type AlternativeIntelligenceMeta = {
  version: "phase10.2-v1";
  primaryLink: string | null;
  alternatives: AlternativeCandidate[];
  summary: string;
  count: number;
};

export type AlternativeIntelligenceInput = {
  products: QuantProduct[];
  decisionBrief: DecisionBriefDTO | null;
  phase93: Phase93TrustDiscountMeta;
  comparison?: ComparisonIntelligenceResult;
  queryIntelligence?: QueryIntelligenceMeta;
  commerceMemory?: Phase95CommerceMemoryMeta;
  verdictIntelligence?: VerdictIntelligenceMeta;
  explainability?: ExplainabilityMeta;
};

const CLASS_DISPLAY: Record<AlternativeClassification, string> = {
  safer_alternative: "Safer Alternative",
  better_value: "Better Value",
  premium_upgrade: "Premium Upgrade",
  budget_pick: "Budget Pick",
  avoid_replacement: "Avoid",
};

const AGGREGATOR_RX =
  /\b(fruugo|ubuy|wish|temu|aliexpress|dhgate|banggood|alibaba|joom|lightinthebox)\b/i;

const MIN_TRUST = 55;
const TRUSTED = 68;
const HIGH_TRUST = 78;

function median(nums: number[]): number {
  const s = [...nums].filter((n) => n > 0).sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function assessmentFor(
  link: string,
  phase93: Phase93TrustDiscountMeta
): ProductTrustDiscountAssessment | null {
  return phase93.trayAssessments.find((a) => a.link === link) ?? null;
}

function isRisky(assessment: ProductTrustDiscountAssessment | null, store: string): boolean {
  if (!assessment) return AGGREGATOR_RX.test(store) && getStoreTrustScore(store) < 72;
  return (
    assessment.suspiciousSeller ||
    assessment.fakeDiscountRisk === "high" ||
    assessment.priceAnomaly === "suspicious_low" ||
    assessment.trustScore < MIN_TRUST
  );
}

function classifyProduct(args: {
  product: QuantProduct;
  pick: QuantProduct | null;
  pickTrust: number;
  pickPrice: number;
  medPrice: number;
  assessment: ProductTrustDiscountAssessment | null;
  comparison?: ComparisonIntelligenceResult;
  valueIntent: boolean;
  premiumIntent: boolean;
  budgetIntent: boolean;
}): AlternativeClassification {
  const { product, pick, pickTrust, pickPrice, medPrice, assessment, comparison, valueIntent, premiumIntent, budgetIntent } =
    args;
  const trust = assessment?.trustScore ?? getStoreTrustScore(product.store);
  const price = product.price > 0 ? product.price : 0;

  if (isRisky(assessment, product.store)) return "avoid_replacement";

  if (comparison?.bestValue?.link === product.link) return "better_value";
  if (comparison?.bestBudget?.link === product.link) return "budget_pick";
  if (comparison?.bestPremium?.link === product.link) return "premium_upgrade";

  if (pick) {
    if (trust >= pickTrust + 8 && trust >= TRUSTED && assessment?.suspiciousSeller === false) {
      if (price <= pickPrice * 1.15 || trust >= HIGH_TRUST) return "safer_alternative";
    }
    if (valueIntent && price > 0 && pickPrice > 0 && price <= pickPrice * 0.92 && trust >= TRUSTED) {
      return "better_value";
    }
    if (budgetIntent && price > 0 && (medPrice <= 0 || price <= medPrice * 0.88) && trust >= MIN_TRUST) {
      return "budget_pick";
    }
    if (premiumIntent && price >= pickPrice * 1.2 && trust >= pickTrust && trust >= TRUSTED) {
      return "premium_upgrade";
    }
    if (price > 0 && pickPrice > 0 && price < pickPrice * 0.95 && trust >= pickTrust - 5) {
      return "better_value";
    }
    if (price > medPrice * 1.25 && trust >= HIGH_TRUST && premiumIntent) return "premium_upgrade";
    if (trust >= HIGH_TRUST && pickTrust < HIGH_TRUST) return "safer_alternative";
  }

  if (budgetIntent && price > 0 && medPrice > 0 && price <= medPrice * 0.85) return "budget_pick";
  if (valueIntent && trust >= TRUSTED) return "better_value";
  return trust >= TRUSTED ? "safer_alternative" : "better_value";
}

function reasonFor(classification: AlternativeClassification, trust: number, price: number, pickPrice: number): string {
  switch (classification) {
    case "avoid_replacement":
      return "Elevated seller or discount risk — not recommended as a substitute.";
    case "safer_alternative":
      return `Higher-trust retailer option (trust ${trust}) with comparable positioning.`;
    case "better_value":
      return pickPrice > 0 && price < pickPrice
        ? `Stronger price-to-quality balance versus the primary pick.`
        : `Competitive value profile within this tray.`;
    case "premium_upgrade":
      return `Higher-tier option with stronger quality signals at ${price > 0 ? `€${Math.round(price)}` : "premium pricing"}.`;
    case "budget_pick":
      return `Lower price point while remaining within acceptable trust bounds.`;
    default:
      return "Alternative evaluated from current tray listings.";
  }
}

function confidenceFor(
  classification: AlternativeClassification,
  assessment: ProductTrustDiscountAssessment | null,
  trust: number
): number {
  let score = 58;
  if (assessment) score = Math.round(assessment.retailerConfidence * 0.65 + trust * 0.25);
  if (classification === "avoid_replacement") score = Math.min(score, 72);
  if (classification === "safer_alternative" && trust >= HIGH_TRUST) score += 8;
  if (classification === "better_value") score += 4;
  return Math.min(92, Math.max(42, score));
}

function buildCandidate(
  product: QuantProduct,
  classification: AlternativeClassification,
  pickPrice: number,
  assessment: ProductTrustDiscountAssessment | null
): AlternativeCandidate {
  const trust = assessment?.trustScore ?? getStoreTrustScore(product.store);
  const price = product.price > 0 ? product.price : null;
  return {
    classification,
    label: CLASS_DISPLAY[classification],
    title: product.title,
    store: product.store,
    link: product.link,
    price,
    trustScore: trust,
    confidence: confidenceFor(classification, assessment, trust),
    reason: reasonFor(classification, trust, product.price, pickPrice),
  };
}

const CLASS_PRIORITY: AlternativeClassification[] = [
  "better_value",
  "safer_alternative",
  "budget_pick",
  "premium_upgrade",
  "avoid_replacement",
];

function buildSummary(alternatives: AlternativeCandidate[]): string {
  if (!alternatives.length) return "No meaningful alternatives identified in the current tray.";
  const counts = new Map<AlternativeClassification, number>();
  for (const a of alternatives) {
    counts.set(a.classification, (counts.get(a.classification) ?? 0) + 1);
  }
  const parts = [...counts.entries()].map(([k, n]) => `${n} ${CLASS_DISPLAY[k].toLowerCase()}${n > 1 ? "s" : ""}`);
  return `${alternatives.length} alternative${alternatives.length > 1 ? "s" : ""} identified: ${parts.join(", ")}.`;
}

/** Build alternative intelligence from existing tray + pipeline meta. */
export function buildAlternativeIntelligence(input: AlternativeIntelligenceInput): AlternativeIntelligenceMeta {
  const primaryLink = input.decisionBrief?.recommendation.link ?? null;
  if (!input.products.length || !primaryLink) {
    return {
      version: "phase10.2-v1",
      primaryLink,
      alternatives: [],
      summary: "No primary recommendation — alternatives not evaluated.",
      count: 0,
    };
  }

  const pickProduct =
    input.products.find((p) => p.link === primaryLink) ?? input.products[0] ?? null;
  const pickAssessment = assessmentFor(primaryLink, input.phase93);
  const pickTrust = pickAssessment?.trustScore ?? getStoreTrustScore(pickProduct?.store ?? "");
  const pickPrice = pickProduct?.price ?? 0;
  const priced = input.products.filter((p) => p.price > 0);
  const medPrice = median(priced.map((p) => p.price));

  const priceIntent = input.queryIntelligence?.detectedIntent.priceIntent;
  const valueIntent =
    priceIntent === "value" ||
    priceIntent === "budget" ||
    priceIntent === "discount" ||
    input.verdictIntelligence?.verdict === "BEST VALUE";
  const premiumIntent =
    priceIntent === "premium" || input.verdictIntelligence?.verdict === "PREMIUM PICK";
  const budgetIntent = priceIntent === "budget" || priceIntent === "discount";

  const pool = input.products
    .slice(0, 16)
    .filter((p) => p.link !== primaryLink)
    .map((p) => {
      const assessment = assessmentFor(p.link, input.phase93);
      const classification = classifyProduct({
        product: p,
        pick: pickProduct,
        pickTrust,
        pickPrice,
        medPrice,
        assessment,
        comparison: input.comparison,
        valueIntent,
        premiumIntent,
        budgetIntent,
      });
      return buildCandidate(p, classification, pickPrice, assessment);
    });

  const selected: AlternativeCandidate[] = [];
  const seenLinks = new Set<string>();

  for (const cls of CLASS_PRIORITY) {
    if (selected.length >= 4) break;
    const match = pool.find((c) => c.classification === cls && !seenLinks.has(c.link));
    if (!match) continue;
    selected.push(match);
    seenLinks.add(match.link);
  }

  for (const c of pool) {
    if (selected.length >= 4) break;
    if (seenLinks.has(c.link)) continue;
    if (c.classification === "avoid_replacement" && selected.some((s) => s.classification === "avoid_replacement")) {
      continue;
    }
    selected.push(c);
    seenLinks.add(c.link);
  }

  const alternatives = selected.slice(0, 4);
  if (alternatives.length < 2 && pool.length >= 2) {
    for (const c of pool) {
      if (alternatives.length >= 2) break;
      if (alternatives.some((a) => a.link === c.link)) continue;
      alternatives.push(c);
    }
  }

  return {
    version: "phase10.2-v1",
    primaryLink,
    alternatives: alternatives.slice(0, 4),
    summary: buildSummary(alternatives),
    count: alternatives.length,
  };
}

function briefAlternativesFromMeta(meta: AlternativeIntelligenceMeta): DecisionBriefDTO["alternatives"] {
  return meta.alternatives
    .filter((a) => a.classification !== "avoid_replacement")
    .slice(0, 3)
    .map((a) => ({
      label: a.label,
      title: a.title,
      store: a.store,
      link: a.link,
    }));
}

/** Post-explainability alternative pass — does not reorder products or change verdict. */
export function applyAlternativeIntelligence(input: AlternativeIntelligenceInput): {
  meta: AlternativeIntelligenceMeta;
  decisionBrief: DecisionBriefDTO | null;
  products: QuantProduct[];
} {
  const meta = buildAlternativeIntelligence(input);
  const products = input.products;

  if (!input.decisionBrief) {
    return { meta, decisionBrief: null, products };
  }

  const positiveAlts = briefAlternativesFromMeta(meta);
  const existing = input.decisionBrief.alternatives ?? [];
  const merged: DecisionBriefDTO["alternatives"] = [];
  const seen = new Set<string>();

  for (const a of [...positiveAlts, ...existing]) {
    if (seen.has(a.link)) continue;
    seen.add(a.link);
    merged.push(a);
    if (merged.length >= 3) break;
  }

  const decisionBrief: DecisionBriefDTO = {
    ...input.decisionBrief,
    alternatives: merged.length ? merged : existing,
    alternativesSummary: meta.summary,
  };

  return { meta, decisionBrief, products };
}
