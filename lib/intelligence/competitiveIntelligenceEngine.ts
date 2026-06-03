/**
 * Phase 10.4 — Competitive Intelligence Engine.
 * Explains why the primary recommendation beats strongest tray alternatives.
 * Read-only meta layer — no tray reorder, no external APIs.
 */

import type { AlternativeCandidate, AlternativeIntelligenceMeta } from "@/lib/intelligence/alternativeIntelligenceEngine";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { ExplainabilityMeta } from "@/lib/intelligence/explainabilityEngine";
import type { MarketContextMeta } from "@/lib/intelligence/marketContextEngine";
import type {
  Phase93TrustDiscountMeta,
  ProductTrustDiscountAssessment,
} from "@/lib/intelligence/phase93TrustDiscountHardening";
import type { ComparisonIntelligenceResult } from "@/lib/intelligence/recommendationClassification";
import type { VerdictIntelligenceMeta } from "@/lib/intelligence/verdictEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";

export type CompetitiveProductRef = {
  link: string;
  title: string;
  store: string;
  price: number | null;
  trustScore: number;
  classification: string | null;
};

export type CompetitiveIntelligenceMeta = {
  version: "phase10.4-v1";
  primaryProduct: CompetitiveProductRef;
  strongestAlternatives: CompetitiveProductRef[];
  primaryAdvantages: string[];
  alternativeAdvantages: string[];
  tradeoffs: string[];
  decisiveFactors: string[];
  whyPrimaryWins: string;
  confidence: number;
};

export type CompetitiveIntelligenceInput = {
  products: QuantProduct[];
  decisionBrief: DecisionBriefDTO | null;
  phase93: Phase93TrustDiscountMeta;
  verdictIntelligence: VerdictIntelligenceMeta;
  explainability: ExplainabilityMeta;
  alternativeIntelligence: AlternativeIntelligenceMeta;
  comparison?: ComparisonIntelligenceResult;
  marketContext?: MarketContextMeta;
};

const VERSION = "phase10.4-v1" as const;
const COMPETITIVE_CLASSES = new Set([
  "safer_alternative",
  "better_value",
  "premium_upgrade",
  "budget_pick",
]);

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function assessmentFor(
  link: string,
  phase93: Phase93TrustDiscountMeta
): ProductTrustDiscountAssessment | null {
  return phase93.trayAssessments.find((a) => a.link === link) ?? null;
}

function productFor(link: string, products: QuantProduct[]): QuantProduct | null {
  return products.find((p) => p.link === link) ?? null;
}

function toRef(
  link: string,
  title: string,
  store: string,
  price: number | null,
  trustScore: number,
  classification: string | null = null
): CompetitiveProductRef {
  return { link, title, store, price, trustScore, classification };
}

function primaryRef(
  brief: DecisionBriefDTO,
  phase93: Phase93TrustDiscountMeta,
  products: QuantProduct[]
): CompetitiveProductRef {
  const link = brief.recommendation.link;
  const assessment = assessmentFor(link, phase93);
  const product = productFor(link, products);
  const trust =
    assessment?.trustScore ?? getStoreTrustScore(brief.recommendation.store);
  const price =
    brief.recommendation.price ??
    (product && product.price > 0 ? product.price : null);
  return toRef(link, brief.recommendation.title, brief.recommendation.store, price, trust, "primary");
}

function strongestAlternativesFromMeta(
  alt: AlternativeIntelligenceMeta,
  phase93: Phase93TrustDiscountMeta
): CompetitiveProductRef[] {
  const ranked = alt.alternatives
    .filter((a) => COMPETITIVE_CLASSES.has(a.classification))
    .sort((a, b) => b.confidence - a.confidence || b.trustScore - a.trustScore)
    .slice(0, 3);

  return ranked.map((a) => {
    const assessment = assessmentFor(a.link, phase93);
    return toRef(
      a.link,
      a.title,
      a.store,
      a.price,
      assessment?.trustScore ?? a.trustScore,
      a.classification
    );
  });
}

function verifiedOnPrimary(brief: DecisionBriefDTO, phase93: Phase93TrustDiscountMeta): boolean {
  const best = phase93.discountIntelligence.bestVerifiedDiscount;
  return best?.link === brief.recommendation.link;
}

function comparePrimaryVsAlt(args: {
  primary: CompetitiveProductRef;
  primaryAssessment: ProductTrustDiscountAssessment | null;
  alt: AlternativeCandidate;
  altAssessment: ProductTrustDiscountAssessment | null;
  comparison?: ComparisonIntelligenceResult;
  explainability: ExplainabilityMeta;
}): {
  primaryWins: string[];
  altWins: string[];
  tradeoffs: string[];
} {
  const { primary, primaryAssessment, alt, altAssessment, comparison, explainability } = args;
  const primaryWins: string[] = [];
  const altWins: string[] = [];
  const tradeoffs: string[] = [];

  const pTrust = primary.trustScore;
  const aTrust = alt.trustScore;
  const pPrice = primary.price ?? 0;
  const aPrice = alt.price ?? 0;

  if (pTrust >= aTrust + 6) {
    primaryWins.push(`Higher retailer trust (${pTrust} vs ${aTrust}) on ${primary.store}`);
  } else if (aTrust >= pTrust + 6) {
    altWins.push(`${alt.label} offers stronger trust (${aTrust} vs ${pTrust}) at ${alt.store}`);
  }

  if (
    primaryAssessment &&
    altAssessment &&
    primaryAssessment.retailerConfidence >= altAssessment.retailerConfidence + 8
  ) {
    primaryWins.push("Stronger retailer confidence and listing quality on the primary pick");
  }

  if (primaryAssessment?.fakeDiscountRisk === "low" && altAssessment?.fakeDiscountRisk !== "low") {
    primaryWins.push("More reliable discount evidence than the leading alternative");
  }
  if (altAssessment?.fakeDiscountRisk === "high") {
    primaryWins.push(`${alt.label} carries elevated fake-discount risk`);
  }

  if (pPrice > 0 && aPrice > 0 && pPrice < aPrice * 0.97) {
    primaryWins.push(`Competitive price (€${Math.round(pPrice)}) under alternative (€${Math.round(aPrice)})`);
  } else if (pPrice > 0 && aPrice > 0 && aPrice < pPrice * 0.92) {
    altWins.push(`${alt.label} is materially cheaper (€${Math.round(aPrice)} vs €${Math.round(pPrice)})`);
    tradeoffs.push(
      `Lower price at ${alt.store} trades off against primary trust and institutional ranking confidence`
    );
  }

  if (comparison?.bestOverall?.link === primary.link) {
    primaryWins.push("Ranked best overall in tray comparison intelligence");
  }
  if (comparison?.bestValue?.link === alt.link && alt.classification === "better_value") {
    altWins.push("Tray value leader — strongest raw price-to-quality ratio");
    if (primary.link !== alt.link) {
      tradeoffs.push("Value leader is cheaper but primary balances trust, intent, and checkout safety");
    }
  }

  if (explainability.recommendationBasis.trust >= 72 && explainability.recommendationBasis.retailer >= 70) {
    if (!primaryWins.some((w) => w.includes("trust"))) {
      primaryWins.push("Explainability trust and retailer scores favor the primary recommendation");
    }
  }

  if (alt.classification === "safer_alternative" && pTrust >= aTrust) {
    primaryWins.push("Primary matches or exceeds the safer alternative on trust while keeping top ranking");
  }
  if (alt.classification === "budget_pick" && pPrice > 0 && aPrice > 0 && pPrice > aPrice) {
    tradeoffs.push(`Budget option saves ~€${Math.round(pPrice - aPrice)} but with reduced composite ranking support`);
  }
  if (alt.classification === "premium_upgrade" && pPrice > 0 && aPrice > 0 && aPrice > pPrice) {
    altWins.push("Premium upgrade offers higher tier positioning at a higher price");
    tradeoffs.push("Premium upgrade trades higher spend for incremental quality signals");
  }

  return { primaryWins, altWins, tradeoffs };
}

function buildWhyPrimaryWins(
  primaryAdvantages: string[],
  alternativeAdvantages: string[],
  verdict: VerdictIntelligenceMeta,
  altCount: number
): string {
  if (!primaryAdvantages.length && !altCount) {
    return "Primary recommendation stands as the only evaluated listing in this tray.";
  }
  if (primaryAdvantages.length && alternativeAdvantages.length) {
    return `Primary wins on ${primaryAdvantages[0].replace(/\.$/, "")} while alternatives lead on ${alternativeAdvantages[0].replace(/\.$/, "")} — institutional verdict ${verdict.verdict} breaks the tie.`;
  }
  if (primaryAdvantages.length) {
    return `Primary recommendation leads because ${primaryAdvantages[0].replace(/\.$/, "")}, supported by verdict ${verdict.verdict}.`;
  }
  return `Institutional verdict ${verdict.verdict} and composite ranking keep the primary ahead despite ${alternativeAdvantages[0]?.replace(/\.$/, "") ?? "competitive alternatives"}.`;
}

function buildDecisiveFactors(
  primaryAdvantages: string[],
  tradeoffs: string[],
  verdict: VerdictIntelligenceMeta,
  explainability: ExplainabilityMeta
): string[] {
  const factors: string[] = [];
  const basis = explainability.recommendationBasis;

  if (basis.trust >= 70) factors.push("Trust-weighted ranking advantage");
  if (basis.retailer >= 68) factors.push("Retailer confidence on primary listing");
  if (basis.pricing >= 65) factors.push("Favorable pricing versus tray median");
  if (basis.intentMatch >= 62) factors.push("Intent alignment with query interpretation");
  if (verdict.confidence >= 70) factors.push(`High verdict confidence (${verdict.confidence})`);

  for (const a of primaryAdvantages.slice(0, 2)) {
    const short = a.length > 72 ? `${a.slice(0, 69)}…` : a;
    if (!factors.includes(short)) factors.push(short);
  }
  for (const t of tradeoffs.slice(0, 1)) {
    const short = t.length > 72 ? `${t.slice(0, 69)}…` : t;
    if (!factors.includes(short)) factors.push(short);
  }

  return [...new Set(factors)].slice(0, 5);
}

function computeConfidence(
  input: CompetitiveIntelligenceInput,
  altCount: number,
  primaryAdvantages: string[]
): number {
  const verdictConf = input.verdictIntelligence.confidence;
  const basis = input.explainability.recommendationBasis;
  const explainAvg = Math.round((basis.trust + basis.retailer + basis.intentMatch) / 3);
  let score = Math.round(verdictConf * 0.45 + explainAvg * 0.35 + input.phase93.verdictConfidence.score * 0.2);
  if (altCount >= 2) score += 6;
  if (primaryAdvantages.length >= 2) score += 4;
  if (input.marketContext && input.marketContext.confidence >= 55) score += 3;
  if (!input.decisionBrief) score = Math.min(score, 38);
  return clamp(score, 28, 94);
}

/** Build competitive intelligence meta from consumed pipeline signals. */
export function buildCompetitiveIntelligence(
  input: CompetitiveIntelligenceInput
): CompetitiveIntelligenceMeta {
  const emptyPrimary: CompetitiveProductRef = {
    link: "",
    title: "",
    store: "",
    price: null,
    trustScore: 0,
    classification: null,
  };

  if (!input.decisionBrief) {
    return {
      version: VERSION,
      primaryProduct: emptyPrimary,
      strongestAlternatives: [],
      primaryAdvantages: [],
      alternativeAdvantages: [],
      tradeoffs: [],
      decisiveFactors: [],
      whyPrimaryWins: "No primary recommendation available for competitive comparison.",
      confidence: 32,
    };
  }

  const brief = input.decisionBrief;
  const primary = primaryRef(brief, input.phase93, input.products);
  const primaryAssessment = assessmentFor(primary.link, input.phase93);
  const strongestAlternatives = strongestAlternativesFromMeta(
    input.alternativeIntelligence,
    input.phase93
  );

  const primaryAdvantages: string[] = [];
  const alternativeAdvantages: string[] = [];
  const tradeoffs: string[] = [];

  if (verifiedOnPrimary(brief, input.phase93)) {
    primaryAdvantages.push("Verified discount on the primary listing versus tray peers");
  }
  if (input.comparison?.bestOverall?.link === primary.link) {
    primaryAdvantages.push("Designated best-overall pick in comparison intelligence");
  }
  if (primaryAssessment && primaryAssessment.retailerConfidence >= 72) {
    primaryAdvantages.push(`Solid retailer confidence (${primaryAssessment.retailerConfidence})`);
  }
  if (primaryAssessment && !primaryAssessment.suspiciousSeller) {
    primaryAdvantages.push("No suspicious-seller flags on the primary retailer");
  }

  const altCandidates = input.alternativeIntelligence.alternatives.filter((a) =>
    COMPETITIVE_CLASSES.has(a.classification)
  );

  for (const alt of altCandidates.slice(0, 3)) {
    const altAssessment = assessmentFor(alt.link, input.phase93);
    const cmp = comparePrimaryVsAlt({
      primary,
      primaryAssessment,
      alt,
      altAssessment,
      comparison: input.comparison,
      explainability: input.explainability,
    });
    for (const w of cmp.primaryWins) {
      if (!primaryAdvantages.includes(w)) primaryAdvantages.push(w);
    }
    for (const w of cmp.altWins) {
      if (!alternativeAdvantages.includes(w)) alternativeAdvantages.push(w);
    }
    for (const t of cmp.tradeoffs) {
      if (!tradeoffs.includes(t)) tradeoffs.push(t);
    }
  }

  if (!primaryAdvantages.length) {
    primaryAdvantages.push(
      "Composite ranking and institutional verdict prioritize this listing over evaluated alternatives"
    );
  }

  const decisiveFactors = buildDecisiveFactors(
    primaryAdvantages,
    tradeoffs,
    input.verdictIntelligence,
    input.explainability
  );
  const whyPrimaryWins = buildWhyPrimaryWins(
    primaryAdvantages,
    alternativeAdvantages,
    input.verdictIntelligence,
    strongestAlternatives.length
  );
  const confidence = computeConfidence(
    input,
    strongestAlternatives.length,
    primaryAdvantages
  );

  return {
    version: VERSION,
    primaryProduct: primary,
    strongestAlternatives,
    primaryAdvantages: primaryAdvantages.slice(0, 6),
    alternativeAdvantages: alternativeAdvantages.slice(0, 5),
    tradeoffs: tradeoffs.slice(0, 4),
    decisiveFactors,
    whyPrimaryWins,
    confidence,
  };
}

/** Post-market-context competitive pass — meta + decision brief only. */
export function applyCompetitiveIntelligence(input: CompetitiveIntelligenceInput): {
  meta: CompetitiveIntelligenceMeta;
  decisionBrief: DecisionBriefDTO | null;
  products: QuantProduct[];
} {
  const meta = buildCompetitiveIntelligence(input);
  const products = input.products;

  if (!input.decisionBrief) {
    return { meta, decisionBrief: null, products };
  }

  const decisionBrief: DecisionBriefDTO = {
    ...input.decisionBrief,
    competitiveSummary: meta.whyPrimaryWins,
    competitiveAdvantages: meta.primaryAdvantages.slice(0, 4),
    tradeoffs: meta.tradeoffs.slice(0, 3),
    whyPrimaryWins: meta.whyPrimaryWins,
  };

  return { meta, decisionBrief, products };
}
