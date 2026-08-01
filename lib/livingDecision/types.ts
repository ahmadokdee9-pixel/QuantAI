/**
 * Living Decisions — permanent decision objects that evolve over time.
 */

import type { DecisionAction, DecisionChange, DecisionChangeKind } from "@/lib/decisionMemory/types";
import type { DecisionDomain } from "@/lib/universalDecision/types";

export type LivingDecisionSnapshot = {
  decisionId: string;
  domain: DecisionDomain;
  action: DecisionAction;
  confidence: number | null;
  reasons: string[];
  price: number | null;
  rating: number | null;
  availability: string | null;
  stockState: string | null;
  merchant: string | null;
  provider: string | null;
  evidence: unknown[];
  timestamp: string;
  memoryIdentity: string;
  productLink: string;
  productTitle: string | null;
};

export type LivingTimelineEvent = {
  id: string;
  at: string;
  kind: "recorded" | DecisionChangeKind;
  label: string;
  action?: DecisionAction | null;
  previous?: string | number | null;
  current?: string | number | null;
};

export type LivingDecisionThread = {
  decisionId: string;
  domain: DecisionDomain;
  memoryIdentity: string;
  productLink: string;
  title: string | null;
  merchant: string | null;
  provider: string | null;
  current: LivingDecisionSnapshot;
  events: LivingTimelineEvent[];
  recentChanges: DecisionChange[];
  watched: boolean;
};

export type LivingUpdateEngineInput = {
  domain?: DecisionDomain;
  memoryIdentity?: string | null;
  productLink: string;
  productTitle?: string | null;
  merchant?: string | null;
  provider?: string | null;
  image?: string | null;
  decision: DecisionAction;
  confidence?: number | null;
  price?: number | null;
  rating?: number | null;
  score?: number | null;
  reasons?: string[];
  availability?: string | null;
  stockState?: string | null;
  evidence?: unknown[];
  sourceFreshnessAt?: string | null;
  searchQuery?: string | null;
  watched?: boolean;
  /** Optional competing option signal for better_alternative detection. */
  betterAlternativeTitle?: string | null;
};
