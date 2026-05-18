import type { ExternalMerchantCandidate } from "@/lib/intelligence/externalMerchantSearch";

export type MerchantReliabilitySnapshot = {
  merchantKey: string;
  label: string;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  reliabilityScore: number;
  penalty: number;
};

type MerchantReliabilityState = {
  label: string;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  lastUpdated: number;
};

const MERCHANT_RELIABILITY = new Map<string, MerchantReliabilityState>();
const WINDOW_MS = 20 * 60 * 1000;

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function stateFor(candidate: ExternalMerchantCandidate): MerchantReliabilityState {
  const existing = MERCHANT_RELIABILITY.get(candidate.merchantKey);
  if (existing && Date.now() - existing.lastUpdated <= WINDOW_MS) return existing;
  const fresh = {
    label: candidate.label,
    successCount: 0,
    failureCount: 0,
    timeoutCount: 0,
    lastUpdated: Date.now(),
  };
  MERCHANT_RELIABILITY.set(candidate.merchantKey, fresh);
  return fresh;
}

function reliabilityScore(state: MerchantReliabilityState): number {
  const total = state.successCount + state.failureCount + state.timeoutCount;
  if (total === 0) return 100;
  const reliability = (state.successCount + 0.35) / (total + 0.7);
  const timeoutDrag = state.timeoutCount / Math.max(1, total);
  return Math.round(clamp(reliability * 100 - timeoutDrag * 24, 10, 100));
}

export function reliabilityPenaltyForMerchant(merchantKey: string): number {
  const state = MERCHANT_RELIABILITY.get(merchantKey);
  if (!state || Date.now() - state.lastUpdated > WINDOW_MS) return 0;
  const score = reliabilityScore(state);
  if (score >= 58 || state.failureCount + state.timeoutCount < 2) return 0;
  return Math.round(clamp((58 - score) * 0.35, 0, 10));
}

export function recordDiscoveryReliability(args: {
  candidates: ExternalMerchantCandidate[];
  success: boolean;
  timedOut: boolean;
}): MerchantReliabilitySnapshot[] {
  for (const candidate of args.candidates) {
    const state = stateFor(candidate);
    state.lastUpdated = Date.now();
    if (args.success) state.successCount += 1;
    else state.failureCount += 1;
    if (args.timedOut) state.timeoutCount += 1;
  }
  return discoveryReliabilitySnapshot(args.candidates);
}

export function discoveryReliabilitySnapshot(candidates: ExternalMerchantCandidate[]): MerchantReliabilitySnapshot[] {
  return candidates.slice(0, 12).map((candidate) => {
    const state = stateFor(candidate);
    const score = reliabilityScore(state);
    return {
      merchantKey: candidate.merchantKey,
      label: state.label,
      successCount: state.successCount,
      failureCount: state.failureCount,
      timeoutCount: state.timeoutCount,
      reliabilityScore: score,
      penalty: reliabilityPenaltyForMerchant(candidate.merchantKey),
    };
  });
}
