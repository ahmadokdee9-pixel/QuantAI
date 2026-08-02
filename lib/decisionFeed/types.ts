/**
 * QuantAI Decision Feed — personalized "what changed" intelligence stream.
 */

import type { DecisionAction, DecisionChange, DecisionChangeKind } from "@/lib/decisionMemory/types";
import type { DecisionDomain } from "@/lib/universalDecision/types";

export type FeedDomainFilter = "all" | "product" | "flight" | "hotel" | "subscription";

export type FeedPriority = "critical" | "important" | "informational";

export type DecisionFeedItem = {
  id: string;
  decisionId: string | null;
  domain: DecisionDomain;
  title: string;
  timestamp: string;
  previousState: string;
  currentState: string;
  whyChanged: string;
  priority: FeedPriority;
  rankScore: number;
  watched: boolean;
  merchant: string | null;
  productLink: string;
  searchQuery: string | null;
  /** Deep link back to Decision Brief (home search or decisions). */
  briefHref: string;
  changes: DecisionChange[];
  primaryKind: DecisionChangeKind | "recorded";
  actionLabel: string;
};

export type DecisionFeedResponse = {
  items: DecisionFeedItem[];
  generatedAt: string;
  since: string | null;
  counts: {
    all: number;
    product: number;
    flight: number;
    hotel: number;
    subscription: number;
    critical: number;
    important: number;
    informational: number;
  };
};

export type FeedSourceEpisode = {
  id: string;
  decisionId?: string | null;
  productLink: string;
  productTitle: string | null;
  merchant: string | null;
  searchQuery?: string | null;
  decision: DecisionAction;
  confidence: number | null;
  price: number | null;
  changes: DecisionChange[];
  createdAt: string;
  watched: boolean;
  domain?: DecisionDomain;
  previousDecision?: DecisionAction | null;
  previousConfidence?: number | null;
  previousPrice?: number | null;
  currentDecision?: DecisionAction | null;
  currentConfidence?: number | null;
  currentPrice?: number | null;
};
