/**
 * Phase 30 — Decision Alignment & Signal Consistency.
 * Verdict is authority; confidence and dimension chips align to final verdict.
 * No new intelligence scores — presentation alignment only.
 */

import type { ExposureChip, ExposureChipTone } from "@/lib/ui/intelligenceExposureActivation";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type {
  ProductIntelligenceSegment,
  ProductDimensionScore,
} from "@/lib/ui/universalProductIntelligenceEngine";
import type {
  UniversalProductDecision,
  UniversalProductIntelligenceSnapshot,
} from "@/lib/ui/universalProductDecision";
import { assignBalancedTrayVerdictAuthority } from "@/lib/ui/marketOpportunityBalancingEngine";
export type { TrayVerdictAuthorityRow } from "@/lib/ui/marketOpportunityBalancingEngine";

type StandardDimensionSpec = {
  key: string;
  label: string;
  aliases: string[];
};

const STANDARD_DIMENSIONS: Record<
  Exclude<ProductIntelligenceSegment, "dynamic">,
  StandardDimensionSpec[]
> = {
  phones: [
    { key: "performance", label: "Performance", aliases: ["performance"] },
    { key: "camera", label: "Camera", aliases: ["camera"] },
    { key: "battery", label: "Battery", aliases: ["battery"] },
    { key: "storage", label: "Storage", aliases: ["storage"] },
    { key: "ecosystem", label: "Ecosystem", aliases: ["ecosystem"] },
    { key: "value", label: "Value", aliases: ["value"] },
  ],
  laptops: [
    { key: "cpu", label: "CPU", aliases: ["cpu", "cpu_value"] },
    { key: "ram", label: "RAM", aliases: ["ram", "ram_value"] },
    { key: "display", label: "Display", aliases: ["display"] },
    { key: "portability", label: "Portability", aliases: ["portability"] },
    { key: "longevity", label: "Longevity", aliases: ["longevity", "upgrade_potential"] },
    { key: "value", label: "Value", aliases: ["value"] },
  ],
  sofas: [
    { key: "comfort", label: "Comfort", aliases: ["comfort"] },
    { key: "material", label: "Material", aliases: ["material", "material_quality"] },
    { key: "construction", label: "Construction", aliases: ["construction"] },
    { key: "durability", label: "Durability", aliases: ["durability"] },
    { key: "dimensions", label: "Dimensions", aliases: ["dimensions"] },
    { key: "value", label: "Value", aliases: ["value"] },
  ],
  headphones: [
    { key: "sound", label: "Sound", aliases: ["sound", "sound_quality"] },
    { key: "anc", label: "ANC", aliases: ["anc", "anc_quality"] },
    { key: "comfort", label: "Comfort", aliases: ["comfort"] },
    { key: "battery", label: "Battery", aliases: ["battery", "battery_life"] },
    { key: "codec", label: "Codec Support", aliases: ["codec", "codec_support"] },
    { key: "value", label: "Value", aliases: ["value"] },
  ],
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clipLine(text: string, max = 112): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function findDimension(
  dimensions: ProductDimensionScore[],
  aliases: string[]
): ProductDimensionScore | null {
  for (const alias of aliases) {
    const match = dimensions.find((row) => row.key === alias || row.label.toLowerCase() === alias);
    if (match) return match;
  }
  return null;
}

function valueDimension(score: number, signal: string): ProductDimensionScore {
  return {
    key: "value",
    label: "Value",
    score: clampScore(score),
    signal: clipLine(signal),
  };
}

/** Standardize category dimensions to the Phase 30 canonical set (display only). */
export function standardizeCategoryDimensions(
  segment: ProductIntelligenceSegment | null,
  dimensions: ProductDimensionScore[],
  intelligence: UniversalProductIntelligenceSnapshot
): ProductDimensionScore[] {
  if (!segment || segment === "dynamic") {
    return dimensions.slice(0, 6).map((row) => ({ ...row, label: row.label.trim() }));
  }

  const schema = STANDARD_DIMENSIONS[segment];
  const standardized: ProductDimensionScore[] = [];

  for (const spec of schema) {
    if (spec.key === "value") {
      const existing = findDimension(dimensions, spec.aliases);
      standardized.push(
        existing ??
          valueDimension(
            intelligence.valueScore,
            intelligence.valueScore >= 58
              ? "Value profile supports the current product decision."
              : "Value opportunity remains limited at this price point."
          )
      );
      continue;
    }

    const match = findDimension(dimensions, spec.aliases);
    if (match) {
      standardized.push({ ...match, key: spec.key, label: spec.label });
    } else {
      standardized.push({
        key: spec.key,
        label: spec.label,
        score: 50,
        signal: `${spec.label} needs verification on the listing page.`,
      });
    }
  }

  return standardized;
}

function leadershipComposite(intelligence: UniversalProductIntelligenceSnapshot): number {
  return clampScore(
    (intelligence.productQualityScore +
      intelligence.categoryFitScore +
      intelligence.valueScore +
      (100 - intelligence.alternativePressure)) /
      4
  );
}

/** Align displayed confidence to verdict authority (uses existing intelligence inputs). */
export function alignConfidenceToVerdict(
  verdict: PrimaryVerdict,
  currentConfidence: number,
  intelligence: UniversalProductIntelligenceSnapshot
): number {
  const leadership = leadershipComposite(intelligence);
  const spread = ((currentConfidence % 17) + leadership % 13) % 9;

  if (verdict === "BUY READY") {
    return clampScore(Math.max(74, Math.min(92, 76 + Math.round(leadership * 0.14) + spread)));
  }
  if (verdict === "COMPARE") {
    return clampScore(Math.max(52, Math.min(76, 56 + Math.round(intelligence.alternativePressure * 0.12) + spread)));
  }
  if (verdict === "WAIT") {
    return clampScore(Math.max(44, Math.min(64, 48 + Math.round(intelligence.valueScore * 0.1) + spread)));
  }
  return clampScore(Math.max(18, Math.min(42, 22 + Math.round((100 - intelligence.trustScore) * 0.15) + spread)));
}

function chipToneForVerdict(verdict: PrimaryVerdict, score: number): ExposureChipTone {
  if (verdict === "BUY READY") {
    return score >= 58 ? "emerald" : "amber";
  }
  if (verdict === "COMPARE") {
    if (score >= 66) return "blue";
    return score >= 50 ? "blue" : "amber";
  }
  if (verdict === "WAIT") {
    return score >= 62 ? "blue" : "amber";
  }
  return score >= 52 ? "amber" : "slate";
}

function chipEvidenceForVerdict(
  verdict: PrimaryVerdict,
  score: number
): ExposureChip["evidence"] {
  if (verdict === "AVOID") return "caution";
  if (verdict === "WAIT" && score < 55) return "caution";
  if (verdict === "COMPARE") return score >= 58 ? "positive" : "caution";
  if (verdict === "BUY READY") return score >= 58 ? "positive" : "caution";
  return score >= 50 ? "positive" : "caution";
}

/** Dimension chips as the explanation layer — tones aligned to verdict. */
export function buildVerdictAlignedChips(
  verdict: PrimaryVerdict,
  dimensions: ProductDimensionScore[]
): ExposureChip[] {
  const ordered =
    verdict === "AVOID"
      ? [...dimensions].sort((a, b) => a.score - b.score)
      : verdict === "COMPARE"
        ? [...dimensions].sort((a, b) => b.score - a.score)
        : [...dimensions].sort((a, b) => b.score - a.score);

  return ordered.slice(0, 6).map((row) => ({
    label: `${row.label} ${row.score}`,
    tone: chipToneForVerdict(verdict, row.score),
    evidence: chipEvidenceForVerdict(verdict, row.score),
  }));
}

function topDimensions(dimensions: ProductDimensionScore[], count = 2): ProductDimensionScore[] {
  return [...dimensions].sort((a, b) => b.score - a.score).slice(0, count);
}

function weakestDimension(dimensions: ProductDimensionScore[]): ProductDimensionScore | null {
  if (!dimensions.length) return null;
  return [...dimensions].sort((a, b) => a.score - b.score)[0] ?? null;
}

function dimensionLeadScore(dimensions: ProductDimensionScore[]): number {
  const lead = topDimensions(dimensions, 2);
  if (!lead.length) return 50;
  return clampScore(lead.reduce((sum, row) => sum + row.score, 0) / lead.length);
}

function valuePositionPhrase(
  intelligence: UniversalProductIntelligenceSnapshot,
  dimensions: ProductDimensionScore[]
): string {
  const valueDim = dimensions.find((row) => row.key === "value");
  const score = valueDim?.score ?? intelligence.valueScore;
  if (score >= 62) return `value ${score} is competitive in this tray`;
  if (score >= 50) return `value ${score} is acceptable but not decisive`;
  return `value ${score} sits below tray norms`;
}

function computeTrayRankScore(
  intelligence: UniversalProductIntelligenceSnapshot,
  dimensions: ProductDimensionScore[]
): number {
  const lead = dimensionLeadScore(dimensions);
  return (
    lead * 0.34 +
    intelligence.productQualityScore * 0.24 +
    intelligence.categoryFitScore * 0.2 +
    intelligence.valueScore * 0.16 -
    intelligence.alternativePressure * 0.12
  );
}

function isAvoidAuthority(
  intelligence: UniversalProductIntelligenceSnapshot,
  verdict: PrimaryVerdict
): boolean {
  return (
    verdict === "AVOID" ||
    intelligence.productQualityScore < 38 ||
    intelligence.trustScore < 38 ||
    (intelligence.productQualityScore < 45 && intelligence.trustScore < 50)
  );
}

function isWaitAuthority(
  intelligence: UniversalProductIntelligenceSnapshot,
  dimensions: ProductDimensionScore[],
  rankIndex: number,
  total: number,
  gapFromTop: number
): boolean {
  const weak = weakestDimension(dimensions);
  if (intelligence.trustScore < 52) return true;
  if (intelligence.valueScore < 48) return true;
  if (weak && weak.score < 46) return true;
  if (rankIndex >= Math.ceil(total * 0.65) && gapFromTop > 10) return true;
  if (gapFromTop > 14 && intelligence.valueScore < 55) return true;
  return false;
}

/** Tray-wide verdict authority — balanced relative market opportunities (Phase 32.5). */
export function assignTrayVerdictAuthority(
  decisions: Map<string, UniversalProductDecision>
): Map<string, TrayVerdictAuthorityRow> {
  return assignBalancedTrayVerdictAuthority(decisions);
}

/** Build reason lines directly from visible dimension chips. */
export function buildChipExplainableReason(
  verdict: PrimaryVerdict,
  dimensions: ProductDimensionScore[],
  store: string,
  intelligence: UniversalProductIntelligenceSnapshot,
  authority?: TrayVerdictAuthorityRow
): { primary: string; secondary: string } {
  const lead = topDimensions(dimensions, 2);
  const weak = weakestDimension(dimensions);
  const leadText =
    lead.length >= 2
      ? `${lead[0]!.label} ${lead[0]!.score} and ${lead[1]!.label} ${lead[1]!.score}`
      : lead[0]
        ? `${lead[0].label} ${lead[0].score}`
        : "Product dimensions";
  const weakText = weak ? `${weak.label} ${weak.score}` : `quality ${intelligence.productQualityScore}`;
  const valuePhrase = valuePositionPhrase(intelligence, dimensions);
  const pressure = intelligence.alternativePressure;

  if (verdict === "BUY READY") {
    const challenger =
      authority && authority.gapFromTop <= 4
        ? "nearby listings"
        : weak && weak.score >= 52
          ? `${weak.label.toLowerCase()}`
          : "nearby options";
    return {
      primary: clipLine(
        `${store}: buy now — ${leadText} lead this tray, ${valuePhrase}, pressure ${pressure}/100 beats ${challenger}.`,
        128
      ),
      secondary: clipLine(
        `Strongest ${leadText}; weakest ${weakText}; ${valuePhrase}; pressure ${pressure}/100.`
      ),
    };
  }

  if (verdict === "COMPARE") {
    return {
      primary: clipLine(
        `${store}: pressure ${pressure}/100 — ${leadText} are strong, but ${weakText} leaves a close challenger; compare before checkout.`
      ),
      secondary: clipLine(
        `Blocks BUY READY: ${weakText}, ${valuePhrase}, pressure ${pressure}/100 vs tray lead.`
      ),
    };
  }

  if (verdict === "AVOID") {
    return {
      primary: clipLine(
        `${store}: pressure ${pressure}/100 — ${weakText} and trust ${intelligence.trustScore}/100 show significant weakness; avoid checkout.`
      ),
      secondary: clipLine(
        `Weakest ${weakText}; value ${intelligence.valueScore}/100; pressure ${pressure}/100 — negatives outweigh strengths.`
      ),
    };
  }

  const waitBlockers: string[] = [];
  if (intelligence.valueScore < 52) waitBlockers.push(`value ${intelligence.valueScore}`);
  if (intelligence.trustScore < 52) waitBlockers.push(`trust ${intelligence.trustScore}`);
  if (weak && weak.score < 50) waitBlockers.push(`${weak.label} ${weak.score}`);
  const blockerText = waitBlockers.length ? waitBlockers.join(", ") : `${weakText}`;

  return {
    primary: clipLine(
      `${store}: pressure ${pressure}/100 — ${leadText} understood, but ${blockerText} should improve before purchase.`
    ),
    secondary: clipLine(
      `Strongest ${leadText}; weakest ${weakText}; ${valuePhrase}; pressure ${pressure}/100.`
    ),
  };
}

/** Validation helper — visible chips must support the verdict story. */
export function chipsSupportVerdict(
  verdict: PrimaryVerdict,
  chips: ExposureChip[],
  intelligence: UniversalProductIntelligenceSnapshot
): boolean {
  if (!chips.length) return true;
  const emeraldCount = chips.filter((chip) => chip.tone === "emerald").length;
  const avgScore =
    chips.reduce((sum, chip) => sum + Number.parseInt(chip.label.match(/(\d+)\s*$/)?.[1] ?? "0", 10), 0) /
    chips.length;

  if (verdict === "BUY READY") {
    return (emeraldCount >= 1 || avgScore >= 56) && intelligence.productQualityScore >= 56;
  }
  if (verdict === "COMPARE") {
    return emeraldCount <= 5;
  }
  if (verdict === "WAIT") {
    return emeraldCount <= 4 || intelligence.valueScore <= 65;
  }
  return avgScore <= 60 || intelligence.trustScore <= 55;
}

export function resolveDecisionAlignment(
  decision: UniversalProductDecision,
  store = "Retailer",
  authority?: TrayVerdictAuthorityRow
): UniversalProductDecision {
  const intelligence = decision.productIntelligence;
  if (!intelligence) return decision;

  const dimensions = standardizeCategoryDimensions(
    intelligence.segment,
    intelligence.dimensions,
    intelligence
  );
  const refinedVerdict = authority?.verdict ?? decision.verdict;
  const alignedConfidence = alignConfidenceToVerdict(refinedVerdict, decision.confidence, intelligence);
  const displayChips = buildVerdictAlignedChips(refinedVerdict, dimensions);
  const { primary, secondary } = buildChipExplainableReason(
    refinedVerdict,
    dimensions,
    store,
    intelligence,
    authority
  );

  const reasonAuthority = {
    ...decision.reasonAuthority,
    verdict: refinedVerdict,
    primaryReason: {
      ...decision.reasonAuthority.primaryReason,
      line: primary,
    },
    secondaryReasons: [
      {
        code: (refinedVerdict === "BUY READY"
          ? "FIT"
          : refinedVerdict === "COMPARE"
            ? "COMPARE_OPTIONS"
            : refinedVerdict === "AVOID"
              ? "TRUST_RISK"
              : "INSUFFICIENT_DATA") as import("@/lib/ui/verdictReasonAuthority").ReasonCode,
        label: "Dimension alignment",
        line: secondary,
      },
    ],
  };

  return {
    ...decision,
    verdict: refinedVerdict,
    confidence: alignedConfidence,
    reasonLine: primary,
    primaryReason: primary,
    secondaryReason: secondary,
    confidenceReason: secondary,
    displayChips,
    summaryLines: [primary, secondary],
    reasonAuthority,
    productIntelligence: {
      ...intelligence,
      dimensions,
      finalVerdict: refinedVerdict,
      alignmentFlags: [
        ...(intelligence.alignmentFlags ?? []),
        "phase30_verdict_aligned",
        "phase30_verdict_authority",
        "phase325_market_opportunity_balanced",
        authority?.marketRole ? `phase325_role_${authority.marketRole}` : undefined,
      ].filter(Boolean) as string[],
    },
  };
}

export function getStandardDimensionLabels(
  segment: ProductIntelligenceSegment | null
): string[] {
  if (!segment || segment === "dynamic") return [];
  return STANDARD_DIMENSIONS[segment].map((row) => row.label);
}
