/**
 * Phase 32.5 / 33 — Market Opportunity Balancing.
 * Relative verdict distribution inside the current search tray.
 */

import type { CommerceIntelligenceAuthority } from "@/lib/intelligence/commerceIntelligenceAuthorityEngine";
import { commerceTrayRankScore } from "@/lib/intelligence/commerceIntelligenceAuthorityEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { ProductDimensionScore } from "@/lib/ui/universalProductIntelligenceEngine";
import type { UniversalProductDecision, UniversalProductIntelligenceSnapshot } from "@/lib/ui/universalProductDecision";

export type MarketOpportunityRole =
  | "tray_leader"
  | "strongest_purchase"
  | "strongest_compare"
  | "weakest_value"
  | "balanced";

export type TrayVerdictAuthorityRow = {
  link: string;
  verdict: PrimaryVerdict;
  rankIndex: number;
  rankScore: number;
  gapFromTop: number;
  traySize: number;
  marketRole?: MarketOpportunityRole;
};

export type BalancedTrayVerdictRow = TrayVerdictAuthorityRow & {
  marketRole: MarketOpportunityRole;
};

type RankedTrayRow = {
  link: string;
  intelligence: UniversalProductIntelligenceSnapshot;
  dimensions: ProductDimensionScore[];
  rankScore: number;
  rankIndex: number;
  gapFromTop: number;
  avoid: boolean;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function dimensionLeadScore(dimensions: ProductDimensionScore[]): number {
  const lead = [...dimensions].sort((a, b) => b.score - a.score).slice(0, 2);
  if (!lead.length) return 50;
  return clampScore(lead.reduce((sum, row) => sum + row.score, 0) / lead.length);
}

function computeTrayRankScore(
  intelligence: UniversalProductIntelligenceSnapshot,
  dimensions: ProductDimensionScore[],
  commerce?: CommerceIntelligenceAuthority
): number {
  const lead = dimensionLeadScore(dimensions);
  return commerceTrayRankScore(intelligence, commerce, lead);
}

function buildRankedRowsWithCommerce(
  decisions: Map<string, UniversalProductDecision>,
  commerceByLink?: Map<string, CommerceIntelligenceAuthority>
): RankedTrayRow[] {
  const ranked = [...decisions.entries()]
    .map(([link, decision]) => {
      const intelligence = decision.productIntelligence;
      const dimensions = intelligence?.dimensions ?? [];
      const commerce = commerceByLink?.get(link);
      return {
        link,
        intelligence: intelligence!,
        dimensions,
        rankScore: intelligence ? computeTrayRankScore(intelligence, dimensions, commerce) : 0,
        rankIndex: 0,
        gapFromTop: 0,
        avoid: intelligence ? isAvoidProfile(intelligence, decision.verdict) : false,
      };
    })
    .filter((row) => row.intelligence)
    .sort((a, b) => b.rankScore - a.rankScore);

  const topScore = ranked[0]?.rankScore ?? 0;
  return ranked.map((row, index) => ({
    ...row,
    rankIndex: index,
    gapFromTop: topScore - row.rankScore,
  }));
}

function isAvoidProfile(
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

function countVerdict(assignments: Map<string, PrimaryVerdict>, verdict: PrimaryVerdict): number {
  return [...assignments.values()].filter((row) => row === verdict).length;
}

function pickCompareCandidate(actionable: RankedTrayRow[]): RankedTrayRow | null {
  const pool = actionable.slice(1, Math.min(8, actionable.length));
  if (!pool.length) return null;
  return [...pool].sort((a, b) => {
    if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
    return a.gapFromTop - b.gapFromTop;
  })[0] ?? null;
}

function pickWeakestValueCandidate(
  actionable: RankedTrayRow[],
  assigned: Map<string, PrimaryVerdict>
): RankedTrayRow | null {
  const pool = actionable
    .filter((row) => !assigned.has(row.link))
    .sort((a, b) => {
      if (a.intelligence.valueScore !== b.intelligence.valueScore) {
        return a.intelligence.valueScore - b.intelligence.valueScore;
      }
      return b.rankIndex - a.rankIndex;
    });
  return pool[0] ?? null;
}

function buildRankedRows(decisions: Map<string, UniversalProductDecision>): RankedTrayRow[] {
  const ranked = [...decisions.entries()]
    .map(([link, decision]) => {
      const intelligence = decision.productIntelligence;
      const dimensions = intelligence?.dimensions ?? [];
      return {
        link,
        intelligence: intelligence!,
        dimensions,
        rankScore: intelligence ? computeTrayRankScore(intelligence, dimensions) : 0,
        rankIndex: 0,
        gapFromTop: 0,
        avoid: intelligence ? isAvoidProfile(intelligence, decision.verdict) : false,
      };
    })
    .filter((row) => row.intelligence)
    .sort((a, b) => b.rankScore - a.rankScore);

  const topScore = ranked[0]?.rankScore ?? 0;
  return ranked.map((row, index) => ({
    ...row,
    rankIndex: index,
    gapFromTop: topScore - row.rankScore,
  }));
}

function assignBalancedTrayVerdictAuthorityInternal(
  ranked: RankedTrayRow[],
  decisions: Map<string, UniversalProductDecision>,
  diversity: { maxBuyShare: number; minCompareShare: number; maxWaitShare: number; maxBuyCap: number }
): Map<string, BalancedTrayVerdictRow> {
  const traySize = ranked.length;
  const result = new Map<string, BalancedTrayVerdictRow>();
  const assignments = new Map<string, PrimaryVerdict>();
  const roles = new Map<string, MarketOpportunityRole>();

  for (const row of ranked) {
    if (!row.avoid) continue;
    assignments.set(row.link, "AVOID");
    roles.set(row.link, "balanced");
  }

  const actionable = ranked.filter((row) => !row.avoid);
  const actionableCount = actionable.length;

  if (actionableCount > 0) {
    const leader = actionable[0]!;
    assignments.set(leader.link, "BUY READY");
    roles.set(leader.link, "tray_leader");

    const maxBuy = Math.max(
      1,
      Math.min(diversity.maxBuyCap, Math.ceil(actionableCount * diversity.maxBuyShare))
    );
    const maxWait = Math.max(1, Math.floor(actionableCount * diversity.maxWaitShare));
    const targetCompare = Math.max(
      1,
      Math.min(
        Math.ceil(actionableCount * 0.5),
        Math.max(Math.ceil(actionableCount * diversity.minCompareShare), actionableCount - maxBuy - 1)
      )
    );
    const minWait = actionableCount >= 5 ? 1 : 0;

    const compareCandidate = pickCompareCandidate(actionable);
    if (compareCandidate) {
      assignments.set(compareCandidate.link, "COMPARE");
      roles.set(compareCandidate.link, "strongest_compare");
    }

    const waitCandidate = pickWeakestValueCandidate(
      actionable.filter((row) => row.link !== leader.link),
      assignments
    );
    if (waitCandidate && minWait > 0) {
      assignments.set(waitCandidate.link, "WAIT");
      roles.set(waitCandidate.link, "weakest_value");
    }

    for (let index = 0; index < actionable.length; index++) {
      const row = actionable[index]!;
      if (assignments.has(row.link)) continue;

      const percentile = actionableCount > 1 ? index / (actionableCount - 1) : 0;
      let verdict: PrimaryVerdict = "COMPARE";

      if (percentile <= 0.18 && countVerdict(assignments, "BUY READY") < maxBuy) {
        verdict = "BUY READY";
        roles.set(row.link, "strongest_purchase");
      } else if (percentile >= 0.72 || row.intelligence.valueScore <= 48) {
        verdict = "WAIT";
        roles.set(row.link, "balanced");
      } else if (countVerdict(assignments, "COMPARE") < targetCompare) {
        verdict = "COMPARE";
        roles.set(row.link, "balanced");
      } else if (countVerdict(assignments, "WAIT") < maxWait) {
        verdict = "WAIT";
        roles.set(row.link, "balanced");
      } else {
        verdict = "COMPARE";
        roles.set(row.link, "balanced");
      }

      assignments.set(row.link, verdict);
    }

    while (countVerdict(assignments, "WAIT") > maxWait) {
      const candidate = [...actionable]
        .reverse()
        .find(
          (row) =>
            assignments.get(row.link) === "WAIT" && roles.get(row.link) !== "weakest_value"
        );
      if (!candidate) break;
      assignments.set(candidate.link, "COMPARE");
      roles.set(candidate.link, "balanced");
    }

    while (countVerdict(assignments, "COMPARE") < Math.min(targetCompare, 1) && actionableCount >= 3) {
      const candidate = actionable.find(
        (row) =>
          assignments.get(row.link) === "WAIT" && roles.get(row.link) !== "weakest_value"
      );
      if (!candidate) break;
      assignments.set(candidate.link, "COMPARE");
      roles.set(candidate.link, "strongest_compare");
    }

    while (minWait > 0 && countVerdict(assignments, "WAIT") < minWait) {
      const candidate = [...actionable]
        .reverse()
        .find(
          (row) =>
            assignments.get(row.link) === "COMPARE" &&
            roles.get(row.link) !== "strongest_compare" &&
            roles.get(row.link) !== "tray_leader"
        );
      if (!candidate) break;
      assignments.set(candidate.link, "WAIT");
      roles.set(candidate.link, "weakest_value");
    }
  }

  for (const row of ranked) {
    const verdict = assignments.get(row.link) ?? (row.avoid ? "AVOID" : "WAIT");
    result.set(row.link, {
      link: row.link,
      verdict,
      rankIndex: row.rankIndex,
      rankScore: row.rankScore,
      gapFromTop: row.gapFromTop,
      traySize,
      marketRole: roles.get(row.link) ?? "balanced",
    });
  }

  for (const [link, decision] of decisions) {
    if (result.has(link)) continue;
    result.set(link, {
      link,
      verdict: decision.verdict,
      rankIndex: traySize,
      rankScore: 0,
      gapFromTop: 99,
      traySize,
      marketRole: "balanced",
    });
  }

  return result;
}

/** Phase 32.5 — category-dimension tray balancing. */
export function assignBalancedTrayVerdictAuthority(
  decisions: Map<string, UniversalProductDecision>
): Map<string, BalancedTrayVerdictRow> {
  const ranked = buildRankedRows(decisions);
  return assignBalancedTrayVerdictAuthorityInternal(ranked, decisions, {
    maxBuyShare: 0.12,
    minCompareShare: 0.12,
    maxWaitShare: 0.42,
    maxBuyCap: 4,
  });
}

/** Phase 33 — commerce-aware tray balancing with market opportunity scores. */
export function assignCommerceAwareTrayVerdictAuthority(
  decisions: Map<string, UniversalProductDecision>,
  commerceByLink: Map<string, CommerceIntelligenceAuthority>
): Map<string, BalancedTrayVerdictRow> {
  const ranked = buildRankedRowsWithCommerce(decisions, commerceByLink);
  return assignBalancedTrayVerdictAuthorityInternal(ranked, decisions, {
    maxBuyShare: 0.25,
    minCompareShare: 0.3,
    maxWaitShare: 0.45,
    maxBuyCap: 6,
  });
}

export function trayVerdictDistribution(
  authority: Map<string, BalancedTrayVerdictRow>
): Record<PrimaryVerdict, number> {
  return {
    "BUY READY": [...authority.values()].filter((row) => row.verdict === "BUY READY").length,
    WAIT: [...authority.values()].filter((row) => row.verdict === "WAIT").length,
    COMPARE: [...authority.values()].filter((row) => row.verdict === "COMPARE").length,
    AVOID: [...authority.values()].filter((row) => row.verdict === "AVOID").length,
  };
}

export function trayMarketRoles(authority: Map<string, BalancedTrayVerdictRow>): {
  trayLeader: string | null;
  strongestPurchase: string | null;
  strongestCompare: string | null;
  weakestValue: string | null;
} {
  let trayLeader: string | null = null;
  let strongestPurchase: string | null = null;
  let strongestCompare: string | null = null;
  let weakestValue: string | null = null;

  for (const [link, row] of authority) {
    if (row.marketRole === "tray_leader") trayLeader = link;
    if (row.marketRole === "strongest_purchase") strongestPurchase = link;
    if (row.marketRole === "strongest_compare") strongestCompare = link;
    if (row.marketRole === "weakest_value") weakestValue = link;
  }

  if (!strongestPurchase) {
    strongestPurchase =
      [...authority.values()].find((row) => row.verdict === "BUY READY" && row.rankIndex === 0)?.link ??
      null;
  }

  return { trayLeader, strongestPurchase, strongestCompare, weakestValue };
}

export function isBalancedTrayDistribution(
  authority: Map<string, BalancedTrayVerdictRow>,
  minActionable = 8
): boolean {
  const rows = [...authority.values()];
  const actionable = rows.filter((row) => row.verdict !== "AVOID");
  if (actionable.length < minActionable) return true;

  const distribution = trayVerdictDistribution(authority);
  const total = actionable.length;
  const waitShare = distribution.WAIT / total;
  const buyShare = distribution["BUY READY"] / total;
  const compareShare = distribution.COMPARE / total;
  const roles = trayMarketRoles(authority);

  return (
    distribution["BUY READY"] >= 1 &&
    distribution.COMPARE >= 1 &&
    distribution.WAIT >= 1 &&
    waitShare <= 0.45 &&
    buyShare <= 0.25 &&
    compareShare <= 0.55 &&
    compareShare >= 0.12 &&
    Boolean(roles.trayLeader) &&
    Boolean(roles.strongestCompare) &&
    Boolean(roles.weakestValue)
  );
}

/** Phase 33 diversity guard — target ranges without forcing percentages. */
export function isHealthyCommerceTrayDistribution(
  authority: Map<string, BalancedTrayVerdictRow>,
  minActionable = 8
): boolean {
  const rows = [...authority.values()];
  const actionable = rows.filter((row) => row.verdict !== "AVOID");
  if (actionable.length < minActionable) return true;

  const distribution = trayVerdictDistribution(authority);
  const total = actionable.length;
  const buyShare = distribution["BUY READY"] / total;
  const compareShare = distribution.COMPARE / total;
  const waitShare = distribution.WAIT / total;
  const avoidShare = distribution.AVOID / (rows.length || 1);

  return (
    buyShare >= 0.08 &&
    buyShare <= 0.28 &&
    compareShare >= 0.28 &&
    compareShare <= 0.55 &&
    waitShare >= 0.15 &&
    waitShare <= 0.48 &&
    avoidShare <= 0.18
  );
}

export function dominantVerdictShare(
  authority: Map<string, BalancedTrayVerdictRow>,
  excludeAvoid = true
): { verdict: PrimaryVerdict; share: number } {
  const rows = [...authority.values()].filter((row) => !excludeAvoid || row.verdict !== "AVOID");
  const total = rows.length || 1;
  const distribution = trayVerdictDistribution(authority);
  const entries = (Object.entries(distribution) as Array<[PrimaryVerdict, number]>).filter(
    ([verdict]) => !excludeAvoid || verdict !== "AVOID"
  );
  entries.sort((a, b) => b[1] - a[1]);
  const [verdict, count] = entries[0] ?? ["WAIT", 0];
  return { verdict, share: count / total };
}
