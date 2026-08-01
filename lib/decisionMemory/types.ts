/** Decision Memory — shared types for persisted decision episodes. */

import type { DecisionDomain, ContextualVerb } from "@/lib/universalDecision/types";

export type DecisionAction = "BUY" | "WAIT" | "COMPARE" | "AVOID";

export type DecisionChangeKind =
  | "price_changed"
  | "confidence_changed"
  | "decision_changed"
  | "availability_changed"
  | "better_alternative"
  | "policy_changed"
  | "fare_changed"
  | "subscription_price_changed";

export type DecisionChange = {
  kind: DecisionChangeKind;
  label: string;
  previous?: string | number | null;
  current?: string | number | null;
};

export type DecisionMemoryEpisode = {
  id: string;
  searchQuery: string | null;
  productId: string | null;
  productLink: string;
  productTitle: string | null;
  merchant: string | null;
  image: string | null;
  decision: DecisionAction;
  confidence: number | null;
  price: number | null;
  score: number | null;
  reasons: string[];
  availability: string | null;
  watched: boolean;
  changes: DecisionChange[];
  createdAt: string;
  domain?: DecisionDomain;
  memoryIdentity?: string | null;
  contextualVerb?: ContextualVerb | string | null;
  evidence?: unknown[];
  sourceFreshnessAt?: string | null;
  /** Latest known price for this product link (from newer episodes). */
  currentPrice?: number | null;
  /** Latest known decision for this product link. */
  currentDecision?: DecisionAction | null;
  currentConfidence?: number | null;
  status?: "Watching" | "Updated" | "Recorded" | "Active";
  scoreTrend?: "Improving" | "Stable" | "Declining" | null;
  previousConfidence?: number | null;
};

export type DecisionMemoryWriteInput = {
  searchQuery?: string | null;
  productId?: string | null;
  productLink: string;
  productTitle?: string | null;
  merchant?: string | null;
  image?: string | null;
  decision: DecisionAction;
  confidence?: number | null;
  price?: number | null;
  score?: number | null;
  reasons?: string[];
  availability?: string | null;
  watched?: boolean;
  domain?: DecisionDomain;
  memoryIdentity?: string | null;
  contextualVerb?: ContextualVerb | string | null;
  evidence?: unknown[];
  sourceFreshnessAt?: string | null;
};

export type DecisionUpdateItem = {
  id: string;
  productLink: string;
  productTitle: string | null;
  merchant: string | null;
  summary: string;
  changes: DecisionChange[];
  previousDecision: DecisionAction | null;
  currentDecision: DecisionAction | null;
  previousConfidence: number | null;
  currentConfidence: number | null;
  previousPrice: number | null;
  currentPrice: number | null;
  createdAt: string;
  watched: boolean;
};

export const DECISION_MEMORY_STORAGE_KEY = "quantai-decision-memory-v1";
export const DECISION_VISIT_STORAGE_KEY = "quantai-decision-visit-v1";
