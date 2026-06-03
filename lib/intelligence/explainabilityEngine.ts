/**
 * Phase 10.1 — Explainability Intelligence.
 * Explains Phase 10.0 verdicts using existing pipeline metadata only.
 * No ranking, tray, or verdict mutations.
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { Phase93TrustDiscountMeta } from "@/lib/intelligence/phase93TrustDiscountHardening";
import type { Phase95CommerceMemoryMeta } from "@/lib/intelligence/phase95CommerceMemory";
import type { Phase92TrayIntegrityMeta } from "@/lib/search/phase92TrayIntegrity";
import type { QueryIntelligenceMeta } from "@/lib/search/phase94QueryIntelligence";
import type { CommerceVerdict, VerdictIntelligenceMeta } from "@/lib/intelligence/verdictEngine";

export type ExplainabilityMeta = {
  version: "phase10.1-v1";
  summary: string;
  keyReasons: string[];
  positiveSignals: string[];
  riskSignals: string[];
  confidenceDrivers: string[];
  recommendationBasis: {
    trust: number;
    pricing: number;
    retailer: number;
    intentMatch: number;
    memoryAlignment: number;
  };
};

export type ExplainabilityInput = {
  phase92?: Phase92TrayIntegrityMeta;
  phase93: Phase93TrustDiscountMeta;
  queryIntelligence?: QueryIntelligenceMeta;
  commerceMemory?: Phase95CommerceMemoryMeta;
  verdictIntelligence: VerdictIntelligenceMeta;
  decisionBrief: DecisionBriefDTO | null;
};

const VERDICT_SUMMARY: Record<CommerceVerdict, string> = {
  "STRONG BUY":
    "Verdict reflects high trust, verified pricing, and strong alignment with your purchase intent.",
  "BUY READY":
    "Verdict reflects acceptable trust, pricing, and retailer quality for a ready-to-buy decision.",
  "BEST VALUE":
    "Verdict reflects the strongest value proposition identified among evaluated listings.",
  "PREMIUM PICK":
    "Verdict reflects premium quality leadership aligned with your shopping preference.",
  CONSIDER:
    "Verdict reflects mixed signals — further comparison is advisable before purchase.",
  WAIT: "Verdict reflects limited market confidence — timing favors patience over immediate purchase.",
  AVOID: "Verdict reflects elevated trust, pricing, or seller risk on the recommended listing.",
};

const VERDICT_KEY_REASONS: Record<CommerceVerdict, string[]> = {
  "STRONG BUY": [
    "Trusted retailer detected",
    "Verified discount identified",
    "Strong pricing position",
    "High trust score",
    "Matches purchase intent",
  ],
  "BUY READY": [
    "Passes quality checks",
    "Retailer confidence acceptable",
    "Competitive market pricing",
  ],
  "BEST VALUE": [
    "Highest value proposition",
    "Strong price-to-quality ratio",
    "Better value than alternatives",
  ],
  "PREMIUM PICK": [
    "Premium product category",
    "Strong quality signals",
    "Aligns with premium preference",
  ],
  CONSIDER: [
    "Mixed strengths detected",
    "Some positive signals present",
    "Additional evaluation recommended",
  ],
  WAIT: [
    "Limited market confidence",
    "Better opportunities may emerge",
    "Current timing not ideal",
  ],
  AVOID: [
    "Trust concerns detected",
    "Suspicious discount behavior",
    "Retailer risk identified",
    "Price anomaly detected",
  ],
};

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function pickAssessment(input: ExplainabilityInput) {
  const link = input.decisionBrief?.recommendation.link;
  if (!link) return input.phase93.trayAssessments[0] ?? null;
  return input.phase93.trayAssessments.find((a) => a.link === link) ?? input.phase93.trayAssessments[0] ?? null;
}

function buildRecommendationBasis(input: ExplainabilityInput): ExplainabilityMeta["recommendationBasis"] {
  const pick = pickAssessment(input);
  const trace = input.verdictIntelligence.factorTrace;
  const trustScore = pick?.trustScore ?? (typeof trace.trustScore === "number" ? trace.trustScore : 50);
  const retailerConfidence =
    pick?.retailerConfidence ?? input.phase93.averageRetailerConfidence ?? 50;
  const discountAuth = pick?.discountAuthenticity ?? 50;
  const verified = Boolean(
    input.phase93.discountIntelligence.bestVerifiedDiscount &&
      input.decisionBrief?.recommendation.link ===
        input.phase93.discountIntelligence.bestVerifiedDiscount.link
  );
  const pricing = clampScore(
    discountAuth * 0.55 +
      (verified ? 28 : 0) +
      (input.phase93.verdictConfidence.discountAuthentic ? 12 : 0) -
      (pick?.fakeDiscountRisk === "high" ? 35 : pick?.fakeDiscountRisk === "medium" ? 12 : 0) -
      (pick?.priceAnomaly === "suspicious_low" ? 25 : 0)
  );
  const intentMatch = clampScore(
    (input.queryIntelligence?.confidence ?? 0.45) * 100 * 0.55 +
      (trace.categoryOk === true ? 22 : 0) +
      (input.queryIntelligence?.detectedIntent.comparisonIntent ? 8 : 12)
  );
  const memoryAlignment = clampScore((input.commerceMemory?.confidence ?? 0) * 100);

  return {
    trust: clampScore(trustScore),
    pricing,
    retailer: clampScore(retailerConfidence),
    intentMatch,
    memoryAlignment,
  };
}

function buildPositiveSignals(input: ExplainabilityInput, verdict: CommerceVerdict): string[] {
  const out: string[] = [];
  const pick = pickAssessment(input);
  const vi = input.verdictIntelligence;

  for (const s of vi.strengths) {
    if (!out.includes(s)) out.push(s);
  }
  if (pick && pick.trustScore >= 75) out.push("Trusted retailer detected");
  if (input.phase93.verdictConfidence.discountAuthentic) out.push("Verified discount identified");
  if (input.phase93.verdictConfidence.trustFloorOk) out.push("Trust floor checks passed");
  if (input.queryIntelligence && input.queryIntelligence.confidence >= 0.6) {
    out.push("Query intent clearly understood");
  }
  if (input.commerceMemory && input.commerceMemory.confidence >= 0.72) {
    out.push("Aligned with session shopping preferences");
  }
  if (input.phase92?.compareIntegrity.bothEntitiesRepresented) {
    out.push("Compare entities represented in tray");
  }
  if (input.phase92?.top3Diversity.applied) {
    out.push("Top results span multiple trusted merchants");
  }

  for (const template of VERDICT_KEY_REASONS[verdict].slice(0, 2)) {
    if (!out.some((x) => x.toLowerCase().includes(template.split(" ")[0]!.toLowerCase()))) {
      out.push(template);
    }
  }

  return [...new Set(out)].slice(0, 6);
}

function buildRiskSignals(input: ExplainabilityInput): string[] {
  const out: string[] = [];
  const pick = pickAssessment(input);

  for (const w of input.verdictIntelligence.warnings) {
    if (!out.includes(w)) out.push(w);
  }
  if (pick?.suspiciousSeller) out.push("Retailer risk identified");
  if (pick?.fakeDiscountRisk === "high" || pick?.fakeDiscountRisk === "medium") {
    out.push("Suspicious discount behavior");
  }
  if (pick?.priceAnomaly && pick.priceAnomaly !== "none") {
    out.push("Price anomaly detected");
  }
  if (input.phase93.suspiciousSellerCount > 0) {
    out.push("Tray contains sellers requiring verification");
  }
  if (input.phase93.fakeDiscountHighCount > 0) {
    out.push("Inflated discount anchors detected in market scan");
  }
  if (input.decisionBrief?.sparseTrayWarning) {
    out.push("Limited listing depth in this scan");
  }
  if (input.phase92 && !input.phase92.compareIntegrity.bothEntitiesRepresented) {
    out.push("Compare coverage incomplete for all entities");
  }

  return [...new Set(out)].slice(0, 6);
}

function buildConfidenceDrivers(
  input: ExplainabilityInput,
  basis: ExplainabilityMeta["recommendationBasis"]
): string[] {
  const drivers: string[] = [];
  const vc = input.phase93.verdictConfidence;

  if (basis.trust >= 75) drivers.push("Trust signals strongly support this verdict");
  else if (basis.trust >= 60) drivers.push("Trust signals moderately support this verdict");
  else drivers.push("Trust signals weaken overall verdict confidence");

  if (basis.retailer >= 72) drivers.push("Retailer confidence is solid for checkout");
  if (basis.pricing >= 70) drivers.push("Pricing position is favorable versus tray peers");
  if (vc.discountAuthentic) drivers.push("Discount authenticity verified in tray context");
  if (basis.intentMatch >= 65) drivers.push("Listing aligns with interpreted query intent");
  if (basis.memoryAlignment >= 70) drivers.push("Session preferences reinforce this recommendation");
  if (input.verdictIntelligence.confidence >= 78) {
    drivers.push("Composite verdict confidence is high");
  } else if (input.verdictIntelligence.confidence < 55) {
    drivers.push("Composite verdict confidence is constrained by risk flags");
  }

  return drivers.slice(0, 5);
}

function selectKeyReasons(
  verdict: CommerceVerdict,
  positive: string[],
  risks: string[],
  input: ExplainabilityInput
): string[] {
  const pick = pickAssessment(input);
  const templates = [...VERDICT_KEY_REASONS[verdict]];
  const out: string[] = [];

  if (verdict === "AVOID") {
    if (pick?.suspiciousSeller) out.push("Retailer risk identified");
    if (pick?.fakeDiscountRisk === "high") out.push("Suspicious discount behavior");
    if (pick?.priceAnomaly && pick.priceAnomaly !== "none") out.push("Price anomaly detected");
    if (pick && pick.trustScore < 60) out.push("Trust concerns detected");
  } else {
    for (const t of templates) {
      if (out.length >= 5) break;
      out.push(t);
    }
  }

  for (const p of positive) {
    if (out.length >= 5) break;
    const normalized = p.replace(/\.$/, "");
    if (!out.some((r) => r.toLowerCase() === normalized.toLowerCase())) out.push(normalized);
  }

  if (verdict === "CONSIDER" || verdict === "WAIT") {
    for (const r of risks) {
      if (out.length >= 5) break;
      const normalized = r.replace(/\.$/, "");
      if (!out.some((x) => x.toLowerCase() === normalized.toLowerCase())) out.push(normalized);
    }
  }

  return out.slice(0, 5);
}

/** Build explainability meta from consumed pipeline intelligence. */
export function buildExplainability(input: ExplainabilityInput): ExplainabilityMeta {
  const verdict = input.verdictIntelligence.verdict;
  const basis = buildRecommendationBasis(input);
  const positiveSignals = buildPositiveSignals(input, verdict);
  const riskSignals = buildRiskSignals(input);
  const keyReasons = selectKeyReasons(verdict, positiveSignals, riskSignals, input);

  const summary =
    input.verdictIntelligence.rationale.trim() ||
    VERDICT_SUMMARY[verdict] ||
    "Verdict explanation derived from trust, pricing, and intent signals in this scan.";

  return {
    version: "phase10.1-v1",
    summary,
    keyReasons,
    positiveSignals,
    riskSignals,
    confidenceDrivers: buildConfidenceDrivers(input, basis),
    recommendationBasis: basis,
  };
}

function mergeWhy(brief: DecisionBriefDTO, explain: ExplainabilityMeta): string[] {
  const merged = [
    explain.summary,
    ...explain.keyReasons,
    ...brief.why.filter(
      (w) =>
        w !== explain.summary &&
        !explain.keyReasons.some((k) => k.toLowerCase() === w.toLowerCase())
    ),
  ];
  return [...new Set(merged.map((s) => s.trim()).filter(Boolean))].slice(0, 6);
}

/** Post-verdict explainability — does not alter verdict or products. */
export function applyExplainabilityIntelligence(input: ExplainabilityInput): {
  meta: ExplainabilityMeta;
  decisionBrief: DecisionBriefDTO | null;
  verdictIntelligence: VerdictIntelligenceMeta;
} {
  const meta = buildExplainability(input);
  const verdictIntelligence = input.verdictIntelligence;

  if (!input.decisionBrief) {
    return { meta, decisionBrief: null, verdictIntelligence };
  }

  const decisionBrief: DecisionBriefDTO = {
    ...input.decisionBrief,
    explanationSummary: meta.summary,
    keyReasons: meta.keyReasons,
    why: mergeWhy(input.decisionBrief, meta),
  };

  return { meta, decisionBrief, verdictIntelligence };
}
