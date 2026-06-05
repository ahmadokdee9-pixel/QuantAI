/**
 * QUANTAI_PHASE_26_2_STABLE_FROZEN — DO NOT MODIFY (reason authority / pipeline).
 * Phase 26.2 — Verdict Reason Authority.
 * One dominant reason per verdict; card evidence filtered to match (presentation only).
 */

import type { ActivatedAlternativeAdvantage } from "@/lib/ui/alternativeAdvantageActivation";
import type { ActivatedBuyWait } from "@/lib/ui/buyWaitActivation";
import type { ActivatedCategoryIntelligence } from "@/lib/ui/categoryIntelligenceActivation";
import type { ActivatedDiscountTruth } from "@/lib/ui/discountTruthActivation";
import type { ActivatedIntentIntelligence } from "@/lib/ui/intentIntelligenceActivation";
import type { ActivatedPriceTarget } from "@/lib/ui/priceTargetActivation";
import type { ActivatedTrustRisk } from "@/lib/ui/trustRiskActivation";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";

export type BuyDriver = "VALUE" | "PRICE" | "TRUST" | "QUALITY" | "FIT" | "RARITY";
export type WaitBlocker =
  | "PRICE_TOO_HIGH"
  | "LOW_CONFIDENCE"
  | "INSUFFICIENT_DATA"
  | "BETTER_OPTIONS_EXIST"
  | "MARKET_RISK";
export type AvoidRisk =
  | "TRUST_RISK"
  | "QUALITY_RISK"
  | "LISTING_RISK"
  | "PRICE_MANIPULATION"
  | "INSUFFICIENT_VERIFICATION";
export type CompareReason = "COMPARE_OPTIONS";

export type ReasonCode = BuyDriver | WaitBlocker | AvoidRisk | CompareReason;

export type ReasonItem = {
  code: ReasonCode;
  label: string;
  line: string;
};

export type ReasonEvidenceRole = "primary" | "secondary" | "rejected";

export type VerdictReasonAuthority = {
  verdict: PrimaryVerdict;
  primaryReason: ReasonItem;
  secondaryReasons: ReasonItem[];
  rejectedReasons: ReasonItem[];
};

export type ReasonLayerInput = {
  verdict: PrimaryVerdict;
  alignmentScore: number;
  isLeadProduct: boolean;
  rankingRationaleLine: string;
  discountTruth: ActivatedDiscountTruth;
  buyWait: ActivatedBuyWait;
  priceTarget: ActivatedPriceTarget;
  alternativeAdvantage: ActivatedAlternativeAdvantage;
  categoryIntelligence: ActivatedCategoryIntelligence;
  intentIntelligence: ActivatedIntentIntelligence;
  trustRisk: ActivatedTrustRisk;
};

const REASON_COPY: Record<ReasonCode, { label: string; line: string }> = {
  VALUE: { label: "Value", line: "Genuine value versus tray peers supports moving forward." },
  PRICE: { label: "Price", line: "Price window and opportunity signals favor checkout now." },
  TRUST: { label: "Trust", line: "Seller and marketplace trust clear the buy threshold." },
  QUALITY: { label: "Quality", line: "Category quality signals are strong for this listing." },
  FIT: { label: "Fit", line: "Best match for your search intent." },
  RARITY: { label: "Rarity", line: "Lead listing is the strongest rare fit in this tray." },
  PRICE_TOO_HIGH: {
    label: "Price too high",
    line: "Current price remains above fair historical value.",
  },
  LOW_CONFIDENCE: {
    label: "Low confidence",
    line: "Decision confidence is too limited for a buy-ready call.",
  },
  INSUFFICIENT_DATA: {
    label: "Insufficient data",
    line: "Listing depth is too thin to justify checkout yet.",
  },
  BETTER_OPTIONS_EXIST: {
    label: "Better options exist",
    line: "Strong option but better alternatives exist on this tray.",
  },
  MARKET_RISK: {
    label: "Market risk",
    line: "Market risk flags recommend waiting before purchase.",
  },
  TRUST_RISK: { label: "Trust risk", line: "Trust posture fails checkout safety checks." },
  QUALITY_RISK: { label: "Quality risk", line: "Quality signals trail stronger tray alternatives." },
  LISTING_RISK: { label: "Listing risk", line: "Listing integrity raises checkout risk." },
  PRICE_MANIPULATION: {
    label: "Price manipulation",
    line: "Discount hygiene looks manipulated — avoid this offer.",
  },
  INSUFFICIENT_VERIFICATION: {
    label: "Insufficient verification",
    line: "Verification depth is too weak to trust this listing.",
  },
  COMPARE_OPTIONS: {
    label: "Compare options",
    line: "Compare trusted alternatives before choosing a lane.",
  },
};

function clipLine(text: string, max = 112): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function reasonItem(code: ReasonCode, lineOverride?: string): ReasonItem {
  const copy = REASON_COPY[code];
  return {
    code,
    label: copy.label,
    line: clipLine(lineOverride || copy.line, 96),
  };
}

function rankedReasons<T extends string>(
  scores: Record<T, number>,
  order: readonly T[],
  minSecondary = 12
): { primary: T; secondary: T[]; rejected: T[] } {
  const sorted = [...order].sort((a, b) => scores[b] - scores[a]);
  const primary = sorted[0]!;
  const secondary = sorted.filter((code) => code !== primary && scores[code] >= minSecondary).slice(0, 2);
  const rejected = sorted.filter((code) => code !== primary && !secondary.includes(code));
  return { primary, secondary, rejected };
}

function buildBuyAuthority(input: ReasonLayerInput): VerdictReasonAuthority {
  const {
    discountTruth,
    buyWait,
    priceTarget,
    trustRisk,
    categoryIntelligence,
    intentIntelligence,
    rankingRationaleLine,
    isLeadProduct,
  } = input;
  const genuine =
    discountTruth.verdict === "Genuine" || discountTruth.verdict === "Likely Genuine";
  const rankedFirst = /ranked first/i.test(rankingRationaleLine);

  const scores: Record<BuyDriver, number> = {
    VALUE: genuine ? discountTruth.confidence : 0,
    PRICE:
      (buyWait.verdict === "BUY NOW" ? 42 : 0) +
      (priceTarget.potentialSavings >= 5 ? 28 : 0) +
      Math.max(0, 30 - (priceTarget.distanceFromLowPct ?? 30)),
    TRUST: trustRisk.trustScore >= 62 && trustRisk.riskScore < 52 ? trustRisk.trustScore : 0,
    QUALITY: categoryIntelligence.categoryScore,
    FIT: intentIntelligence.intentMatchScore,
    RARITY: rankedFirst && isLeadProduct ? 58 : 0,
  };

  const ranked = rankedReasons(scores, ["FIT", "TRUST", "VALUE", "PRICE", "QUALITY", "RARITY"] as const);
  const layerLine = pickLayerLine(input, ranked.primary);
  return {
    verdict: "BUY READY",
    primaryReason: reasonItem(ranked.primary, layerLine),
    secondaryReasons: ranked.secondary.map((code) => reasonItem(code)),
    rejectedReasons: ranked.rejected.map((code) => reasonItem(code)),
  };
}

function buildWaitAuthority(input: ReasonLayerInput): VerdictReasonAuthority {
  const {
    discountTruth,
    priceTarget,
    alternativeAdvantage,
    trustRisk,
    alignmentScore,
    isLeadProduct,
  } = input;
  const inflated =
    discountTruth.verdict === "Inflated" || discountTruth.verdict === "Likely Inflated";
  const priceElevated =
    (priceTarget.distanceFromLowPct ?? 0) >= 5 || priceTarget.potentialSavings >= 5;
  const betterAlt =
    !isLeadProduct ||
    alternativeAdvantage.leadAdvantageScore < 55 ||
    /better alternative|stronger option/i.test(alternativeAdvantage.comparisonSummary);

  const scores: Record<WaitBlocker, number> = {
    PRICE_TOO_HIGH: priceElevated ? 70 : 0,
    LOW_CONFIDENCE: alignmentScore < 68 ? 65 : 0,
    INSUFFICIENT_DATA: trustRisk.factors.insufficientInformationRisk,
    BETTER_OPTIONS_EXIST: betterAlt ? 62 : 0,
    MARKET_RISK:
      (inflated ? 55 : 0) + (trustRisk.riskScore >= 50 ? trustRisk.riskScore - 20 : 0),
  };

  const ranked = rankedReasons(
    scores,
    [
      "PRICE_TOO_HIGH",
      "MARKET_RISK",
      "BETTER_OPTIONS_EXIST",
      "LOW_CONFIDENCE",
      "INSUFFICIENT_DATA",
    ] as const
  );
  const layerLine = pickLayerLine(input, ranked.primary);
  return {
    verdict: "WAIT",
    primaryReason: reasonItem(ranked.primary, layerLine),
    secondaryReasons: ranked.secondary.map((code) => reasonItem(code)),
    rejectedReasons: ranked.rejected.map((code) => reasonItem(code)),
  };
}

function buildAvoidAuthority(input: ReasonLayerInput): VerdictReasonAuthority {
  const { discountTruth, trustRisk, categoryIntelligence } = input;
  const inflated =
    discountTruth.verdict === "Inflated" || discountTruth.verdict === "Likely Inflated";

  const scores: Record<AvoidRisk, number> = {
    TRUST_RISK: trustRisk.riskScore,
    QUALITY_RISK: Math.max(0, 72 - categoryIntelligence.categoryScore),
    LISTING_RISK: trustRisk.factors.suspiciousOfferRisk,
    PRICE_MANIPULATION: inflated ? 75 : discountTruth.verdict === "Likely Inflated" ? 55 : 0,
    INSUFFICIENT_VERIFICATION: trustRisk.factors.insufficientInformationRisk,
  };

  const ranked = rankedReasons(
    scores,
    [
      "TRUST_RISK",
      "PRICE_MANIPULATION",
      "LISTING_RISK",
      "INSUFFICIENT_VERIFICATION",
      "QUALITY_RISK",
    ] as const
  );
  const layerLine = pickLayerLine(input, ranked.primary);
  return {
    verdict: "AVOID",
    primaryReason: reasonItem(ranked.primary, layerLine),
    secondaryReasons: ranked.secondary.map((code) => reasonItem(code)),
    rejectedReasons: ranked.rejected.map((code) => reasonItem(code)),
  };
}

function buildCompareAuthority(input: ReasonLayerInput): VerdictReasonAuthority {
  const betterAlt =
    !input.isLeadProduct ||
    input.alternativeAdvantage.leadAdvantageScore < 55 ||
    /better alternative|stronger option/i.test(input.alternativeAdvantage.comparisonSummary);

  const primary = reasonItem("COMPARE_OPTIONS");
  const secondary = betterAlt ? [reasonItem("BETTER_OPTIONS_EXIST")] : [];
  const rejected: ReasonItem[] = [];
  if (!betterAlt) rejected.push(reasonItem("BETTER_OPTIONS_EXIST"));
  rejected.push(reasonItem("TRUST"));
  return {
    verdict: "COMPARE",
    primaryReason: primary,
    secondaryReasons: secondary,
    rejectedReasons: rejected,
  };
}

function pickLayerLine(input: ReasonLayerInput, code: ReasonCode): string | undefined {
  const {
    intentIntelligence,
    priceTarget,
    buyWait,
    discountTruth,
    trustRisk,
    alternativeAdvantage,
    categoryIntelligence,
  } = input;
  switch (code) {
    case "FIT":
      return clipLine(intentIntelligence.matchExplanation || intentIntelligence.intentReasons[0], 96);
    case "PRICE":
      return clipLine(priceTarget.reason || buyWait.explanation, 96);
    case "VALUE":
      return clipLine(discountTruth.explanation || discountTruth.reason, 96);
    case "TRUST":
      return clipLine(trustRisk.trustReason, 96);
    case "QUALITY":
      return clipLine(categoryIntelligence.categoryStrengths[0] || categoryIntelligence.cardLine, 96);
    case "RARITY":
      return clipLine(alternativeAdvantage.comparisonSummary, 96);
    case "PRICE_TOO_HIGH":
      return clipLine(priceTarget.explanation || priceTarget.reason, 96);
    case "BETTER_OPTIONS_EXIST":
      return clipLine(alternativeAdvantage.comparisonSummary, 96);
    case "MARKET_RISK":
      return clipLine(trustRisk.riskReason, 96);
    case "TRUST_RISK":
      return clipLine(trustRisk.riskReason || trustRisk.trustReason, 96);
    case "PRICE_MANIPULATION":
      return clipLine(discountTruth.reason || discountTruth.explanation, 96);
    case "LISTING_RISK":
      return clipLine(trustRisk.riskReason, 96);
    case "INSUFFICIENT_VERIFICATION":
    case "INSUFFICIENT_DATA":
      return clipLine(trustRisk.cardLine, 96);
    case "LOW_CONFIDENCE":
      return undefined;
    default:
      return undefined;
  }
}

/** Resolve one dominant reason set for a product verdict (existing layers only). */
export function resolveProductReasonAuthority(input: ReasonLayerInput): VerdictReasonAuthority {
  switch (input.verdict) {
    case "BUY READY":
      return buildBuyAuthority(input);
    case "WAIT":
      return buildWaitAuthority(input);
    case "AVOID":
      return buildAvoidAuthority(input);
    case "COMPARE":
      return buildCompareAuthority(input);
  }
}

export function reasonCodesForAuthority(authority: VerdictReasonAuthority): Set<ReasonCode> {
  return new Set([
    authority.primaryReason.code,
    ...authority.secondaryReasons.map((item) => item.code),
  ]);
}

export function evidenceRoleForCode(
  authority: VerdictReasonAuthority,
  code: ReasonCode
): ReasonEvidenceRole {
  if (authority.primaryReason.code === code) return "primary";
  if (authority.secondaryReasons.some((item) => item.code === code)) return "secondary";
  return "rejected";
}

/** Map compact evidence chip labels to reason codes. */
export function reasonCodeForChipLabel(label: string): ReasonCode | null {
  const normalized = label.replace(/^[✓⚠]\s*/, "").trim().toLowerCase();
  const map: Record<string, ReasonCode> = {
    "trusted seller": "TRUST",
    "ranked first": "FIT",
    "buy window active": "PRICE",
    "genuine discount": "VALUE",
    "strong intent match": "FIT",
    "price elevated": "PRICE_TOO_HIGH",
    "wait recommended": "MARKET_RISK",
    "inflated discount": "PRICE_MANIPULATION",
    "elevated risk": "TRUST_RISK",
    "trust concerns": "TRUST_RISK",
    "suspicious offer": "LISTING_RISK",
    "better alternative found": "BETTER_OPTIONS_EXIST",
    "compare options": "COMPARE_OPTIONS",
  };
  return map[normalized] ?? null;
}

export function filterChipsForReasonAuthority<T extends { label: string }>(
  chips: T[],
  authority: VerdictReasonAuthority
): T[] {
  const allowed = reasonCodesForAuthority(authority);
  return chips
    .filter((chip) => {
      const code = reasonCodeForChipLabel(chip.label);
      return code != null && allowed.has(code);
    })
    .slice(0, 3);
}

export function buildSurfaceSummaryLines(authority: VerdictReasonAuthority): [string, string] {
  const primary = authority.primaryReason.line;
  const secondary = authority.secondaryReasons[0]?.line ?? "";
  return [primary, secondary];
}

/** Tray reason authority aggregated from card-level reason objects. */
export function resolveTrayReasonAuthority(
  decisions: Iterable<CoherentProductDecision>,
  trayVerdict: PrimaryVerdict
): VerdictReasonAuthority {
  const list = [...decisions];
  const actionable = list.filter((row) => row.verdict === trayVerdict);
  const pool = actionable.length ? actionable : list;

  const scoreByCode = new Map<ReasonCode, number>();
  for (const row of pool) {
    const authority = row.reasonAuthority;
    if (!authority) continue;
    scoreByCode.set(
      authority.primaryReason.code,
      (scoreByCode.get(authority.primaryReason.code) ?? 0) + row.alignmentScore
    );
    for (const secondary of authority.secondaryReasons) {
      scoreByCode.set(
        secondary.code,
        (scoreByCode.get(secondary.code) ?? 0) + Math.round(row.alignmentScore * 0.45)
      );
    }
  }

  const codes = [...scoreByCode.entries()].sort((a, b) => b[1] - a[1]).map(([code]) => code);
  const primaryCode =
    codes[0] ??
    (trayVerdict === "BUY READY"
      ? "FIT"
      : trayVerdict === "WAIT"
        ? "PRICE_TOO_HIGH"
        : trayVerdict === "AVOID"
          ? "TRUST_RISK"
          : "COMPARE_OPTIONS");

  const primaryReason = reasonItem(primaryCode);
  const secondaryReasons = codes
    .slice(1, 3)
    .filter((code) => code !== primaryCode)
    .map((code) => reasonItem(code));

  const rejectedPool = new Set<ReasonCode>();
  for (const row of list) {
    for (const rejected of row.reasonAuthority?.rejectedReasons ?? []) {
      if (rejected.code !== primaryCode && !secondaryReasons.some((s) => s.code === rejected.code)) {
        rejectedPool.add(rejected.code);
      }
    }
  }
  const rejectedReasons = [...rejectedPool].slice(0, 3).map((code) => reasonItem(code));

  return {
    verdict: trayVerdict,
    primaryReason,
    secondaryReasons,
    rejectedReasons,
  };
}

export function buildTrayReasonNarrative(authority: VerdictReasonAuthority): {
  winningLine: string;
  losingLines: string[];
  synthesis: string;
} {
  const winningLine = clipLine(
    `${authority.primaryReason.label} won — ${authority.primaryReason.line}`,
    220
  );
  const losingLines = authority.rejectedReasons.map((item) =>
    clipLine(`${item.label} rejected — ${item.line}`, 160)
  );
  const secondaryNote = authority.secondaryReasons[0]
    ? clipLine(`Supporting signal: ${authority.secondaryReasons[0].label}.`, 120)
    : "";
  const synthesis = clipLine(
    [winningLine, secondaryNote, losingLines[0]].filter(Boolean).join(" "),
    280
  );
  return { winningLine, losingLines, synthesis };
}

/** Compact surface evidence must support dominant reason (validation helper). */
export function surfaceEvidenceSupportsAuthority(
  chips: Array<{ label: string }>,
  authority: VerdictReasonAuthority
): boolean {
  if (!chips.length) return true;
  const allowed = reasonCodesForAuthority(authority);
  return chips.every((chip) => {
    const code = reasonCodeForChipLabel(chip.label);
    return code != null && allowed.has(code);
  });
}
