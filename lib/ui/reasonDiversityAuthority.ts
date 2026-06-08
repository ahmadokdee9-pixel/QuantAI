/**
 * Phase 27.3 — Reason Diversity Authority.
 * Evidence-specific reasons; prevents repeated generic copy across tray listings.
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { BuyerRankContext } from "@/lib/ui/professionalBuyerRanking";
import type { ProductDifferentiationProfile } from "@/lib/ui/productDifferentiationEngine";

const BANNED_PHRASES = [
  "better alternatives exist",
  "confidence too limited",
  "compare before committing",
  "valid option, but close alternatives remain",
  "acceptable trust but price/timing needs patience",
] as const;

function clipLine(text: string, max = 96): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function normalizeReason(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function isBanned(text: string): boolean {
  const normalized = normalizeReason(text);
  return BANNED_PHRASES.some((phrase) => normalized.includes(phrase));
}

function candidateReasons(args: {
  coherent: CoherentProductDecision;
  profile: ProductDifferentiationProfile;
  verdict: PrimaryVerdict;
  rankContext: BuyerRankContext;
  confidence: number;
  store: string;
}): string[] {
  const { coherent, profile, verdict, rankContext, confidence, store } = args;
  const distLow = coherent.priceTarget.distanceFromLowPct ?? 0;

  const pool: string[] = [];
  if (verdict === "BUY READY") {
    pool.push(
      clipLine(`${store}: trust ${profile.trustScore}/100 and value ${profile.valueScore}/100 support checkout now.`),
      clipLine(`Rank-${rankContext.tier} pick — opportunity ${profile.opportunityScore}/100 with ${confidence}% evidence confidence.`),
      clipLine(coherent.intentIntelligence.matchExplanation || `Intent fit drives buy-ready posture at ${profile.buyerAuthority}/100 authority.`),
      clipLine(coherent.discountTruth.explanation || `Discount posture ${coherent.discountTruth.verdict} reinforces buy timing.`)
    );
  } else if (verdict === "WAIT") {
    pool.push(
      clipLine(`Price sits ${Math.round(distLow)}% above historical low — wait for ${coherent.priceTarget.targetBuyPriceLabel || "target entry"}.`),
      clipLine(`${store}: opportunity ${profile.opportunityScore}/100 is not strong enough at ${confidence}% confidence.`),
      clipLine(coherent.buyWait.explanation || `Timing verdict ${coherent.buyWait.verdict} — patience improves outcome.`),
      clipLine(`Value ${profile.valueScore}/100 vs risk ${profile.riskScore}/100 favors waiting this cycle.`)
    );
  } else if (verdict === "COMPARE") {
    pool.push(
      clipLine(`Alternative score ${profile.alternativeScore}/100 is within ${profile.buyerAuthority}/100 authority band of tray leader.`),
      clipLine(`${store} at ${confidence}% confidence — inspect spec/price delta before choosing.`),
      clipLine(coherent.alternativeAdvantage.comparisonSummary || `Peer gap ${profile.opportunityScore}/100 opportunity remains narrow.`)
    );
  } else {
    pool.push(
      clipLine(`Risk ${profile.riskScore}/100 and trust ${profile.trustScore}/100 fail checkout safety at ${store}.`),
      clipLine(coherent.trustRisk.riskReason || `Seller verification insufficient for avoid-grade confidence ${confidence}%.`),
      clipLine(`Discount integrity ${coherent.discountTruth.verdict} amplifies avoid posture.`)
    );
  }

  return pool.filter((line) => line.length > 0 && !isBanned(line));
}

/** Pick first unused, non-banned evidence reason for this product. */
export function resolveDiverseProductReason(
  args: {
    coherent: CoherentProductDecision;
    profile: ProductDifferentiationProfile;
    verdict: PrimaryVerdict;
    rankContext: BuyerRankContext;
    confidence: number;
    store: string;
    reasonSeed: string;
  },
  usedReasons: Set<string>
): string {
  const candidates = [
    clipLine(args.reasonSeed),
    ...candidateReasons(args),
    clipLine(args.coherent.rankingRationaleLine),
    clipLine(args.coherent.priceTarget.explanation),
    clipLine(args.coherent.trustRisk.trustReason),
  ].filter((line) => line.length > 0 && !isBanned(line));

  for (const reason of candidates) {
    const key = normalizeReason(reason);
    if (!usedReasons.has(key)) {
      usedReasons.add(key);
      return reason;
    }
  }

  const fallback = clipLine(
    `${args.store} · ${args.verdict} — authority ${args.profile.buyerAuthority}/100, confidence ${args.confidence}%.`
  );
  usedReasons.add(normalizeReason(fallback));
  return fallback;
}

/** Validation helper — no duplicate normalized reasons in tray. */
export function trayReasonsAreDistinct(reasons: string[]): boolean {
  const seen = new Set<string>();
  for (const reason of reasons) {
    const key = normalizeReason(reason);
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}
