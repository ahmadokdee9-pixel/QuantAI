/**
 * Phase 5 — Trust replay contracts (deterministic, bounded, shadow-only).
 */

export const TRUST_REPLAY_CONTRACT_VERSION = "phase5";

export type TrustReplayContract = {
  version: string;
  embeddingFree: true;
  vectorDbFree: true;
  rankingMutation: false;
  shadowOnly: true;
  maxLatencyMs: number;
  replaySafe: true;
  boundedExecution: true;
};

export const DEFAULT_TRUST_REPLAY_CONTRACT: TrustReplayContract = {
  version: TRUST_REPLAY_CONTRACT_VERSION,
  embeddingFree: true,
  vectorDbFree: true,
  rankingMutation: false,
  shadowOnly: true,
  maxLatencyMs: 25,
  replaySafe: true,
  boundedExecution: true,
};

export type TrustReplayTrace = {
  fingerprint: string;
  merchantCount: number;
  productCount: number;
  fraudAlerts: number;
  fakeDiscountAlerts: number;
  avgTrustScore: number;
};

export function validateTrustReplayContract(c: TrustReplayContract): string[] {
  const errors: string[] = [];
  if (!c.embeddingFree) errors.push("embeddingFree required");
  if (!c.vectorDbFree) errors.push("vectorDbFree required");
  if (c.rankingMutation !== false) errors.push("rankingMutation must be false");
  if (!c.shadowOnly) errors.push("shadowOnly required");
  if (c.maxLatencyMs <= 0) errors.push("maxLatencyMs must be > 0");
  return errors;
}
