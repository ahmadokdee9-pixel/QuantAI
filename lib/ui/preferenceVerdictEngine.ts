/**
 * Phase 34 — Preference-Aware Verdict Engine.
 * Stricter BUY READY / AVOID logic with target distribution bands.
 */

import type { PersonalizedDecisionScore } from "@/lib/intelligence/personalizedDecisionScoringEngine";
import type { CommerceIntelligenceAuthority } from "@/lib/intelligence/commerceIntelligenceAuthorityEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";

export type PreferenceVerdictRow = {
  link: string;
  verdict: PrimaryVerdict;
  spreadScore: number;
  rankIndex: number;
  gapFromTop: number;
  traySize: number;
};

type RankedPreferenceRow = {
  link: string;
  spreadScore: number;
  rankIndex: number;
  gapFromTop: number;
  avoid: boolean;
  buyEligible: boolean;
  compareEligible: boolean;
  waitEligible: boolean;
};

function countVerdict(assignments: Map<string, PrimaryVerdict>, verdict: PrimaryVerdict): number {
  return [...assignments.values()].filter((row) => row === verdict).length;
}

function isHardAvoid(args: {
  spread: PersonalizedDecisionScore;
  commerce: CommerceIntelligenceAuthority;
  decision: UniversalProductDecision;
}): boolean {
  const intel = args.decision.productIntelligence;
  return (
    args.spread.rankBand === "avoid" ||
    args.spread.spreadScore <= 35 ||
    args.commerce.merchantTrustScore < 42 ||
    (intel?.productQualityScore ?? 50) < 38 ||
    (intel?.trustScore ?? 50) < 40 ||
    args.decision.verdict === "AVOID"
  );
}

function isBuyEligible(args: {
  spread: PersonalizedDecisionScore;
  commerce: CommerceIntelligenceAuthority;
}): boolean {
  return (
    args.spread.spreadScore >= 82 &&
    args.commerce.marketOpportunityScore >= 68 &&
    args.commerce.merchantTrustScore >= 55 &&
    args.spread.rankBand === "top"
  );
}

/** Assign stricter tray verdicts using spread scores and commerce authority. */
export function assignPreferenceAwareVerdicts(args: {
  decisions: Map<string, UniversalProductDecision>;
  personalizedByLink: Map<string, PersonalizedDecisionScore>;
  commerceByLink: Map<string, CommerceIntelligenceAuthority>;
}): Map<string, PreferenceVerdictRow> {
  const { decisions, personalizedByLink, commerceByLink } = args;
  const ranked: RankedPreferenceRow[] = [...decisions.entries()]
    .map(([link, decision]) => {
      const spread = personalizedByLink.get(link);
      const commerce = commerceByLink.get(link);
      if (!spread || !commerce) {
        return {
          link,
          spreadScore: 0,
          rankIndex: 0,
          gapFromTop: 99,
          avoid: true,
          buyEligible: false,
          compareEligible: false,
          waitEligible: true,
        };
      }
      const avoid = isHardAvoid({ spread, commerce, decision });
      return {
        link,
        spreadScore: spread.spreadScore,
        rankIndex: 0,
        gapFromTop: 0,
        avoid,
        buyEligible: !avoid && isBuyEligible({ spread, commerce }),
        compareEligible: !avoid && spread.spreadScore >= 58 && spread.rankBand !== "weak",
        waitEligible: !avoid && spread.spreadScore >= 45 && spread.spreadScore < 72,
      };
    })
    .sort((a, b) => b.spreadScore - a.spreadScore);

  const topScore = ranked[0]?.spreadScore ?? 0;
  for (let i = 0; i < ranked.length; i++) {
    ranked[i]!.rankIndex = i;
    ranked[i]!.gapFromTop = topScore - ranked[i]!.spreadScore;
  }

  const traySize = ranked.length;
  const assignments = new Map<string, PrimaryVerdict>();
  const actionable = ranked.filter((row) => !row.avoid);
  const avoidRows = ranked.filter((row) => row.avoid);
  const actionableCount = actionable.length;

  for (const row of avoidRows) {
    assignments.set(row.link, "AVOID");
  }

  const maxBuy = Math.max(1, Math.min(3, Math.ceil(actionableCount * 0.2)));
  const targetCompare = Math.max(2, Math.ceil(actionableCount * 0.38));
  const targetWait = Math.max(1, Math.ceil(actionableCount * 0.25));
  const targetAvoid = Math.max(avoidRows.length, Math.ceil(traySize * 0.2));

  if (actionableCount > 0) {
    const leader = actionable.find((row) => row.buyEligible) ?? actionable[0]!;
    if (leader.buyEligible || leader.spreadScore >= 85) {
      assignments.set(leader.link, "BUY READY");
    } else {
      assignments.set(leader.link, "COMPARE");
    }

    for (const row of actionable) {
      if (assignments.has(row.link)) continue;

      const percentile = actionableCount > 1 ? row.rankIndex / (actionableCount - 1) : 0;

      if (row.buyEligible && countVerdict(assignments, "BUY READY") < maxBuy) {
        assignments.set(row.link, "BUY READY");
      } else if (percentile <= 0.45 && countVerdict(assignments, "COMPARE") < targetCompare) {
        assignments.set(row.link, "COMPARE");
      } else if (
        percentile <= 0.72 &&
        countVerdict(assignments, "WAIT") < targetWait &&
        row.waitEligible
      ) {
        assignments.set(row.link, "WAIT");
      } else if (row.spreadScore <= 55 || row.rankBand === "weak" || percentile >= 0.78) {
        assignments.set(row.link, "AVOID");
      } else if (countVerdict(assignments, "COMPARE") < targetCompare) {
        assignments.set(row.link, "COMPARE");
      } else {
        assignments.set(row.link, "WAIT");
      }
    }

    while (countVerdict(assignments, "COMPARE") < Math.min(targetCompare, 2) && actionableCount >= 4) {
      const candidate = actionable.find((row) => assignments.get(row.link) === "WAIT");
      if (!candidate) break;
      assignments.set(candidate.link, "COMPARE");
    }

    while (countVerdict(assignments, "AVOID") < targetAvoid) {
      const candidate = [...actionable]
        .reverse()
        .find((row) => assignments.get(row.link) === "WAIT" && row.spreadScore <= 62);
      if (!candidate) break;
      assignments.set(candidate.link, "AVOID");
    }

    while (countVerdict(assignments, "WAIT") < 1 && actionableCount >= 5) {
      const candidate = [...actionable]
        .reverse()
        .find((row) => assignments.get(row.link) === "COMPARE" && row.rankBand === "average");
      if (!candidate) break;
      assignments.set(candidate.link, "WAIT");
    }
  }

  const result = new Map<string, PreferenceVerdictRow>();
  for (const row of ranked) {
    result.set(row.link, {
      link: row.link,
      verdict: assignments.get(row.link) ?? (row.avoid ? "AVOID" : "WAIT"),
      spreadScore: row.spreadScore,
      rankIndex: row.rankIndex,
      gapFromTop: row.gapFromTop,
      traySize,
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

export function preferenceVerdictDistribution(
  authority: Map<string, PreferenceVerdictRow>
): Record<PrimaryVerdict, number> {
  return {
    "BUY READY": [...authority.values()].filter((row) => row.verdict === "BUY READY").length,
    WAIT: [...authority.values()].filter((row) => row.verdict === "WAIT").length,
    COMPARE: [...authority.values()].filter((row) => row.verdict === "COMPARE").length,
    AVOID: [...authority.values()].filter((row) => row.verdict === "AVOID").length,
  };
}

export function isStricterVerdictDistribution(
  authority: Map<string, PreferenceVerdictRow>,
  minTray = 8
): boolean {
  const rows = [...authority.values()];
  if (rows.length < minTray) return true;
  const dist = preferenceVerdictDistribution(authority);
  const total = rows.length;
  const actionable = total - dist.AVOID;
  if (actionable <= 0) return false;

  const buyShare = dist["BUY READY"] / actionable;
  const compareShare = dist.COMPARE / actionable;
  const waitShare = dist.WAIT / actionable;
  const avoidShare = dist.AVOID / total;

  return (
    dist["BUY READY"] >= 1 &&
    dist.AVOID >= 1 &&
    buyShare <= 0.22 &&
    compareShare >= 0.25 &&
    waitShare >= 0.12 &&
    waitShare <= 0.45 &&
    avoidShare >= 0.15
  );
}
