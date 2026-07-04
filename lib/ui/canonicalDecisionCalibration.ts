/**
 * Post–Phase A universal shopper-facing decision calibration.
 * Commerce-value policy — canonical rank + discount/trust/quality signals (no new engines).
 */

import type { CommerceDecisionTier } from "@/lib/intelligence/commerceDecisionCoreEngine";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { ExposureChip } from "@/lib/ui/intelligenceExposureActivation";
import type { UniversalProductDecision, ShopperRecommendationLabel } from "@/lib/ui/universalProductDecision";
import type { RankingDecisionRecord } from "@/lib/truth/rankingDecisionRecord";

export type { ShopperRecommendationLabel };

export type CanonicalDecisionCalibrationContext = {
  rankIndex: number;
  traySize: number;
  topFinalScore: number;
  gapToLeader: number;
  leaderGapToSecond: number;
};

export type CalibratedShopperDecision = {
  label: ShopperRecommendationLabel;
  tier: CommerceDecisionTier;
  verdict: PrimaryVerdict;
  confidence: number;
  reasonLine: string;
  summaryLines: [string, string];
};

type UniversalCalibrationSignals = {
  rankIndex: number;
  traySize: number;
  gapToLeader: number;
  leaderGapToSecond: number;
  finalRankScore: number;
  topFinalScore: number;
  truthDelta: number;
  overallMatch: number;
  relevance: number;
  trust: number;
  recommendation: number;
  trueValueScore: number;
  qualityScore: number;
  merchantReliability: number;
  discountVerified: boolean;
  discountFake: boolean;
  discountConfidence: number;
  priceAdvantagePct: number;
  commerceValueScore: number;
  discountDisplayLine: string | null;
};

const BUY_TIER_LABELS: ShopperRecommendationLabel[] = ["BUY", "STRONG BUY", "BEST VALUE"];
const MAX_BUY_TIER_PER_TRAY = 2;

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function clipLine(text: string, max = 120): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Benign placeholder copy — not a real constraint mismatch. */
export const NO_MISMATCH_PLACEHOLDER = "No major mismatch detected";

function normalizeSignalText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** True only when mismatch reason is substantive, not the default no-mismatch placeholder. */
export function isRealMismatchReason(reason: string | undefined | null): boolean {
  if (!reason) return false;
  const normalized = normalizeSignalText(reason);
  if (!normalized) return false;
  if (/^no major mismatch detected$/i.test(normalized)) return false;
  return true;
}

/** Evidence line indicates a real hard blocker — excludes benign placeholder phrasing. */
export function evidenceIndicatesHardMismatch(line: string): boolean {
  const text = normalizeSignalText(line);
  if (!text) return false;
  if (/no major mismatch detected/i.test(text)) return false;
  if (/over budget/i.test(text)) return true;
  if (/hard requirement/i.test(text)) return true;
  if (/wrong (product|category|type)/i.test(text)) return true;
  if (/fake discount/i.test(text)) return true;
  if (/mismatch/i.test(text) && !/no major mismatch/i.test(text)) return true;
  return false;
}

function evidenceIndicatesOverBudget(evidence: string[]): boolean {
  return evidence.some((line) => /over budget/i.test(normalizeSignalText(line)));
}

/** Commerce value score — discount, trust, quality, and price advantage outweigh query match alone. */
export function computeCommerceValueScore(signals: Omit<UniversalCalibrationSignals, "commerceValueScore">): number {
  const discountBoost = signals.discountVerified
    ? Math.min(14, signals.discountConfidence * 0.12 + signals.priceAdvantagePct * 1.8)
    : signals.discountFake
      ? -8
      : Math.min(6, signals.priceAdvantagePct * 0.8);

  const rankTail = Math.max(0, Math.min(14, (signals.finalRankScore - 55) * 0.22));

  return clamp(
    signals.trueValueScore * 0.24 +
      signals.trust * 0.17 +
      signals.merchantReliability * 0.13 +
      signals.qualityScore * 0.14 +
      discountBoost +
      Math.max(0, signals.truthDelta) * 1.15 +
      signals.recommendation * 0.1 +
      rankTail +
      signals.overallMatch * 0.06,
    0,
    100
  );
}

function resolveCalibrationSignals(
  decision: UniversalProductDecision,
  context: CanonicalDecisionCalibrationContext
): UniversalCalibrationSignals | null {
  const intel = decision.productIntelligence;
  const record = intel?.rankingDecisionRecord;
  const foundation = intel?.truthFoundation;
  if (!record) return null;

  const overallMatch =
    foundation?.productMatch?.overallMatchScore ?? record.compositeBreakdown.relevance;
  const relevance = record.compositeBreakdown.relevance;
  const trust = record.compositeBreakdown.trust;
  const discountProof = intel?.realDiscountProof;
  const discountVerified =
    discountProof?.verified === true && !discountProof.band.includes("Fake");
  const discountFake = discountProof?.band?.includes("Fake") ?? false;
  const priceAdvantagePct = Math.max(
    0,
    discountProof?.marketMedianDifferencePct ?? intel?.globalPriceIntelligence?.priceAdvantagePct ?? 0
  );
  const discountConfidence = intel?.discountConfidence?.discountConfidence ?? 0;
  const discountDisplayLine =
    (discountVerified && intel?.discountConfidence?.displayLine) ||
    (discountVerified && discountProof?.displayLine) ||
    null;

  const base = {
    rankIndex: context.rankIndex,
    traySize: context.traySize,
    gapToLeader: context.gapToLeader,
    leaderGapToSecond: context.leaderGapToSecond,
    finalRankScore: record.finalRankScore,
    topFinalScore: context.topFinalScore,
    truthDelta: record.truthDelta,
    overallMatch,
    relevance,
    trust,
    recommendation: record.compositeBreakdown.recommendation,
    trueValueScore: intel?.trueValue?.trueValueScore ?? 0,
    qualityScore:
      intel?.categoryValue?.qualityScore ?? intel?.categoryIntelligenceCore?.categoryIntelligenceScore ?? 0,
    merchantReliability: intel?.merchantReliability?.merchantReliabilityScore ?? trust,
    discountVerified,
    discountFake,
    discountConfidence,
    priceAdvantagePct,
    discountDisplayLine,
  };

  return {
    ...base,
    commerceValueScore: computeCommerceValueScore(base),
  };
}

/**
 * Real avoid blockers only — upstream recommendationTier is not final truth.
 */
export function detectHardConstraintMismatch(decision: UniversalProductDecision): boolean {
  const intel = decision.productIntelligence;
  const foundation = intel?.truthFoundation;
  const record = intel?.rankingDecisionRecord;
  if (!foundation && !record) return false;

  const overallMatch =
    foundation?.productMatch?.overallMatchScore ?? record?.compositeBreakdown.relevance ?? 100;
  const intentMatch = foundation?.productMatch?.intentMatchScore ?? overallMatch;
  const relevance = record?.compositeBreakdown.relevance ?? overallMatch;
  const trust = record?.compositeBreakdown.trust ?? foundation?.trustEngine?.trustScore ?? 50;
  const match = foundation?.productMatch;
  const constraints = foundation?.purchaseConstraints;
  const evidence = record?.evidenceChain ?? [];

  const merchantReliability = intel?.merchantReliability?.merchantReliabilityScore ?? trust;
  const trueValueScore = intel?.trueValue?.trueValueScore ?? 0;
  const discountFake =
    intel?.realDiscountProof?.band?.includes("Fake") === true &&
    intel?.realDiscountProof?.verified !== true;

  if (discountFake && trust < 48 && trueValueScore < 45) return true;

  if (isRealMismatchReason(match?.strongestMismatchReason) && overallMatch < 48 && intentMatch < 52) {
    return true;
  }

  if (constraints && constraints.hardRequirements.length > 0 && overallMatch < 52) {
    return true;
  }

  if (evidenceIndicatesOverBudget(evidence) && overallMatch < 58) {
    return true;
  }

  if (overallMatch < 50 && evidence.some((line) => evidenceIndicatesHardMismatch(line))) {
    return true;
  }

  if (overallMatch < 36 && relevance < 40) {
    return true;
  }

  if (trust < 34 && merchantReliability < 40) {
    return true;
  }

  const constraintLayer = record?.layers.find((layer) => layer.layer === "2K_purchaseConstraints");
  if (
    constraintLayer &&
    constraintLayer.scoreContribution <= -3.5 &&
    overallMatch < 48 &&
    evidenceIndicatesOverBudget(evidence)
  ) {
    return true;
  }

  if (trueValueScore > 0 && trueValueScore < 32 && overallMatch < 42 && trust < 45) {
    return true;
  }

  return false;
}

function hasStrongValueSignal(signals: UniversalCalibrationSignals): boolean {
  return (
    signals.commerceValueScore >= 62 &&
    (signals.discountVerified || signals.priceAdvantagePct >= 5 || signals.trueValueScore >= 65) &&
    signals.trust >= 46
  );
}

function hasAcceptableValue(signals: UniversalCalibrationSignals): boolean {
  if (signals.commerceValueScore >= 52) return true;
  if (signals.trueValueScore >= 48) return true;
  if (signals.discountVerified && signals.priceAdvantagePct >= 4) return true;
  if (signals.overallMatch >= 46 && signals.trust >= 38) return true;
  return signals.merchantReliability >= 42 && signals.qualityScore >= 42;
}

function qualityTrustWinsOverPrice(signals: UniversalCalibrationSignals): boolean {
  return (
    signals.trust >= 54 &&
    signals.qualityScore >= 52 &&
    signals.trueValueScore >= 55 &&
    signals.merchantReliability >= 50
  );
}

function labelToTier(label: ShopperRecommendationLabel): CommerceDecisionTier {
  switch (label) {
    case "STRONG BUY":
      return "STRONG BUY";
    case "BUY":
      return "BUY READY";
    case "BEST VALUE":
      return "BEST DEAL";
    case "AVOID":
      return "WAIT";
    default:
      return "COMPARE";
  }
}

function labelToVerdict(label: ShopperRecommendationLabel): PrimaryVerdict {
  if (label === "AVOID") return "AVOID";
  if (label === "COMPARE") return "COMPARE";
  if (label === "BUY" || label === "STRONG BUY" || label === "BEST VALUE") return "BUY READY";
  return "COMPARE";
}

function computeCalibratedConfidence(args: {
  record: RankingDecisionRecord;
  label: ShopperRecommendationLabel;
  signals: UniversalCalibrationSignals;
  hardMismatch: boolean;
}): number {
  const { record, label, signals, hardMismatch } = args;
  const { truthDelta, baseScore, evidenceChain } = record;
  const { relevance, trust, rankIndex, gapToLeader, overallMatch, commerceValueScore, discountVerified } =
    signals;
  const evidenceBoost = Math.min(10, evidenceChain.length * 2);

  if (hardMismatch) {
    return clamp(28 + overallMatch * 0.14 + trust * 0.05, 25, 44);
  }

  let raw =
    34 +
    commerceValueScore * 0.28 +
    trust * 0.12 +
    overallMatch * 0.1 +
    relevance * 0.05 +
    Math.min(12, truthDelta * 1.1) +
    Math.min(6, baseScore * 0.04) +
    (discountVerified ? 5 : 0) +
    evidenceBoost -
    rankIndex * 3.1 -
    gapToLeader * 0.4;

  switch (label) {
    case "STRONG BUY":
      raw = Math.max(raw, 84);
      return clamp(raw, 80, 92);
    case "BUY":
      raw = Math.max(raw, rankIndex === 0 ? 74 : 68);
      return clamp(raw, rankIndex === 0 ? 68 : 68, rankIndex === 0 ? 90 : 79);
    case "BEST VALUE":
      raw = Math.max(raw, 70);
      return clamp(raw, 68, 86);
    case "COMPARE":
      return clamp(raw, 45, 67);
    case "AVOID":
      return clamp(raw, 25, 44);
    default:
      return clamp(raw, 45, 67);
  }
}

/**
 * Universal label policy — commerce value + canonical rank, not query match alone.
 */
export function resolveUniversalShopperLabel(
  signals: UniversalCalibrationSignals,
  hardMismatch: boolean
): ShopperRecommendationLabel {
  if (hardMismatch) return "AVOID";

  const {
    rankIndex,
    gapToLeader,
    leaderGapToSecond,
    finalRankScore,
    topFinalScore,
    truthDelta,
    overallMatch,
    relevance,
    trust,
    commerceValueScore,
  } = signals;

  const clearWin = leaderGapToSecond >= 3 && finalRankScore >= topFinalScore - 0.5;
  const tiedLeader = rankIndex === 0 && leaderGapToSecond < 3;

  if (rankIndex === 0 && overallMatch >= 46 && trust >= 38 && hasAcceptableValue(signals)) {
    if (
      clearWin &&
      truthDelta >= 7 &&
      trust >= 52 &&
      (commerceValueScore >= 52 || truthDelta >= 9)
    ) {
      if (
        truthDelta >= 10 &&
        commerceValueScore >= 65 &&
        (qualityTrustWinsOverPrice(signals) || signals.discountVerified)
      ) {
        return "STRONG BUY";
      }
      return "BUY";
    }

    if (
      tiedLeader &&
      commerceValueScore >= 54 &&
      trust >= 48 &&
      (qualityTrustWinsOverPrice(signals) || truthDelta >= 4 || signals.discountVerified)
    ) {
      return "BUY";
    }

    if (qualityTrustWinsOverPrice(signals) && commerceValueScore >= 54 && trust >= 50) {
      return "BUY";
    }

    if (commerceValueScore >= 54 && trust >= 44) {
      return "COMPARE";
    }
  }

  if (
    rankIndex > 0 &&
    hasStrongValueSignal(signals) &&
    gapToLeader <= 16 &&
    overallMatch >= 44 &&
    (signals.discountVerified || signals.priceAdvantagePct >= 6)
  ) {
    return "BEST VALUE";
  }

  if (overallMatch >= 40 && trust >= 36 && relevance >= 36 && commerceValueScore >= 42) {
    return "COMPARE";
  }

  if (
    rankIndex >= Math.max(1, signals.traySize - 2) &&
    (overallMatch < 42 || trust < 36 || commerceValueScore < 38)
  ) {
    return "AVOID";
  }

  return "COMPARE";
}

function buildCommerceDiscountChips(decision: UniversalProductDecision): ExposureChip[] {
  const intel = decision.productIntelligence;
  if (!intel) return [];

  const chips: ExposureChip[] = [];
  const proof = intel.realDiscountProof;
  const discountConf = intel.discountConfidence;

  if (proof?.verified && !proof.band.includes("Fake")) {
    const line = clipLine(discountConf?.displayLine || proof.displayLine || proof.discountAuthenticityLine, 48);
    if (line) {
      chips.push({
        label: line,
        tone: proof.band.includes("Exceptional") ? "emerald" : "emerald",
        evidence: "positive",
      });
    } else if (proof.verifiedSavingEur > 0) {
      chips.push({
        label: `Verified save €${Math.round(proof.verifiedSavingEur)}`,
        tone: "emerald",
        evidence: "positive",
      });
    }
  } else if (discountConf && discountConf.discountConfidence >= 72 && discountConf.allowsPromotionalWording) {
    chips.push({
      label: clipLine(discountConf.displayLine, 48),
      tone: "amber",
      evidence: "positive",
    });
  }

  if (intel.trueValue?.trueValueScore && intel.trueValue.trueValueScore >= 68) {
    chips.push({
      label: clipLine(intel.trueValue.reasoning || "Strong value signal", 48),
      tone: "violet",
      evidence: "positive",
    });
  }

  return chips.slice(0, 2);
}

function mergeCommerceChips(
  existing: ExposureChip[],
  commerce: ExposureChip[]
): ExposureChip[] {
  const seen = new Set(existing.map((chip) => chip.label.toLowerCase()));
  const merged = [...existing];
  for (const chip of commerce) {
    if (seen.has(chip.label.toLowerCase())) continue;
    seen.add(chip.label.toLowerCase());
    merged.push(chip);
  }
  return merged.slice(0, 3);
}

function patchDecisionLabel(
  decision: UniversalProductDecision,
  label: ShopperRecommendationLabel,
  signals: UniversalCalibrationSignals,
  record: RankingDecisionRecord
): UniversalProductDecision {
  const confidence = computeCalibratedConfidence({
    record,
    label,
    signals,
    hardMismatch: false,
  });
  const intel = decision.productIntelligence;
  return {
    ...decision,
    recommendationLabel: label,
    verdict: labelToVerdict(label),
    confidence,
    confidenceReason: `Decision confidence ${confidence}% — ${label} from commerce value ${signals.commerceValueScore}/100 (rank #${signals.rankIndex + 1}).`,
    productIntelligence: intel
      ? {
          ...intel,
          commercePriorityLabel: label as typeof intel.commercePriorityLabel,
          commerceDecisionCore: intel.commerceDecisionCore
            ? { ...intel.commerceDecisionCore, tier: labelToTier(label), verdict: labelToVerdict(label), decisionConfidence: confidence }
            : intel.commerceDecisionCore,
          buyOpportunityCore: intel.buyOpportunityCore
            ? { ...intel.buyOpportunityCore, tier: labelToTier(label), verdict: labelToVerdict(label) }
            : intel.buyOpportunityCore,
        }
      : intel,
  };
}

/** Tray-level label balance — 0–2 buy-tier labels, mixed COMPARE, no flat clusters. */
export function balanceTrayCommerceLabels(
  tray: Map<string, UniversalProductDecision>,
  orderLinks: string[],
  signalsByLink: Map<string, UniversalCalibrationSignals>
): Map<string, UniversalProductDecision> {
  if (orderLinks.length === 0) return tray;

  const working = new Map(tray);

  const scored = orderLinks
    .map((link) => ({
      link,
      decision: working.get(link),
      signals: signalsByLink.get(link),
    }))
    .filter((row) => row.decision && row.signals) as Array<{
      link: string;
      decision: UniversalProductDecision;
      signals: UniversalCalibrationSignals;
    }>;

  const leader = scored[0];
  if (leader && leader.decision.recommendationLabel === "COMPARE" && !detectHardConstraintMismatch(leader.decision)) {
    const runner = scored[1];
    const valueGap = runner ? leader.signals.commerceValueScore - runner.signals.commerceValueScore : 6;
    if (
      leader.signals.commerceValueScore >= 52 &&
      (valueGap >= 4 || leader.signals.leaderGapToSecond >= 0) &&
      leader.signals.trust >= 44
    ) {
      const record = leader.decision.productIntelligence!.rankingDecisionRecord!;
      working.set(leader.link, patchDecisionLabel(leader.decision, "BUY", leader.signals, record));
    }
  }

  const allCompare =
    scored.length >= 3 &&
    scored.every((row) => row.decision.recommendationLabel === "COMPARE");
  if (allCompare && leader && leader.signals.overallMatch >= 52 && leader.signals.trust >= 38) {
    const record = leader.decision.productIntelligence!.rankingDecisionRecord!;
    working.set(leader.link, patchDecisionLabel(leader.decision, "BUY", leader.signals, record));
  }

  const buyTierRows = scored.filter((row) =>
    BUY_TIER_LABELS.includes(row.decision.recommendationLabel ?? "COMPARE")
  );
  if (buyTierRows.length === 0 && leader && leader.decision.recommendationLabel === "COMPARE") {
    if (leader.signals.overallMatch >= 52 && leader.signals.trust >= 38 && !detectHardConstraintMismatch(leader.decision)) {
      const record = leader.decision.productIntelligence!.rankingDecisionRecord!;
      working.set(leader.link, patchDecisionLabel(leader.decision, "BUY", leader.signals, record));
    }
  }

  const buyTierRowsAfter = scored
    .map((row) => ({ ...row, decision: working.get(row.link) ?? row.decision }))
    .filter((row) => BUY_TIER_LABELS.includes(row.decision.recommendationLabel ?? "COMPARE"));
  if (buyTierRowsAfter.length > MAX_BUY_TIER_PER_TRAY) {
    const sorted = [...buyTierRowsAfter].sort(
      (a, b) => b.signals.commerceValueScore - a.signals.commerceValueScore
    );
    for (const row of sorted.slice(MAX_BUY_TIER_PER_TRAY)) {
      if (row.signals.rankIndex === 0) continue;
      const record = row.decision.productIntelligence!.rankingDecisionRecord!;
      working.set(row.link, patchDecisionLabel(row.decision, "COMPARE", row.signals, record));
    }
  }

  const nonAvoid = scored.filter((row) => {
    const decision = working.get(row.link) ?? row.decision;
    return decision.recommendationLabel !== "AVOID" && row.signals.rankIndex > 0;
  });
  const valueLeader = [...nonAvoid].sort((a, b) => b.signals.commerceValueScore - a.signals.commerceValueScore)[0];
  const hasBuyTier = scored.some((row) =>
    BUY_TIER_LABELS.includes((working.get(row.link) ?? row.decision).recommendationLabel ?? "COMPARE")
  );
  if (
    valueLeader &&
    hasStrongValueSignal(valueLeader.signals) &&
    (working.get(valueLeader.link) ?? valueLeader.decision).recommendationLabel === "COMPARE" &&
    !hasBuyTier
  ) {
    const record = valueLeader.decision.productIntelligence!.rankingDecisionRecord!;
    working.set(
      valueLeader.link,
      patchDecisionLabel(working.get(valueLeader.link) ?? valueLeader.decision, "BEST VALUE", valueLeader.signals, record)
    );
  }

  return working;
}

/** Derive shopper label + confidence from ranking record and tray position. */
export function calibrateShopperDecision(
  decision: UniversalProductDecision,
  context: CanonicalDecisionCalibrationContext
): CalibratedShopperDecision | null {
  const record = decision.productIntelligence?.rankingDecisionRecord;
  const signals = resolveCalibrationSignals(decision, context);
  if (!record || !signals) return null;

  let hardMismatch = detectHardConstraintMismatch(decision);

  if (hardMismatch && context.rankIndex === 0) {
    const foundation = decision.productIntelligence?.truthFoundation;
    const overallMatch = foundation?.productMatch?.overallMatchScore ?? signals.overallMatch;
    if (
      overallMatch >= 46 &&
      signals.trust >= 38 &&
      hasAcceptableValue(signals) &&
      !evidenceIndicatesOverBudget(record.evidenceChain)
    ) {
      hardMismatch = false;
    }
  }

  const { evidenceChain, whyRanked } = record;
  const discountLine = signals.discountDisplayLine;
  const primaryReason = clipLine(
    discountLine ||
      evidenceChain.find((line) => /discount|save|value|verified/i.test(line)) ||
      evidenceChain[0] ||
      whyRanked ||
      decision.reasonLine ||
      "Ranked from commerce value, trust, and price signals."
  );
  const secondaryReason = clipLine(
    evidenceChain.find((line) => line !== primaryReason) ??
      decision.summaryLines?.[1] ??
      `Value ${signals.commerceValueScore}/100 · trust ${signals.trust}/100 · match ${signals.overallMatch}/100.`
  );

  const label = resolveUniversalShopperLabel(signals, hardMismatch);
  const confidence = computeCalibratedConfidence({
    record,
    label,
    signals,
    hardMismatch,
  });

  return {
    label,
    tier: labelToTier(label),
    verdict: labelToVerdict(label),
    confidence,
    reasonLine: primaryReason,
    summaryLines: [primaryReason, secondaryReason],
  };
}

/** Apply calibrated shopper decision onto a universal product decision (display only). */
export function applyCanonicalDecisionCalibration(
  decision: UniversalProductDecision,
  context: CanonicalDecisionCalibrationContext
): UniversalProductDecision {
  const calibrated = calibrateShopperDecision(decision, context);
  if (!calibrated) return decision;

  const intel = decision.productIntelligence;
  const commerceChips = buildCommerceDiscountChips(decision);
  const displayChips = mergeCommerceChips(decision.displayChips, commerceChips);

  const safeIntel = intel
    ? {
        ...intel,
        commercePriorityLabel: calibrated.label as typeof intel.commercePriorityLabel,
        commerceDecisionCore: intel.commerceDecisionCore
          ? {
              ...intel.commerceDecisionCore,
              tier: calibrated.tier,
              verdict: calibrated.verdict,
              decisionConfidence: calibrated.confidence,
            }
          : intel.commerceDecisionCore,
        buyOpportunityCore: intel.buyOpportunityCore
          ? {
              ...intel.buyOpportunityCore,
              tier: calibrated.tier,
              verdict: calibrated.verdict,
            }
          : intel.buyOpportunityCore,
        alignmentFlags: [
          ...(intel.alignmentFlags ?? []),
          "post_phase_a_decision_calibration",
          "universal_decision_calibration",
          "commerce_value_calibration",
          `calibrated_label_${calibrated.label.replace(/\s+/g, "_").toLowerCase()}`,
        ].filter((flag, index, list) => list.indexOf(flag) === index),
      }
    : intel;

  return {
    ...decision,
    recommendationLabel: calibrated.label,
    verdict: calibrated.verdict,
    confidence: calibrated.confidence,
    reasonLine: calibrated.reasonLine,
    primaryReason: calibrated.reasonLine,
    summaryLines: calibrated.summaryLines,
    displayChips,
    confidenceReason: `Decision confidence ${calibrated.confidence}% — ${calibrated.label} from commerce value (final ${intel?.rankingDecisionRecord?.finalRankScore ?? "—"}, truth Δ ${intel?.rankingDecisionRecord?.truthDelta ?? "—"}).`,
    productIntelligence: safeIntel,
  };
}

/** Tray pass — calibrate every row using canonical order and score gaps. */
export function applyTrayCanonicalDecisionCalibration(
  decisions: Map<string, UniversalProductDecision>,
  orderLinks: string[]
): Map<string, UniversalProductDecision> {
  if (orderLinks.length === 0) return decisions;

  const topLink = orderLinks[0]!;
  const secondLink = orderLinks[1];
  const topScore =
    decisions.get(topLink)?.productIntelligence?.rankingDecisionRecord?.finalRankScore ?? 0;
  const secondScore = secondLink
    ? (decisions.get(secondLink)?.productIntelligence?.rankingDecisionRecord?.finalRankScore ?? topScore)
    : topScore;
  const leaderGapToSecond = topScore - secondScore;

  const calibrated = new Map<string, UniversalProductDecision>();
  const signalsByLink = new Map<string, UniversalCalibrationSignals>();

  for (let rankIndex = 0; rankIndex < orderLinks.length; rankIndex += 1) {
    const link = orderLinks[rankIndex]!;
    const decision = decisions.get(link);
    if (!decision) continue;
    const rowScore = decision.productIntelligence?.rankingDecisionRecord?.finalRankScore ?? 0;
    const context: CanonicalDecisionCalibrationContext = {
      rankIndex,
      traySize: orderLinks.length,
      topFinalScore: topScore,
      gapToLeader: topScore - rowScore,
      leaderGapToSecond,
    };
    const signals = resolveCalibrationSignals(decision, context);
    if (signals) signalsByLink.set(link, signals);
    calibrated.set(link, applyCanonicalDecisionCalibration(decision, context));
  }

  return balanceTrayCommerceLabels(calibrated, orderLinks, signalsByLink);
}

/** Align institutional brief recommendation label with calibrated grid #1. */
export function syncCalibratedBriefRecommendationLabel(
  brief: DecisionBriefDTO | null,
  leaderDecision: UniversalProductDecision | null | undefined
): DecisionBriefDTO | null {
  if (!brief || !leaderDecision?.recommendationLabel) return brief;
  if (brief.recommendation.label === leaderDecision.recommendationLabel) return brief;
  return {
    ...brief,
    recommendation: {
      ...brief.recommendation,
      label: leaderDecision.recommendationLabel,
    },
    confidence: leaderDecision.confidence,
  };
}

/** Detect flat 30% confidence clusters in a tray (regression guard). */
export function hasFlatThirtyPercentCluster(confidences: number[], minRepeats = 3): boolean {
  if (confidences.length < minRepeats) return false;
  return confidences.filter((score) => score === 30).length >= minRepeats;
}

/** Detect unhealthy all-same-label clusters. */
export function hasFlatLabelCluster(
  labels: ShopperRecommendationLabel[],
  label: ShopperRecommendationLabel,
  minRepeats = 3
): boolean {
  if (labels.length < minRepeats) return false;
  return labels.filter((row) => row === label).length >= minRepeats;
}

/** Summarize label distribution for probes and regression tests. */
export function summarizeCalibrationLabels(
  decisions: Map<string, UniversalProductDecision>,
  orderLinks: string[]
): {
  counts: Record<ShopperRecommendationLabel, number>;
  confidences: number[];
  labels: ShopperRecommendationLabel[];
  discountChipCount: number;
  uniqueStores: number;
} {
  const counts: Record<ShopperRecommendationLabel, number> = {
    AVOID: 0,
    COMPARE: 0,
    BUY: 0,
    "STRONG BUY": 0,
    "BEST VALUE": 0,
  };
  const confidences: number[] = [];
  const labels: ShopperRecommendationLabel[] = [];
  let discountChipCount = 0;

  for (const link of orderLinks) {
    const decision = decisions.get(link);
    if (!decision?.recommendationLabel) continue;
    counts[decision.recommendationLabel] += 1;
    labels.push(decision.recommendationLabel);
    confidences.push(decision.confidence);
    discountChipCount += (decision.displayChips ?? []).filter((chip) =>
      /discount|save|verified|value/i.test(chip.label)
    ).length;
  }

  return { counts, confidences, labels, discountChipCount, uniqueStores: 0 };
}
