/**
 * Phase 25.0 — Intelligence Exposure Activation.
 * Surfaces existing phase 14–23 outputs into card and drawer slots only (no new intelligence).
 */

import type { ActivatedBriefPresentation } from "@/lib/ui/activatedDecisionBriefPresentation";
import type { ActivatedAlternativeAdvantage } from "@/lib/ui/alternativeAdvantageActivation";
import type { ActivatedBuyWait } from "@/lib/ui/buyWaitActivation";
import type { ActivatedCategoryIntelligence } from "@/lib/ui/categoryIntelligenceActivation";
import type { ActivatedCommerceCoverage } from "@/lib/ui/commerceCoverageActivation";
import {
  mergeDiscountTruthChip,
  type ActivatedDiscountTruth,
} from "@/lib/ui/discountTruthActivation";
import type { ActivatedIntentIntelligence } from "@/lib/ui/intentIntelligenceActivation";
import type { ActivatedPriceTarget } from "@/lib/ui/priceTargetActivation";
import type { ActivatedTrustRisk } from "@/lib/ui/trustRiskActivation";
import { mergeBuyWaitChip } from "@/lib/ui/buyWaitActivation";
import { mergeTrustRiskChip } from "@/lib/ui/trustRiskActivation";
import type { ActivatedUnifiedDecision, DecisionFactor, FinalDecision } from "@/lib/ui/unifiedDecisionActivation";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { OptimizedVerdictSurface } from "@/lib/ui/verdictSurfaceOptimization";

export type ExposureChipTone = "emerald" | "blue" | "violet" | "amber" | "slate";

export type ExposureChip = {
  label: string;
  tone: ExposureChipTone;
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
  drawerHero: ExposureDrawerHero;
  drawerModules: ExposureDrawerModule[];
};

export type IntelligenceExposureInput = {
  verdict: PrimaryVerdict;
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
  const primary = clipLine(input.unifiedDecision.decisionSummary, 96);
  const lines: string[] = [];
  if (primary && !isDuplicate(primary, seen)) lines.push(primary);

  const ranking = clipLine(input.rankingRationaleLine, 96);
  if (
    ranking &&
    input.rankingRationaleLine.includes("Ranked first") &&
    !isDuplicate(ranking, seen) &&
    lines.length < 2
  ) {
    lines.push(ranking);
  }

  while (lines.length < 2) lines.push("");
  return lines.slice(0, 2);
}

function buildExposureChips(input: IntelligenceExposureInput, seen: Set<string>): ExposureChip[] {
  let chips: ExposureChip[] = [];
  chips = mergeDiscountTruthChip(chips, input.discountTruth, 3);
  chips = mergeBuyWaitChip(chips, input.buyWait, 3);
  chips = mergeTrustRiskChip(chips, input.trustRisk, 3);
  for (const chip of chips) {
    seen.add(normalizeKey(chip.label));
  }
  return chips.slice(0, 3);
}

function buildIntentSlot(input: IntelligenceExposureInput, seen: Set<string>): string {
  const candidates = [
    input.intentIntelligence.matchExplanation,
    input.intentIntelligence.intentReasons[0],
    input.intentIntelligence.cardLine,
  ];
  for (const value of candidates) {
    const line = clipLine(value, 96);
    if (line && !isDuplicate(line, seen)) return line;
  }
  return clipLine("Search intent fit evaluated for this listing.", 96);
}

function buildTrustRiskSlot(input: IntelligenceExposureInput, seen: Set<string>): string {
  const { trustRisk } = input;
  const combined =
    trustRisk.riskScore >= 52
      ? clipLine(`${trustRisk.riskReason} ${trustRisk.trustReason}`.trim(), 96)
      : clipLine(`${trustRisk.trustReason} ${trustRisk.riskReason}`.trim(), 96);
  if (combined && !isDuplicate(combined, seen)) return combined;
  const fallback = clipLine(trustRisk.cardLine, 96);
  if (fallback && !isDuplicate(fallback, seen)) return fallback;
  return clipLine(`Trust ${trustRisk.trustScore}/100 · Risk ${trustRisk.riskScore}/100.`, 96);
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
    if (line && !isDuplicate(line, seen)) return line;
  }
  return clipLine(
    categoryIntelligence.segmentLabel
      ? `${categoryIntelligence.segmentLabel} fit ${categoryIntelligence.categoryScore}/100.`
      : "Competitive posture assessed against tray alternatives.",
    96
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
      if (line && !isDuplicate(line, seen)) return line;
    }
  }
  for (const value of [discountTruth.explanation, discountTruth.reason]) {
    const line = clipLine(value, 96);
    if (line && !isDuplicate(line, seen)) return line;
  }
  return clipLine(discountTruth.label || "Price opportunity assessed from tray signals.", 96);
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
  if (institutional && !isDuplicate(institutional, seen)) lines.push(institutional);

  const discount = clipLine(input.discountTruth.reason || input.discountTruth.explanation, 112);
  if (discount && !isDuplicate(discount, seen)) lines.push(discount);

  const timing = clipLine(input.buyWait.reason || input.buyWait.explanation, 112);
  if (timing && !isDuplicate(timing, seen)) lines.push(timing);

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
  const seen = new Set<string>();
  const summarySeen = new Set<string>();
  const summaryLines = buildSummaryLines(input, summarySeen);
  const chips = buildExposureChips(input, seen);
  const expandSeen = new Set<string>([...seen]);
  const expandSlots = buildExpandSlots(input, expandSeen);
  const smartSeen = new Set<string>([...seen]);
  const smartDecisionLines = buildSmartDecisionLines(input, smartSeen);

  return {
    summaryLines,
    chips,
    expandSlots,
    smartDecisionLines,
    drawerHero: buildDrawerHero(input),
    drawerModules: buildDrawerModules(input),
  };
}
