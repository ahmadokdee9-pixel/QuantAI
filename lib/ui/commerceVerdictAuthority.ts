/**
 * Phase 27.3 — Commerce Verdict Authority.
 * Evidence-combination verdicts with professional buyer distribution targets.
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { AlternativeDominanceAdjustment } from "@/lib/ui/alternativeDominanceAuthority";
import type { BuyerRankContext } from "@/lib/ui/professionalBuyerRanking";
import type { ProductDifferentiationProfile } from "@/lib/ui/productDifferentiationEngine";

export type CommerceVerdictResult = {
  verdict: PrimaryVerdict;
  reasonSeed: string;
};

const TARGET_SHARE = {
  buyMin: 0.15,
  buyMax: 0.3,
  waitMin: 0.2,
  waitMax: 0.4,
  compareMin: 0.1,
  compareMax: 0.25,
  avoidMin: 0.1,
  avoidMax: 0.25,
} as const;

function clipLine(text: string, max = 96): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/** Verdict from unique evidence profile — no default COMPARE fallback. */
export function resolveCommerceVerdict(args: {
  coherent: CoherentProductDecision;
  profile: ProductDifferentiationProfile;
  rankContext: BuyerRankContext;
  dominance: AlternativeDominanceAdjustment;
  confidence: number;
}): CommerceVerdictResult {
  const { coherent, profile, rankContext, dominance, confidence } = args;

  if (profile.riskScore >= 62 || profile.trustScore < 42) {
    return {
      verdict: "AVOID",
      reasonSeed: clipLine(
        coherent.trustRisk.riskReason ||
          `Seller risk ${profile.riskScore}/100 exceeds safe checkout threshold.`
      ),
    };
  }

  if (dominance.suppressBuyReady && rankContext.tier !== "lead") {
    if (dominance.allowCompare && profile.alternativeScore >= 64 && confidence >= 52) {
      return {
        verdict: "COMPARE",
        reasonSeed: clipLine(
          `Near-tie with lead option — value ${profile.valueScore}/100 vs opportunity ${profile.opportunityScore}/100.`
        ),
      };
    }
    return {
      verdict: "WAIT",
      reasonSeed: clipLine(
        coherent.priceTarget.explanation ||
          `Tray leader dominates by ${dominance.gapFromLeader} authority points — wait for separation.`
      ),
    };
  }

  const buyReady =
    rankContext.buyProbability >= 58 &&
    profile.buyerAuthority >= 68 &&
    profile.trustScore >= 60 &&
    profile.opportunityScore >= 54 &&
    profile.riskScore < 50 &&
    confidence >= 58;

  if (buyReady) {
    return {
      verdict: "BUY READY",
      reasonSeed: clipLine(
        coherent.unifiedDecision.finalReasoning ||
          `Rank ${rankContext.tier} authority ${profile.buyerAuthority}/100 with trust ${profile.trustScore}/100.`
      ),
    };
  }

  if (
    dominance.allowCompare &&
    profile.alternativeScore >= 62 &&
    confidence >= 48 &&
    confidence <= 72 &&
    rankContext.tier !== "tail"
  ) {
    return {
      verdict: "COMPARE",
      reasonSeed: clipLine(
        coherent.alternativeAdvantage.comparisonSummary ||
          `Close alternative score ${profile.alternativeScore}/100 with only ${dominance.gapFromLeader}pt leader gap.`
      ),
    };
  }

  if (
    rankContext.waitProbability >= 45 ||
    profile.opportunityScore < 50 ||
    profile.valueScore < 48 ||
    confidence < 45
  ) {
    return {
      verdict: "WAIT",
      reasonSeed: clipLine(
        coherent.buyWait.explanation ||
          coherent.priceTarget.explanation ||
          `Opportunity ${profile.opportunityScore}/100 — patience improves entry quality.`
      ),
    };
  }

  if (profile.riskScore >= 48 || profile.trustScore < 52) {
    return {
      verdict: "AVOID",
      reasonSeed: clipLine(coherent.trustRisk.trustReason || `Trust ${profile.trustScore}/100 is below analyst threshold.`),
    };
  }

  return {
    verdict: "WAIT",
    reasonSeed: clipLine(`Value ${profile.valueScore}/100 needs stronger confirmation before checkout.`),
  };
}

type BalancedRow = {
  link: string;
  verdict: PrimaryVerdict;
  reasonSeed: string;
  confidence: number;
  profile: ProductDifferentiationProfile;
  rankContext: BuyerRankContext;
};

function countVerdict(rows: BalancedRow[], verdict: PrimaryVerdict): number {
  return rows.filter((row) => row.verdict === verdict).length;
}

function share(count: number, total: number): number {
  return total > 0 ? count / total : 0;
}

/** Balance tray toward BUY 15–30%, WAIT 20–40%, COMPARE 10–25%, AVOID 10–25%. */
export function balanceCommerceVerdictDistribution(rows: BalancedRow[]): Map<string, CommerceVerdictResult> {
  const working = rows.map((row) => ({ ...row }));
  const n = working.length;
  const out = new Map<string, CommerceVerdictResult>();
  if (n === 0) return out;

  const maxCompare = Math.floor(n * TARGET_SHARE.compareMax);
  const minCompare = Math.ceil(n * TARGET_SHARE.compareMin);
  let compareCount = countVerdict(working, "COMPARE");
  const compareSorted = working
    .filter((row) => row.verdict === "COMPARE")
    .sort((a, b) => a.confidence - b.confidence);
  while (compareCount > maxCompare && compareSorted.length > 0) {
    const row = compareSorted.shift()!;
    row.verdict = "WAIT";
    row.reasonSeed = clipLine(`Price opportunity ${row.profile.opportunityScore}/100 — hold for clearer edge.`);
    compareCount -= 1;
  }

  const minBuy = Math.ceil(n * TARGET_SHARE.buyMin);
  const maxBuy = Math.floor(n * TARGET_SHARE.buyMax);
  let buyCount = countVerdict(working, "BUY READY");
  const promotable = working
    .filter(
      (row) =>
        row.verdict === "WAIT" &&
        row.rankContext.tier !== "tail" &&
        row.profile.buyerAuthority >= 62 &&
        row.confidence >= 52
    )
    .sort((a, b) => b.profile.buyerAuthority - a.profile.buyerAuthority);
  for (const row of promotable) {
    if (buyCount >= minBuy || buyCount >= maxBuy) break;
    row.verdict = "BUY READY";
    row.reasonSeed = clipLine(
      `Buyer rank ${row.rankContext.tier} — authority ${row.profile.buyerAuthority}/100 supports checkout.`
    );
    buyCount += 1;
  }
  while (buyCount > maxBuy) {
    const demote = working
      .filter((row) => row.verdict === "BUY READY")
      .sort((a, b) => a.confidence - b.confidence)[0];
    if (!demote) break;
    demote.verdict = "WAIT";
    demote.reasonSeed = clipLine(`Confidence ${demote.confidence}% — wait for stronger price confirmation.`);
    buyCount -= 1;
  }

  const minWait = Math.ceil(n * TARGET_SHARE.waitMin);
  let waitCount = countVerdict(working, "WAIT");
  if (waitCount < minWait) {
    const demoteBuy = working
      .filter((row) => row.verdict === "BUY READY")
      .sort((a, b) => a.confidence - b.confidence);
    for (const row of demoteBuy) {
      if (waitCount >= minWait || buyCount <= minBuy) break;
      row.verdict = "WAIT";
      row.reasonSeed = clipLine(`Tray balance — opportunity ${row.profile.opportunityScore}/100 needs patience.`);
      waitCount += 1;
      buyCount -= 1;
    }
  }

  compareCount = countVerdict(working, "COMPARE");
  if (compareCount < minCompare && n >= 4) {
    const promoteCompare = working
      .filter(
        (row) =>
          row.verdict === "WAIT" &&
          row.rankContext.tier === "strong" &&
          row.profile.alternativeScore >= 58 &&
          row.confidence >= 45 &&
          row.confidence <= 70
      )
      .sort((a, b) => b.profile.alternativeScore - a.profile.alternativeScore);
    for (const row of promoteCompare) {
      if (compareCount >= minCompare || compareCount >= maxCompare) break;
      row.verdict = "COMPARE";
      row.reasonSeed = clipLine(
        `Tight alternative score ${row.profile.alternativeScore}/100 — compare before committing.`
      );
      compareCount += 1;
      waitCount -= 1;
    }
  }

  const minAvoid = Math.ceil(n * TARGET_SHARE.avoidMin);
  let avoidCount = countVerdict(working, "AVOID");
  if (avoidCount < minAvoid) {
    const candidates = working
      .filter((row) => row.verdict === "WAIT" && row.profile.riskScore >= 46)
      .sort((a, b) => b.profile.riskScore - a.profile.riskScore);
    for (const row of candidates) {
      if (avoidCount >= minAvoid) break;
      row.verdict = "AVOID";
      row.reasonSeed = clipLine(`Risk ${row.profile.riskScore}/100 outweighs value ${row.profile.valueScore}/100.`);
      avoidCount += 1;
      waitCount -= 1;
    }
  }

  const maxAvoid = Math.floor(n * TARGET_SHARE.avoidMax);
  if (avoidCount > maxAvoid) {
    for (const row of working
      .filter((row) => row.verdict === "AVOID")
      .sort((a, b) => b.confidence - a.confidence)) {
      if (avoidCount <= maxAvoid) break;
      row.verdict = "WAIT";
      avoidCount -= 1;
      waitCount += 1;
    }
  }

  if (n >= 5) {
    const ensureTypes: PrimaryVerdict[] = ["BUY READY", "WAIT", "AVOID"];
    for (const required of ensureTypes) {
      if (countVerdict(working, required) > 0) continue;
      const candidate =
        required === "BUY READY"
          ? working
              .filter((row) => row.verdict === "WAIT" && row.rankContext.tier !== "tail")
              .sort((a, b) => b.profile.buyerAuthority - a.profile.buyerAuthority)[0]
          : required === "WAIT"
            ? working
                .filter((row) => row.verdict === "BUY READY")
                .sort((a, b) => a.confidence - b.confidence)[0]
            : working
                .filter((row) => row.verdict === "WAIT" && row.profile.riskScore >= 40)
                .sort((a, b) => b.profile.riskScore - a.profile.riskScore)[0];
      if (!candidate) continue;
      candidate.verdict = required;
      candidate.reasonSeed = clipLine(
        required === "BUY READY"
          ? `Analyst promotion — authority ${candidate.profile.buyerAuthority}/100.`
          : required === "WAIT"
            ? `Tray balance — opportunity ${candidate.profile.opportunityScore}/100 needs patience.`
            : `Risk ${candidate.profile.riskScore}/100 exceeds safe checkout threshold.`
      );
    }
  }

  for (const row of working) {
    out.set(row.link, { verdict: row.verdict, reasonSeed: row.reasonSeed });
  }
  return out;
}

export function verdictDistributionWithinTargets(verdicts: PrimaryVerdict[]): boolean {
  const n = verdicts.length;
  if (n === 0) return true;
  const slack = n <= 7 ? 0.15 : 0.08;
  const buy = share(verdicts.filter((verdict) => verdict === "BUY READY").length, n);
  const wait = share(verdicts.filter((verdict) => verdict === "WAIT").length, n);
  const compare = share(verdicts.filter((verdict) => verdict === "COMPARE").length, n);
  const avoid = share(verdicts.filter((verdict) => verdict === "AVOID").length, n);
  if (n <= 7) {
    return buy > 0 && wait > 0 && avoid > 0 && compare <= TARGET_SHARE.compareMax + slack;
  }
  return (
    buy >= TARGET_SHARE.buyMin - slack &&
    buy <= TARGET_SHARE.buyMax + slack &&
    wait >= TARGET_SHARE.waitMin - slack &&
    compare <= TARGET_SHARE.compareMax + slack &&
    avoid >= TARGET_SHARE.avoidMin - slack &&
    avoid <= TARGET_SHARE.avoidMax + slack
  );
}
