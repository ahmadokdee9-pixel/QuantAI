/**
 * Phase 4 — Retrieval contracts (NO vector retrieval, NO embeddings).
 */

export const RETRIEVAL_CONTRACT_VERSION = "phase4-deterministic";

export type RetrievalMode = "disabled" | "canonical_surface" | "keyword_only";

export type RetrievalLayerContract = {
  version: string;
  mode: RetrievalMode;
  embeddingFree: true;
  vectorDbFree: true;
  maxLatencyMs: number;
  replaySafe: boolean;
  rankingMutation: false;
  shadowOnly: boolean;
};

export const CANONICAL_RETRIEVAL_CONTRACT: RetrievalLayerContract = {
  version: RETRIEVAL_CONTRACT_VERSION,
  mode: "canonical_surface",
  embeddingFree: true,
  vectorDbFree: true,
  maxLatencyMs: 15,
  replaySafe: true,
  rankingMutation: false,
  shadowOnly: true,
};

export type CanonicalRetrievalQuery = {
  query: string;
  category?: string;
  maxResults: number;
};

export type CanonicalRetrievalHit = {
  canonicalProductId: string;
  commerceId: string;
  identityConfidence: number;
  offerCount: number;
  /** Deterministic keyword overlap score 0–1 (no embeddings). */
  keywordScore: number;
};

export function validateRetrievalContract(contract: RetrievalLayerContract): string[] {
  const errors: string[] = [];
  if (!contract.embeddingFree) errors.push("embeddingFree must be true in phase 4");
  if (!contract.vectorDbFree) errors.push("vectorDbFree must be true in phase 4");
  if (contract.rankingMutation !== false) errors.push("rankingMutation must be false");
  return errors;
}
