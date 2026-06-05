/**
 * Phase 25.0 — Intelligence Exposure Activation.
 * Phase 26.0 — Unified decision surface (hierarchy only; no new intelligence).
 * Surfaces existing phase 14–23 outputs into card and drawer slots only.
 */

import type { ActivatedBriefPresentation } from "@/lib/ui/activatedDecisionBriefPresentation";
import type { ActivatedAlternativeAdvantage } from "@/lib/ui/alternativeAdvantageActivation";
import type { ActivatedBuyWait } from "@/lib/ui/buyWaitActivation";
import type { ActivatedCategoryIntelligence } from "@/lib/ui/categoryIntelligenceActivation";
import type { ActivatedCommerceCoverage } from "@/lib/ui/commerceCoverageActivation";
import type { ActivatedDiscountTruth } from "@/lib/ui/discountTruthActivation";
import type { ActivatedIntentIntelligence } from "@/lib/ui/intentIntelligenceActivation";
import type { ActivatedPriceTarget } from "@/lib/ui/priceTargetActivation";
import type { ActivatedTrustRisk } from "@/lib/ui/trustRiskActivation";
import type { ActivatedUnifiedDecision, DecisionFactor, FinalDecision } from "@/lib/ui/unifiedDecisionActivation";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { OptimizedVerdictSurface } from "@/lib/ui/verdictSurfaceOptimization";
import {
  buildSurfaceSummaryLines,
  filterChipsForReasonAuthority,
  resolveProductReasonAuthority,
  type VerdictReasonAuthority,
} from "@/lib/ui/verdictReasonAuthority";

export type ExposureChipTone = "emerald" | "blue" | "violet" | "amber" | "slate";

export type ExposureChipEvidence = "positive" | "caution";

export type ExposureChip = {
  label: string;
  tone: ExposureChipTone;
  evidence?: ExposureChipEvidence;
};

export type ExposureDrawerHero = {
  finalDecision: FinalDecision;
  decisionLabel: string;
  finalConfidence: number;
  finalReasoning: string;
};

export type ExposureDrawerModule = {
  id: string;
  title: string;
  lead?: string;
  lines: string[];
  bullets: string[];
};

export type ActivatedIntelligenceExposure = {
  summaryLines: string[];
  chips: ExposureChip[];
  expandSlots: [string, string, string, string];
  smartDecisionLines: string[];
  reasonAuthority: VerdictReasonAuthority;
  drawerHero: ExposureDrawerHero;
  drawerModules: ExposureDrawerModule[];
};

export type IntelligenceExposureInput = {
  verdict: PrimaryVerdict;
  alignmentScore: number;
  isLeadProduct: boolean;
  decisionBrief: DecisionBriefDTO | null;
  activatedBrief: ActivatedBriefPresentation | null;
  rankingRationaleLine: string;
  optimizedSurface: OptimizedVerdictSurface;
  discountTruth: ActivatedDiscountTruth;
  buyWait: ActivatedBuyWait;
  priceTarget: ActivatedPriceTarget;
  alternativeAdvantage: ActivatedAlternativeAdvantage;
  categoryIntelligence: ActivatedCategoryIntelligence;
  intentIntelligence: ActivatedIntentIntelligence;
  trustRisk: ActivatedTrustRisk;
  unifiedDecision: ActivatedUnifiedDecision;
  commerceCoverage?: ActivatedCommerceCoverage | null;
};

function clipLine(text: string | undefined | null, max = 112): string {
  if (text == null) return "";
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function normalizeKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function finalDecisionLabel(decision: FinalDecision): string {
  switch (decision) {
    case "BUY_NOW":
      return "Buy now";
    case "WAIT":
      return "Wait";
    case "COMPARE":
      return "Compare";
    case "AVOID":
      return "Avoid";
  }
}

function isDuplicate(line: string, seen: Set<string>): boolean {
  const key = normalizeKey(line);
  if (!key || seen.has(key)) return true;
  seen.add(key);
  return false;
}

const HERO_FALLBACK: Record<PrimaryVerdict, string> = {
  "BUY READY": "Best match for your search intent.",
  WAIT: "Current price remains above fair historical value.",
  AVOID: "Lower value than competing alternatives.",
  COMPARE: "Strong option but better alternatives exist.",
};

/** Card-face lines must not compete with the recommendation band. */
function lineCompetesWithBand(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return true;
  if (/\bunified\b/.test(t)) return true;
  if (/\b(buy now|wait|compare|avoid)\b/.test(t) && /\d{1,3}\s*%/.test(t)) return true;
  if (/^(buy now|wait|compare|avoid)\b/.test(t)) return true;
  if (/\btrust\s+\d{1,3}\s*%/.test(t) || /\brisk\s+\d{1,3}\s*%/.test(t)) return true;
  return false;
}

function pickFirstSupportingLine(
  candidates: Array<string | undefined | null>,
  seen: Set<string>,
  max = 96
): string {
  for (const value of candidates) {
    const line = clipLine(value, max);
    if (!line || lineCompetesWithBand(line)) continue;
    if (isDuplicate(line, seen)) continue;
    return line;
  }
  return "";
}

function buildHeroSummaryLine(input: IntelligenceExposureInput, seen: Set<string>): string {
  const {
    verdict,
    intentIntelligence,
    priceTarget,
    buyWait,
    alternativeAdvantage,
    trustRisk,
    activatedBrief,
    optimizedSurface,
    categoryIntelligence,
  } = input;

  const byVerdict: Record<PrimaryVerdict, Array<string | undefined | null>> = {
    "BUY READY": [
      intentIntelligence.matchExplanation,
      intentIntelligence.intentReasons[0],
      activatedBrief?.reasoning,
      activatedBrief?.topSignals[0],
      categoryIntelligence.categoryStrengths[0],
      optimizedSurface.summaryLines[0],
    ],
    WAIT: [
      priceTarget.reason,
      priceTarget.explanation,
      buyWait.reason,
      buyWait.explanation,
      activatedBrief?.marketStatus,
      activatedBrief?.reasoning,
    ],
    AVOID: [
      trustRisk.riskReason,
      trustRisk.trustReason,
      alternativeAdvantage.comparisonSummary,
      activatedBrief?.riskSignals[0],
      activatedBrief?.reasoning,
    ],
    COMPARE: [
      alternativeAdvantage.comparisonSummary,
      alternativeAdvantage.advantageReasons[0],
      alternativeAdvantage.cardLine,
      activatedBrief?.reasoning,
    ],
  };

  const picked = pickFirstSupportingLine(byVerdict[verdict] ?? [], seen);
  if (picked) return picked;
  const fallback = HERO_FALLBACK[verdict];
  if (!isDuplicate(fallback, seen)) seen.add(normalizeKey(fallback));
  return fallback;
}

function buildSupportingSummaryLine(input: IntelligenceExposureInput, seen: Set<string>): string {
  const { verdict, discountTruth, trustRisk, categoryIntelligence, alternativeAdvantage } = input;
  const candidates =
    verdict === "BUY READY"
      ? [discountTruth.explanation, categoryIntelligence.categoryReasons[0]]
      : verdict === "WAIT"
        ? [discountTruth.reason, categoryIntelligence.categoryReasons[0]]
        : verdict === "COMPARE"
          ? [alternativeAdvantage.advantageReasons[1], categoryIntelligence.categoryReasons[0]]
          : [trustRisk.trustReason, discountTruth.explanation];
  return pickFirstSupportingLine(candidates, seen);
}

function pushEvidenceChip(
  chips: ExposureChip[],
  label: string,
  tone: ExposureChipTone,
  evidence: ExposureChipEvidence
): void {
  if (chips.length >= 3) return;
  const marker = evidence === "positive" ? "✓" : "⚠";
  chips.push({ label: `${marker} ${label}`, tone, evidence });
}

function buildEvidenceChips(input: IntelligenceExposureInput): ExposureChip[] {
  const {
    verdict,
    trustRisk,
    buyWait,
    discountTruth,
    rankingRationaleLine,
    priceTarget,
    alternativeAdvantage,
    intentIntelligence,
    isLeadProduct,
  } = input;
  const chips: ExposureChip[] = [];
  const trusted = trustRisk.trustScore >= 62 && trustRisk.riskScore < 52;
  const rankedFirst = /ranked first/i.test(rankingRationaleLine);
  const genuine =
    discountTruth.verdict === "Genuine" || discountTruth.verdict === "Likely Genuine";
  const inflated =
    discountTruth.verdict === "Inflated" || discountTruth.verdict === "Likely Inflated";
  const priceElevated =
    (priceTarget.distanceFromLowPct ?? 0) >= 5 ||
    priceTarget.potentialSavings >= 5 ||
    (priceTarget.opportunityScore ?? 0) >= 45;
  const buyWindow = buyWait.verdict === "BUY NOW";
  const waitRecommended = buyWait.verdict === "WAIT";
  const betterAlt =
    !isLeadProduct ||
    alternativeAdvantage.leadAdvantageScore < 55 ||
    /better alternative|stronger option/i.test(alternativeAdvantage.comparisonSummary);

  if (verdict === "BUY READY") {
    if (trusted) pushEvidenceChip(chips, "Trusted Seller", "emerald", "positive");
    if (rankedFirst) pushEvidenceChip(chips, "Ranked First", "blue", "positive");
    if (buyWindow) pushEvidenceChip(chips, "Buy Window Active", "emerald", "positive");
    else if (genuine) pushEvidenceChip(chips, "Genuine Discount", "emerald", "positive");
    if (intentIntelligence.intentMatchScore >= 58 && chips.length < 3) {
      pushEvidenceChip(chips, "Strong Intent Match", "violet", "positive");
    }
  } else if (verdict === "WAIT") {
    if (trusted) pushEvidenceChip(chips, "Trusted Seller", "slate", "positive");
    if (priceElevated || waitRecommended) {
      pushEvidenceChip(chips, "Price Elevated", "amber", "caution");
    }
    if (waitRecommended) pushEvidenceChip(chips, "Wait Recommended", "amber", "caution");
    if (inflated) pushEvidenceChip(chips, "Inflated Discount", "amber", "caution");
  } else if (verdict === "AVOID") {
    if (trustRisk.riskScore >= 55) pushEvidenceChip(chips, "Elevated Risk", "amber", "caution");
    if (trustRisk.trustScore < 52) pushEvidenceChip(chips, "Trust Concerns", "amber", "caution");
    if (inflated) pushEvidenceChip(chips, "Inflated Discount", "amber", "caution");
    if (trustRisk.factors.suspiciousOfferRisk >= 55) {
      pushEvidenceChip(chips, "Suspicious Offer", "amber", "caution");
    }
  } else if (verdict === "COMPARE") {
    if (trusted) pushEvidenceChip(chips, "Trusted Seller", "slate", "positive");
    if (betterAlt) pushEvidenceChip(chips, "Better Alternative Found", "blue", "caution");
    if (buyWait.verdict === "COMPARE") pushEvidenceChip(chips, "Compare Options", "blue", "positive");
    if (rankedFirst && isLeadProduct) pushEvidenceChip(chips, "Ranked First", "blue", "positive");
  }

  return chips.slice(0, 3);
}

function prefixExpandSlot(role: string, line: string): string {
  const body = clipLine(line, 88);
  if (!body) return "";
  return clipLine(`${role} · ${body}`, 96);
}

function pickInstitutionalReasoning(
  activatedBrief: ActivatedBriefPresentation | null,
  optimizedSurface: OptimizedVerdictSurface,
  verdict: PrimaryVerdict
): string {
  return clipLine(
    activatedBrief?.reasoning ||
      optimizedSurface.verdictReason ||
      (verdict === "BUY READY"
        ? activatedBrief?.marketStatus
        : activatedBrief?.confidenceExplanation) ||
      "",
    112
  );
}

function buildSummaryLines(input: IntelligenceExposureInput, seen: Set<string>): string[] {
  const lines: string[] = [];
  const hero = buildHeroSummaryLine(input, seen);
  if (hero) lines.push(hero);
  if (lines.length < 2) {
    const support = buildSupportingSummaryLine(input, seen);
    if (support) lines.push(support);
  }
  while (lines.length < 2) lines.push("");
  return lines.slice(0, 2);
}

function buildExposureChips(input: IntelligenceExposureInput, seen: Set<string>): ExposureChip[] {
  const chips = buildEvidenceChips(input);
  for (const chip of chips) {
    seen.add(normalizeKey(chip.label));
  }
  return chips;
}

function buildIntentSlot(input: IntelligenceExposureInput, seen: Set<string>): string {
  const candidates = [
    input.intentIntelligence.matchExplanation,
    input.intentIntelligence.intentReasons[0],
    input.intentIntelligence.cardLine,
  ];
  for (const value of candidates) {
    const line = clipLine(value, 96);
    if (line && !isDuplicate(line, seen)) return prefixExpandSlot("Intent", line);
  }
  return prefixExpandSlot("Intent", "Search intent fit evaluated for this listing.");
}

function buildTrustRiskSlot(input: IntelligenceExposureInput, seen: Set<string>): string {
  const { trustRisk } = input;
  const combined =
    trustRisk.riskScore >= 52
      ? clipLine(`${trustRisk.riskReason} ${trustRisk.trustReason}`.trim(), 96)
      : clipLine(`${trustRisk.trustReason} ${trustRisk.riskReason}`.trim(), 96);
  if (combined && !isDuplicate(combined, seen)) return prefixExpandSlot("Trust", combined);
  const fallback = clipLine(trustRisk.cardLine, 96);
  if (fallback && !isDuplicate(fallback, seen)) return prefixExpandSlot("Trust", fallback);
  return prefixExpandSlot(
    "Trust",
    `Seller trust ${trustRisk.trustScore}/100 · risk ${trustRisk.riskScore}/100.`
  );
}

function buildCompetitiveSlot(input: IntelligenceExposureInput, seen: Set<string>): string {
  const { alternativeAdvantage, categoryIntelligence } = input;
  const useAlternative =
    alternativeAdvantage.leadAdvantageScore >= categoryIntelligence.categoryScore ||
    alternativeAdvantage.advantageReasons.length > 0;
  const candidates = useAlternative
    ? [
        alternativeAdvantage.comparisonSummary,
        alternativeAdvantage.advantageReasons[0],
        alternativeAdvantage.cardLine,
        categoryIntelligence.categoryStrengths[0],
        categoryIntelligence.cardLine,
      ]
    : [
        categoryIntelligence.categoryStrengths[0],
        categoryIntelligence.categoryReasons[0],
        categoryIntelligence.cardLine,
        alternativeAdvantage.comparisonSummary,
        alternativeAdvantage.cardLine,
      ];
  for (const value of candidates) {
    const line = clipLine(value, 96);
    if (line && !isDuplicate(line, seen)) return prefixExpandSlot("Competitive", line);
  }
  return prefixExpandSlot(
    "Competitive",
    categoryIntelligence.segmentLabel
      ? `${categoryIntelligence.segmentLabel} fit ${categoryIntelligence.categoryScore}/100.`
      : "Competitive posture assessed against tray alternatives."
  );
}

function buildPriceOpportunitySlot(input: IntelligenceExposureInput, seen: Set<string>): string {
  const { priceTarget, discountTruth } = input;
  const priceCandidates = [priceTarget.explanation, priceTarget.reason, priceTarget.cardLine];
  const hasTargetSignal =
    priceTarget.potentialSavings >= 5 || (priceTarget.opportunityScore ?? 0) >= 40;
  if (hasTargetSignal) {
    for (const value of priceCandidates) {
      const line = clipLine(value, 96);
      if (line && !isDuplicate(line, seen)) return prefixExpandSlot("Price", line);
    }
  }
  for (const value of [discountTruth.explanation, discountTruth.reason]) {
    const line = clipLine(value, 96);
    if (line && !isDuplicate(line, seen)) return prefixExpandSlot("Price", line);
  }
  return prefixExpandSlot(
    "Price",
    discountTruth.label || "Price opportunity assessed from tray signals."
  );
}

function buildExpandSlots(input: IntelligenceExposureInput, seen: Set<string>): [string, string, string, string] {
  return [
    buildIntentSlot(input, seen),
    buildTrustRiskSlot(input, seen),
    buildCompetitiveSlot(input, seen),
    buildPriceOpportunitySlot(input, seen),
  ];
}

function buildSmartDecisionLines(input: IntelligenceExposureInput, seen: Set<string>): string[] {
  const lines: string[] = [];
  const institutional = pickInstitutionalReasoning(
    input.activatedBrief,
    input.optimizedSurface,
    input.verdict
  );
  if (institutional && !lineCompetesWithBand(institutional) && !isDuplicate(institutional, seen)) {
    lines.push(institutional);
  }

  const discount = clipLine(input.discountTruth.reason || input.discountTruth.explanation, 112);
  if (discount && !lineCompetesWithBand(discount) && !isDuplicate(discount, seen)) {
    lines.push(discount);
  }

  const timing = clipLine(input.buyWait.explanation || input.buyWait.reason, 112);
  const timingFitsVerdict =
    (input.verdict === "BUY READY" && input.buyWait.verdict === "BUY NOW") ||
    (input.verdict === "WAIT" && input.buyWait.verdict === "WAIT") ||
    (input.verdict === "COMPARE" && input.buyWait.verdict === "COMPARE");
  if (
    timing &&
    timingFitsVerdict &&
    !lineCompetesWithBand(timing) &&
    !isDuplicate(timing, seen)
  ) {
    lines.push(timing);
  }

  return lines.slice(0, 3);
}

function buildDrawerHero(input: IntelligenceExposureInput): ExposureDrawerHero {
  const { unifiedDecision } = input;
  return {
    finalDecision: unifiedDecision.finalDecision,
    decisionLabel: finalDecisionLabel(unifiedDecision.finalDecision),
    finalConfidence: unifiedDecision.finalConfidence,
    finalReasoning: clipLine(unifiedDecision.finalReasoning, 280),
  };
}

function buildUnifiedModule(input: IntelligenceExposureInput): ExposureDrawerModule {
  const { unifiedDecision } = input;
  return {
    id: "unified",
    title: "Unified decision",
    lead: `${finalDecisionLabel(unifiedDecision.finalDecision)} · ${unifiedDecision.finalConfidence}% confidence`,
    lines: [clipLine(unifiedDecision.finalReasoning, 280)],
    bullets: [clipLine(unifiedDecision.decisionSummary, 112)].filter(Boolean),
  };
}

function buildTrustRiskModule(input: IntelligenceExposureInput): ExposureDrawerModule {
  const { trustRisk } = input;
  return {
    id: "trust_risk",
    title: "Trust & risk",
    lead: `Trust ${trustRisk.trustScore}/100 · Risk ${trustRisk.riskScore}/100`,
    lines: [trustRisk.trustReason, trustRisk.riskReason].map((line) => clipLine(line, 112)).filter(Boolean),
    bullets: [
      `Seller trust ${trustRisk.factors.sellerTrust}/100`,
      `Marketplace trust ${trustRisk.factors.marketplaceTrust}/100`,
      `Discount manipulation risk ${trustRisk.factors.discountManipulationRisk}/100`,
      `Pricing anomaly risk ${trustRisk.factors.pricingAnomalyRisk}/100`,
    ],
  };
}

function buildIntentModule(input: IntelligenceExposureInput): ExposureDrawerModule {
  const { intentIntelligence } = input;
  return {
    id: "intent",
    title: "Intent match",
    lead: `${intentIntelligence.intentLabel} · ${intentIntelligence.intentMatchScore}% fit`,
    lines: [clipLine(intentIntelligence.matchExplanation, 112)].filter(Boolean),
    bullets: intentIntelligence.intentReasons.slice(0, 3).map((line) => clipLine(line, 112)),
  };
}

function buildPriceModule(input: IntelligenceExposureInput): ExposureDrawerModule {
  const { priceTarget, discountTruth } = input;
  return {
    id: "price",
    title: "Price opportunity",
    lead:
      priceTarget.potentialSavings >= 5
        ? `Target ${priceTarget.targetBuyPriceLabel} · save ${priceTarget.potentialSavingsLabel}`
        : clipLine(discountTruth.label, 72),
    lines: [
      clipLine(priceTarget.reason || priceTarget.explanation, 112),
      clipLine(discountTruth.reason || discountTruth.explanation, 112),
    ].filter(Boolean),
    bullets: [
      priceTarget.opportunityScore > 0
        ? `Opportunity score ${priceTarget.opportunityScore}%`
        : "",
      priceTarget.distanceFromLowPct != null
        ? `${priceTarget.distanceFromLowPct}% above tray low`
        : "",
    ].filter(Boolean),
  };
}

function buildCompetitiveModule(input: IntelligenceExposureInput): ExposureDrawerModule {
  const { alternativeAdvantage } = input;
  return {
    id: "competitive",
    title: "Competitive advantage",
    lead:
      alternativeAdvantage.leadAdvantageScore > 0
        ? `Lead advantage score ${alternativeAdvantage.leadAdvantageScore}/100`
        : undefined,
    lines: [clipLine(alternativeAdvantage.comparisonSummary, 112)].filter(Boolean),
    bullets: alternativeAdvantage.advantageReasons.slice(0, 4).map((line) => clipLine(line, 112)),
  };
}

function buildCategoryModule(input: IntelligenceExposureInput): ExposureDrawerModule {
  const { categoryIntelligence } = input;
  return {
    id: "category",
    title: "Category intelligence",
    lead: categoryIntelligence.segmentLabel
      ? `${categoryIntelligence.segmentLabel} · ${categoryIntelligence.categoryScore}/100`
      : `Category score ${categoryIntelligence.categoryScore}/100`,
    lines: categoryIntelligence.categoryReasons.slice(0, 2).map((line) => clipLine(line, 112)),
    bullets: [
      ...categoryIntelligence.categoryStrengths.slice(0, 2),
      ...categoryIntelligence.categoryWeaknesses.slice(0, 1),
      ...categoryIntelligence.dimensions.slice(0, 2).map((d) => `${d.label} ${d.score}/100`),
    ]
      .map((line) => clipLine(line, 96))
      .filter(Boolean),
  };
}

function buildCommerceModule(
  commerceCoverage: ActivatedCommerceCoverage | null | undefined
): ExposureDrawerModule | null {
  if (!commerceCoverage || commerceCoverage.merchantCount < 2) return null;
  return {
    id: "commerce",
    title: "Commerce coverage",
    lead: `${commerceCoverage.merchantCount} merchants · from ${commerceCoverage.lowestPriceLabel}`,
    lines: [
      clipLine(commerceCoverage.coverageSummaryLine, 112),
      clipLine(commerceCoverage.drawerOffersSummary, 112),
    ].filter(Boolean),
    bullets: commerceCoverage.offers.slice(0, 4).map(
      (offer) =>
        clipLine(`${offer.store} · ${offer.displayPrice} · ${offer.availabilityStatus}`, 96)
    ),
  };
}

function buildFactorsModule(factors: DecisionFactor[]): ExposureDrawerModule {
  return {
    id: "factors",
    title: "Decision factors",
    lead: `${factors.length} signals synthesized across active layers`,
    lines: [],
    bullets: factors
      .slice()
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8)
      .map((factor) => clipLine(`${factor.label} (${factor.support}) — ${factor.line}`, 112)),
  };
}

function buildDrawerModules(input: IntelligenceExposureInput): ExposureDrawerModule[] {
  const modules: ExposureDrawerModule[] = [
    buildUnifiedModule(input),
    buildTrustRiskModule(input),
    buildIntentModule(input),
    buildPriceModule(input),
    buildCompetitiveModule(input),
    buildCategoryModule(input),
  ];
  const commerce = buildCommerceModule(input.commerceCoverage);
  if (commerce) modules.push(commerce);
  modules.push(buildFactorsModule(input.unifiedDecision.decisionFactors));
  return modules;
}

/** Activate intelligence exposure for one listing (existing outputs only). */
export function activateIntelligenceExposure(input: IntelligenceExposureInput): ActivatedIntelligenceExposure {
  const reasonAuthority = resolveProductReasonAuthority({
    verdict: input.verdict,
    alignmentScore: input.alignmentScore,
    isLeadProduct: input.isLeadProduct,
    rankingRationaleLine: input.rankingRationaleLine,
    discountTruth: input.discountTruth,
    buyWait: input.buyWait,
    priceTarget: input.priceTarget,
    alternativeAdvantage: input.alternativeAdvantage,
    categoryIntelligence: input.categoryIntelligence,
    intentIntelligence: input.intentIntelligence,
    trustRisk: input.trustRisk,
  });

  const seen = new Set<string>();
  const [heroLine, supportLine] = buildSurfaceSummaryLines(reasonAuthority);
  const summaryLines = [heroLine, supportLine];
  const chips = filterChipsForReasonAuthority(buildExposureChips(input, seen), reasonAuthority);
  const expandSeen = new Set<string>([...seen]);
  const expandSlots = buildExpandSlots(input, expandSeen);
  const smartSeen = new Set<string>([...seen]);
  const smartDecisionLines = buildSmartDecisionLines(input, smartSeen);

  return {
    summaryLines,
    chips,
    expandSlots,
    smartDecisionLines,
    reasonAuthority,
    drawerHero: buildDrawerHero(input),
    drawerModules: buildDrawerModules(input),
  };
}
