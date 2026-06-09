/**
 * Phase 36 — Commerce Opportunity Verdict Engine.
 * Healthy distribution with mandatory BUY READY recovery on valid trays.
 */

import type { DiscountOpportunityInsight } from "@/lib/intelligence/discountOpportunityEngine";
import {
  assessTrayValidity,
  computePurchaseOpportunityScore,
  recoverBuyReadyIfMissing,
} from "@/lib/intelligence/buyReadyRecoveryEngine";
import type { PersonalCommerceScore } from "@/lib/intelligence/personalCommerceScoreEngine";
import type { CommerceIntelligenceAuthority } from "@/lib/intelligence/commerceIntelligenceAuthorityEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";
import type { PreferenceVerdictRow } from "@/lib/ui/preferenceVerdictEngine";

function countVerdict(assignments: Map<string, PrimaryVerdict>, verdict: PrimaryVerdict): number {
  return [...assignments.values()].filter((row) => row === verdict).length;
}

type RankedRow = {
  link: string;
  spreadScore: number;
  rankIndex: number;
  gapFromTop: number;
  avoid: boolean;
  opportunityScore: number;
};

function isRealAvoid(args: {
  decision: UniversalProductDecision;
  commerce: CommerceIntelligenceAuthority;
  discount?: DiscountOpportunityInsight;
}): boolean {
  const intel = args.decision.productIntelligence;
  return (
    (intel?.productQualityScore ?? 50) < 28 ||
    (intel?.trustScore ?? 50) < 32 ||
    args.commerce.merchantTrustScore < 35 ||
    (args.discount?.priceOpportunityLabel === "OVERPRICED" &&
      (intel?.merchantTrustScore ?? 50) < 45 &&
      (intel?.productQualityScore ?? 50) < 45)
  );
}

/** Assign commerce-opportunity-aware verdicts with BUY READY recovery. */
export function assignCommerceOpportunityVerdicts(args: {
  decisions: Map<string, UniversalProductDecision>;
  personalByLink: Map<string, PersonalCommerceScore>;
  commerceByLink: Map<string, CommerceIntelligenceAuthority>;
  discountByLink: Map<string, DiscountOpportunityInsight>;
  productsByLink: Map<string, { product: { title: string; price: number; link: string }; searchQuery: string }>;
}): Map<string, PreferenceVerdictRow & { buyRecoveryMessage?: string }> {
  const { decisions, personalByLink, commerceByLink, discountByLink, productsByLink } = args;

  const ranked: RankedRow[] = [...decisions.entries()]
    .map(([link, decision]) => {
      const spread = personalByLink.get(link);
      const commerce = commerceByLink.get(link);
      const discount = discountByLink.get(link);
      const opportunityScore = computePurchaseOpportunityScore({
        decision,
        discount,
        personalScore: spread?.personalCommerceScore,
      });
      const avoid =
        !spread ||
        !commerce ||
        isRealAvoid({ decision, commerce, discount }) ||
        (spread.expandedConfidence <= 32 && opportunityScore < 38);

      return {
        link,
        spreadScore: spread?.personalCommerceScore ?? opportunityScore,
        rankIndex: 0,
        gapFromTop: 0,
        avoid,
        opportunityScore,
      };
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore);

  const topScore = ranked[0]?.opportunityScore ?? 0;
  for (let i = 0; i < ranked.length; i++) {
    ranked[i]!.rankIndex = i;
    ranked[i]!.gapFromTop = topScore - ranked[i]!.opportunityScore;
  }

  const traySize = ranked.length;
  const assignments = new Map<string, PrimaryVerdict>();
  const actionable = ranked.filter((row) => !row.avoid);
  const avoidRows = ranked.filter((row) => row.avoid);
  const actionableCount = actionable.length;

  for (const row of avoidRows) assignments.set(row.link, "AVOID");

  const maxBuy =
    actionableCount >= 6 ? Math.min(3, Math.max(1, Math.ceil(actionableCount * 0.18))) : 1;
  const maxAvoid = Math.max(avoidRows.length, Math.floor(traySize * 0.15));
  const targetCompare = Math.max(2, Math.ceil(actionableCount * 0.42));
  const maxWait = Math.max(1, Math.ceil(actionableCount * 0.28));

  if (actionableCount > 0) {
    const leader = actionable[0]!;
    assignments.set(leader.link, "BUY READY");

    for (const row of actionable.slice(1)) {
      const percentile = actionableCount > 1 ? row.rankIndex / (actionableCount - 1) : 0;

      if (
        countVerdict(assignments, "BUY READY") < maxBuy &&
        row.opportunityScore >= leader.opportunityScore * 0.88 &&
        row.rankIndex <= 2
      ) {
        assignments.set(row.link, "BUY READY");
      } else if (percentile <= 0.55 && countVerdict(assignments, "COMPARE") < targetCompare) {
        assignments.set(row.link, "COMPARE");
      } else if (countVerdict(assignments, "WAIT") < maxWait && row.opportunityScore <= leader.opportunityScore * 0.72) {
        assignments.set(row.link, "WAIT");
      } else if (countVerdict(assignments, "COMPARE") < targetCompare) {
        assignments.set(row.link, "COMPARE");
      } else {
        assignments.set(row.link, "WAIT");
      }
    }

    while (countVerdict(assignments, "AVOID") > maxAvoid + avoidRows.length) {
      const candidate = [...actionable]
        .reverse()
        .find((row) => assignments.get(row.link) === "AVOID");
      if (!candidate) break;
      assignments.set(candidate.link, "WAIT");
    }

    while (countVerdict(assignments, "WAIT") > maxWait + 1) {
      const candidate = actionable.find((row) => assignments.get(row.link) === "WAIT" && row.rankIndex > 2);
      if (!candidate) break;
      assignments.set(candidate.link, "COMPARE");
    }
  }

  const validity = assessTrayValidity(decisions, productsByLink);
  const opportunityScoreByLink = new Map(ranked.map((r) => [r.link, r.opportunityScore]));
  const recovery = recoverBuyReadyIfMissing({
    assignments,
    rankedLinks: ranked.map((r) => r.link),
    validity,
    opportunityScoreByLink,
  });

  const result = new Map<string, PreferenceVerdictRow & { buyRecoveryMessage?: string }>();
  for (const row of ranked) {
    result.set(row.link, {
      link: row.link,
      verdict: assignments.get(row.link) ?? (row.avoid ? "AVOID" : "COMPARE"),
      spreadScore: row.spreadScore,
      rankIndex: row.rankIndex,
      gapFromTop: row.gapFromTop,
      traySize,
      buyRecoveryMessage: row.link === recovery.link ? recovery.message : undefined,
    });
  }

  for (const [link, decision] of decisions) {
    if (result.has(link)) continue;
    result.set(link, {
      link,
      verdict: decision.verdict,
      spreadScore: 0,
      rankIndex: traySize,
      gapFromTop: 99,
      traySize,
    });
  }

  return result;
}

export function commerceOpportunityVerdictDistribution(
  authority: Map<string, PreferenceVerdictRow>
): Record<PrimaryVerdict, number> {
  return {
    "BUY READY": [...authority.values()].filter((row) => row.verdict === "BUY READY").length,
    WAIT: [...authority.values()].filter((row) => row.verdict === "WAIT").length,
    COMPARE: [...authority.values()].filter((row) => row.verdict === "COMPARE").length,
    AVOID: [...authority.values()].filter((row) => row.verdict === "AVOID").length,
    "INSUFFICIENT DATA": [...authority.values()].filter((row) => row.verdict === "INSUFFICIENT DATA").length,
  };
}

export function hasHealthyCommerceVerdictDistribution(
  authority: Map<string, PreferenceVerdictRow>,
  minTray = 6
): boolean {
  const rows = [...authority.values()];
  if (rows.length < minTray) return commerceOpportunityVerdictDistribution(authority)["BUY READY"] >= 1;

  const dist = commerceOpportunityVerdictDistribution(authority);
  const actionable = rows.length - dist.AVOID;
  if (actionable <= 0) return false;

  const buyShare = dist["BUY READY"] / actionable;
  const avoidShare = dist.AVOID / rows.length;
  const waitShare = dist.WAIT / actionable;

  return (
    dist["BUY READY"] >= 1 &&
    dist["BUY READY"] <= 3 &&
    buyShare <= 0.35 &&
    avoidShare <= 0.25 &&
    waitShare <= 0.35 &&
    dist.COMPARE >= 1
  );
}
