/**
 * Phase 27.2 — Compare Dominance Elimination.
 * Rare COMPARE qualification + tray balancing (does not modify Phase 27.1 frozen modules).
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";

export type CompareTraySignals = {
  link: string;
  price: number;
  trust: number;
  spreadConfidence: number;
  verdict: PrimaryVerdict;
  coherent: CoherentProductDecision;
  alternativePressureScore: number;
};

export type CompareDominanceResult = {
  verdict: PrimaryVerdict;
  reason: string;
  qualifiedCompare: boolean;
};

const TARGET_SHARE = {
  buyMin: 0.35,
  buyMax: 0.55,
  waitMin: 0.2,
  waitMax: 0.35,
  avoidMin: 0.1,
  avoidMax: 0.2,
  compareMax: 0.1,
} as const;

function clipLine(text: string, max = 96): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function safeScore(value: number | null | undefined, fallback = 0): number {
  return value != null && Number.isFinite(value) ? value : fallback;
}

function effectiveTrust(coherent: CoherentProductDecision): number {
  const { trustRisk } = coherent;
  if (Number.isFinite(trustRisk.trustScore) && trustRisk.trustScore > 0) {
    return trustRisk.trustScore;
  }
  return Math.max(0, Math.min(100, 100 - safeScore(trustRisk.riskScore, 50)));
}

function strongAlternatives(signals: CompareTraySignals[], self: CompareTraySignals): CompareTraySignals[] {
  return signals.filter(
    (peer) =>
      peer.link !== self.link &&
      peer.trust >= 58 &&
      Math.abs(peer.spreadConfidence - self.spreadConfidence) < 8
  );
}

function nearestPeerMetric(
  signals: CompareTraySignals[],
  self: CompareTraySignals,
  pick: (peer: CompareTraySignals) => number
): number {
  const peers = signals.filter((peer) => peer.link !== self.link);
  if (!peers.length) return 100;
  return Math.min(...peers.map(pick));
}

function hasDominantWinner(signals: CompareTraySignals[]): boolean {
  const dominantBuy = signals.find(
    (row) => row.verdict === "BUY READY" && row.spreadConfidence > 85
  );
  if (dominantBuy) return true;

  const ranked = [...signals].sort((a, b) => b.spreadConfidence - a.spreadConfidence);
  const lead = ranked[0];
  const second = ranked[1];
  if (!lead || !second) return false;
  const gap = lead.spreadConfidence - second.spreadConfidence;
  return gap >= 8 && (lead.verdict === "BUY READY" || lead.spreadConfidence >= 82);
}

/** ALL strict gates must pass — alternative pressure alone never qualifies COMPARE. */
export function strictCompareQualifies(
  signals: CompareTraySignals[],
  self: CompareTraySignals
): boolean {
  if (strongAlternatives(signals, self).length < 2) return false;
  if (nearestPeerMetric(signals, self, (peer) => Math.abs(peer.spreadConfidence - self.spreadConfidence)) >= 8) {
    return false;
  }
  if (
    nearestPeerMetric(signals, self, (peer) => {
      if (peer.price <= 0 || self.price <= 0) return 100;
      return (Math.abs(peer.price - self.price) / Math.min(peer.price, self.price)) * 100;
    }) >= 15
  ) {
    return false;
  }
  if (nearestPeerMetric(signals, self, (peer) => Math.abs(peer.trust - self.trust)) >= 10) {
    return false;
  }
  if (hasDominantWinner(signals)) return false;
  return true;
}

function convertDisqualifiedCompare(
  coherent: CoherentProductDecision,
  fallbackReason: string
): CompareDominanceResult {
  const trust = effectiveTrust(coherent);
  const risk = safeScore(coherent.trustRisk.riskScore);
  const distLow = safeScore(coherent.priceTarget.distanceFromLowPct, 0);
  const savings = safeScore(coherent.priceTarget.potentialSavings, 0);
  const priceElevated = distLow >= 15 || savings >= 10;
  const weakValue =
    priceElevated ||
    safeScore(coherent.priceTarget.opportunityScore, 0) < 48 ||
    coherent.discountTruth.verdict === "Uncertain" ||
    coherent.discountTruth.verdict === "Inflated" ||
    coherent.discountTruth.verdict === "Likely Inflated";

  if (trust < 48 || risk >= 58 || safeScore(coherent.trustRisk.factors.suspiciousOfferRisk) >= 55) {
    return {
      verdict: "AVOID",
      reason: clipLine(
        coherent.trustRisk.riskReason || "Poor trust profile — avoid checkout on this listing."
      ),
      qualifiedCompare: false,
    };
  }

  if (weakValue || priceElevated) {
    return {
      verdict: "WAIT",
      reason: clipLine(
        coherent.priceTarget.explanation ||
          coherent.buyWait.explanation ||
          fallbackReason ||
          "High price or weak value — wait for a better entry."
      ),
      qualifiedCompare: false,
    };
  }

  const trusted = trust >= 62 && risk < 52;
  const strongIntent = coherent.intentIntelligence.intentMatchScore >= 56;
  if (trusted && strongIntent && !priceElevated) {
    return {
      verdict: "BUY READY",
      reason: clipLine(
        coherent.unifiedDecision.finalReasoning ||
          coherent.intentIntelligence.matchExplanation ||
          "Strong trust and fit — buy-ready despite nearby alternatives."
      ),
      qualifiedCompare: false,
    };
  }

  return {
    verdict: "WAIT",
    reason: clipLine(fallbackReason || "No rare compare case — patience recommended."),
    qualifiedCompare: false,
  };
}

function dominantBuySuppressesCompare(signals: CompareTraySignals[]): CompareTraySignals | null {
  return (
    signals.find((row) => row.verdict === "BUY READY" && row.spreadConfidence > 85) ?? null
  );
}

/** Eliminate COMPARE unless strict qualification passes; never create COMPARE from pressure alone. */
export function resolveCompareDominanceVerdict(
  signals: CompareTraySignals[],
  self: CompareTraySignals,
  phase271Verdict: PrimaryVerdict,
  phase271Reason: string
): CompareDominanceResult {
  if (phase271Verdict !== "COMPARE") {
    return { verdict: phase271Verdict, reason: phase271Reason, qualifiedCompare: false };
  }

  const dominantBuy = dominantBuySuppressesCompare(signals);
  if (dominantBuy && dominantBuy.link !== self.link) {
    return convertDisqualifiedCompare(self.coherent, phase271Reason);
  }

  if (!strictCompareQualifies(signals, self)) {
    return convertDisqualifiedCompare(self.coherent, phase271Reason);
  }

  return {
    verdict: "COMPARE",
    reason: clipLine(
      phase271Reason ||
        self.coherent.alternativeAdvantage.comparisonSummary ||
        "Rare close tie — compare these two strong options before buying."
    ),
    qualifiedCompare: true,
  };
}

function share(count: number, total: number): number {
  return total > 0 ? count / total : 0;
}

function countVerdict(rows: CompareTraySignals[], verdict: PrimaryVerdict): number {
  return rows.filter((row) => row.verdict === verdict).length;
}

function isBuyPromotable(row: CompareTraySignals): boolean {
  const trust = effectiveTrust(row.coherent);
  const risk = safeScore(row.coherent.trustRisk.riskScore);
  return (
    trust >= 60 &&
    risk < 55 &&
    row.coherent.intentIntelligence.intentMatchScore >= 54 &&
    safeScore(row.coherent.priceTarget.distanceFromLowPct, 99) < 20
  );
}

/** Tray-wide share balancing toward BUY 35–55%, WAIT 20–35%, AVOID 10–20%, COMPARE 0–10%. */
export function balanceTrayVerdictDistribution(
  rows: Array<CompareTraySignals & { reason: string }>
): Map<string, CompareDominanceResult> {
  const out = new Map<string, CompareDominanceResult>();
  const working = rows.map((row) => ({
    ...row,
    verdict: row.verdict,
    reason: row.reason,
    qualifiedCompare: row.verdict === "COMPARE",
  }));

  const n = working.length;
  if (n === 0) return out;

  const maxCompare = Math.max(0, Math.floor(n * TARGET_SHARE.compareMax));
  let compareRows = working.filter((row) => row.verdict === "COMPARE");
  compareRows.sort((a, b) => a.spreadConfidence - b.spreadConfidence);
  while (compareRows.length > maxCompare) {
    const row = compareRows.shift()!;
    const converted = convertDisqualifiedCompare(row.coherent, row.reason);
    row.verdict = converted.verdict;
    row.reason = converted.reason;
    row.qualifiedCompare = false;
    compareRows = working.filter((r) => r.verdict === "COMPARE");
  }

  const minBuy = Math.ceil(n * TARGET_SHARE.buyMin);
  const maxBuy = Math.floor(n * TARGET_SHARE.buyMax);
  let buyCount = countVerdict(working, "BUY READY");
  if (buyCount < minBuy) {
    const promotable = working
      .filter((row) => row.verdict === "WAIT" && isBuyPromotable(row))
      .sort((a, b) => b.spreadConfidence - a.spreadConfidence);
    for (const row of promotable) {
      if (buyCount >= minBuy || buyCount >= maxBuy) break;
      row.verdict = "BUY READY";
      row.reason = clipLine(
        row.coherent.unifiedDecision.finalReasoning ||
          row.coherent.intentIntelligence.matchExplanation ||
          row.reason
      );
      row.qualifiedCompare = false;
      buyCount += 1;
    }
  }

  while (buyCount > maxBuy) {
    const demote = working
      .filter((row) => row.verdict === "BUY READY")
      .sort((a, b) => a.spreadConfidence - b.spreadConfidence)[0];
    if (!demote) break;
    demote.verdict = "WAIT";
    demote.reason = clipLine(
      demote.coherent.priceTarget.explanation ||
        "Tray balance — wait for stronger price confirmation."
    );
    demote.qualifiedCompare = false;
    buyCount -= 1;
  }

  const minWait = Math.ceil(n * TARGET_SHARE.waitMin);
  let waitCount = countVerdict(working, "WAIT");
  if (waitCount < minWait) {
    const demoteBuy = working
      .filter((row) => row.verdict === "BUY READY")
      .sort((a, b) => a.spreadConfidence - b.spreadConfidence);
    for (const row of demoteBuy) {
      if (waitCount >= minWait || buyCount <= minBuy) break;
      row.verdict = "WAIT";
      row.reason = clipLine(row.coherent.buyWait.explanation || row.reason);
      row.qualifiedCompare = false;
      waitCount += 1;
      buyCount -= 1;
    }
  }

  const minAvoid = Math.ceil(n * TARGET_SHARE.avoidMin);
  let avoidCount = countVerdict(working, "AVOID");
  if (avoidCount < minAvoid) {
    const candidates = working
      .filter((row) => row.verdict === "WAIT" && effectiveTrust(row.coherent) < 52)
      .sort((a, b) => effectiveTrust(a.coherent) - effectiveTrust(b.coherent));
    for (const row of candidates) {
      if (avoidCount >= minAvoid) break;
      row.verdict = "AVOID";
      row.reason = clipLine(row.coherent.trustRisk.riskReason || row.reason);
      row.qualifiedCompare = false;
      avoidCount += 1;
      waitCount = Math.max(0, waitCount - 1);
    }
  }

  const maxAvoid = Math.floor(n * TARGET_SHARE.avoidMax);
  if (avoidCount > maxAvoid) {
    const promote = working
      .filter((row) => row.verdict === "AVOID")
      .sort((a, b) => b.spreadConfidence - a.spreadConfidence);
    for (const row of promote) {
      if (avoidCount <= maxAvoid) break;
      row.verdict = "WAIT";
      row.reason = clipLine(row.coherent.buyWait.explanation || row.reason);
      avoidCount -= 1;
      waitCount += 1;
    }
  }

  for (const row of working) {
    out.set(row.link, {
      verdict: row.verdict,
      reason: row.reason,
      qualifiedCompare: row.qualifiedCompare,
    });
  }

  return out;
}

/** Validation helper for tests — tray compare share within 0–10%. */
export function compareShareWithinTarget(verdicts: PrimaryVerdict[]): boolean {
  const compareCount = verdicts.filter((verdict) => verdict === "COMPARE").length;
  return share(compareCount, verdicts.length) <= TARGET_SHARE.compareMax + 0.001;
}
