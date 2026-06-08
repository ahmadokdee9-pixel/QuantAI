/**
 * Phase 34 — Preference Intelligence + Taste Engine + Buyer Identity activation.
 * Chains after Phase 33 — intelligence only, no UI changes.
 */

import {
  buildAdvancedCommerceReasoning,
  reasoningIsAnalystGrade,
  type AdvancedCommerceReasoning,
} from "@/lib/intelligence/advancedCommerceReasoningEngine";
import { detectBuyerIdentity, type BuyerIdentityProfile } from "@/lib/intelligence/buyerIdentityEngine";
import type { CommerceIntelligenceAuthority } from "@/lib/intelligence/commerceIntelligenceAuthorityEngine";
import {
  buildPersonalizedDecisionScores,
  hasStrongScoreSeparation,
  type PersonalizedDecisionScore,
} from "@/lib/intelligence/personalizedDecisionScoringEngine";
import { preferenceMemoryHook } from "@/lib/intelligence/preferenceMemoryHooks";
import {
  computeTasteMatchScore,
  detectTastePreferences,
  type TasteMatchResult,
  type TastePreferenceProfile,
} from "@/lib/intelligence/tasteMatchEngine";
import { getCategoryProfile, resolveCategoryProfileKey } from "@/lib/intelligence/categoryProfileRegistry";
import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import {
  assignPreferenceAwareVerdicts,
  type PreferenceVerdictRow,
} from "@/lib/ui/preferenceVerdictEngine";
import {
  buildCommerceIntelligenceDecisionMap,
  buildCommerceIntelligenceDisplayCoherenceByLink,
} from "@/lib/ui/phase33CommerceIntelligenceActivation";
import type { ProductTrayMeta } from "@/lib/ui/productDifferentiationEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";

function clipLine(text: string, max = 160): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function isAvoidProfile(decision: UniversalProductDecision): boolean {
  const intel = decision.productIntelligence;
  return (
    decision.verdict === "AVOID" ||
    (intel?.productQualityScore ?? 50) < 38 ||
    (intel?.trustScore ?? 50) < 40
  );
}

function applyPreferenceIntelligence(
  decision: UniversalProductDecision,
  product: QuantProduct,
  searchQuery: string,
  buyer: BuyerIdentityProfile,
  tastePref: TastePreferenceProfile,
  tasteMatch: TasteMatchResult,
  personalized: PersonalizedDecisionScore,
  commerce: CommerceIntelligenceAuthority,
  reasoning: AdvancedCommerceReasoning,
  verdictRow?: PreferenceVerdictRow
): UniversalProductDecision {
  const intelligence = decision.productIntelligence;
  if (!intelligence) return decision;

  const verdict = verdictRow?.verdict ?? decision.verdict;
  const profileKey = resolveCategoryProfileKey(intelligence.segment, product.title, searchQuery);
  const profile = getCategoryProfile(profileKey);

  const decisionThesis = clipLine(reasoning.analystSummary);
  const primaryReason = clipLine(reasoning.whyWins);
  const purchaseReasoning = clipLine(
    [reasoning.whyCompetitorsLose, reasoning.improvementPath].filter(Boolean).join(" ")
  );

  return {
    ...decision,
    verdict,
    decisionThesis,
    reasonLine: primaryReason,
    primaryReason,
    secondaryReason: purchaseReasoning,
    summaryLines: [decisionThesis, primaryReason],
    reasonAuthority: {
      ...decision.reasonAuthority,
      primaryReason: {
        ...decision.reasonAuthority.primaryReason,
        line: primaryReason,
      },
      secondaryReasons: [
        {
          code: decision.reasonAuthority.secondaryReasons[0]?.code ?? ("FIT" as const),
          label: "Buyer-fit thesis",
          line: decisionThesis,
        },
        {
          code: decision.reasonAuthority.secondaryReasons[1]?.code ?? ("VALUE" as const),
          label: "Analyst reasoning",
          line: purchaseReasoning,
        },
      ],
    },
    productIntelligence: {
      ...intelligence,
      buyerIdentity: buyer,
      tasteMatchScore: tasteMatch.tasteMatchScore,
      tastePreferences: tastePref,
      personalizedDecisionScore: personalized,
      spreadScore: personalized.spreadScore,
      buyerIdentityScore: personalized.buyerIdentityScore,
      advancedCommerceReasoning: reasoning,
      finalVerdict: verdict,
      alignmentFlags: [
        ...(intelligence.alignmentFlags ?? []),
        "phase34_preference_intelligence",
        `phase34_buyer_${buyer.primaryIdentity}`,
        `phase34_personality_${buyer.personalityMode}`,
        tasteMatch.dominantTaste ? `phase34_taste_${tasteMatch.dominantTaste}` : "phase34_taste_neutral",
        `phase34_band_${personalized.rankBand}`,
      ].filter((flag, index, list) => list.indexOf(flag) === index),
    },
  };
}

export function buildPreferenceIntelligenceDecisionMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>,
  productsByLink: Map<string, { product: QuantProduct; searchQuery: string }>
): Map<string, UniversalProductDecision> {
  const commerceMap = buildCommerceIntelligenceDecisionMap(coherenceByLink, metaByLink, productsByLink);

  const searchQuery =
    [...productsByLink.values()][0]?.searchQuery?.trim() ?? "";
  const segment = commerceMap.values().next().value?.productIntelligence?.segment ?? null;

  let buyer = detectBuyerIdentity(searchQuery);
  let tastePref = detectTastePreferences(searchQuery, segment);
  const memory = preferenceMemoryHook.loadMemory();
  ({ buyer, taste: tastePref } = preferenceMemoryHook.mergeWithQuery(memory, buyer, tastePref));

  const commerceByLink = new Map<string, CommerceIntelligenceAuthority>();
  const scoringRows: Array<{
    link: string;
    product: QuantProduct;
    intelligence: NonNullable<UniversalProductDecision["productIntelligence"]>;
    commerce: CommerceIntelligenceAuthority;
    buyer: BuyerIdentityProfile;
    tasteMatchScore: number;
    avoid: boolean;
    searchQuery: string;
  }> = [];

  for (const [link, decision] of commerceMap) {
    const row = productsByLink.get(link);
    const intel = decision.productIntelligence;
    if (!row?.product || !intel) continue;

    const commerce: CommerceIntelligenceAuthority = {
      version: 1,
      marketOpportunityScore: intel.marketOpportunityScore ?? 50,
      marketValueScore: intel.marketValueScore ?? 50,
      merchantTrustScore: intel.merchantTrustScore ?? 50,
      marketAveragePrice: intel.marketAveragePrice ?? 0,
      priceAdvantage: intel.priceAdvantage ?? 0,
      dealStrength: intel.dealStrength ?? 50,
      dealRarity: intel.dealRarity ?? 50,
      valueDelta: intel.valueDelta ?? 0,
      availabilityScore: 72,
      competitorPressure: intel.alternativePressure ?? 50,
      offerUniqueness: 55,
      intentAlignment: 55,
      commerceReasoning: intel.commerceReasoning ?? {
        whyWon: "",
        whyLost: "",
        competitorEdge: "",
        improvementPath: "",
      },
    };
    commerceByLink.set(link, commerce);

    const tasteMatch = computeTasteMatchScore(row.product, tastePref, row.searchQuery);
    scoringRows.push({
      link,
      product: row.product,
      intelligence: intel,
      commerce,
      buyer,
      tasteMatchScore: tasteMatch.tasteMatchScore,
      avoid: isAvoidProfile(decision),
      searchQuery: row.searchQuery,
    });
  }

  const personalizedByLink = buildPersonalizedDecisionScores({ rows: scoringRows });
  const verdictAuthority = assignPreferenceAwareVerdicts({
    decisions: commerceMap,
    personalizedByLink,
    commerceByLink,
  });

  const result = new Map<string, UniversalProductDecision>();

  for (const [link, decision] of commerceMap) {
    const row = productsByLink.get(link);
    const intel = decision.productIntelligence;
    const commerce = commerceByLink.get(link);
    const personalized = personalizedByLink.get(link);
    const verdictRow = verdictAuthority.get(link);
    if (!row?.product || !intel || !commerce || !personalized) {
      result.set(link, decision);
      continue;
    }

    const tasteMatch = computeTasteMatchScore(row.product, tastePref, row.searchQuery);
    const profileKey = resolveCategoryProfileKey(intel.segment, row.product.title, row.searchQuery);
    const profile = getCategoryProfile(profileKey);
    const reasoning = buildAdvancedCommerceReasoning({
      verdict: verdictRow?.verdict ?? decision.verdict,
      intelligence: intel,
      commerce,
      personalized,
      taste: tasteMatch,
      buyer,
      store: metaByLink.get(link)?.store ?? row.product.store,
      categoryLabel: profile.label,
    });

    result.set(
      link,
      applyPreferenceIntelligence(
        decision,
        row.product,
        row.searchQuery,
        buyer,
        tastePref,
        tasteMatch,
        personalized,
        commerce,
        reasoning,
        verdictRow
      )
    );
  }

  return result;
}

export {
  buildCommerceIntelligenceDisplayCoherenceByLink as buildPreferenceIntelligenceDisplayCoherenceByLink,
  detectBuyerIdentity,
  detectTastePreferences,
  hasStrongScoreSeparation,
  reasoningIsAnalystGrade,
  preferenceMemoryHook,
};
