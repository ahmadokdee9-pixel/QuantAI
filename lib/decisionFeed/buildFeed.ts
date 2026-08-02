/**
 * Build Decision Feed items from real Living Decision episodes / updates.
 * No mock data — empty when nothing changed.
 */

import type { DecisionUpdateItem, DecisionMemoryEpisode } from "@/lib/decisionMemory/types";
import type { DecisionDomain } from "@/lib/universalDecision/types";
import {
  classifyFeedPriority,
  primaryChangeKind,
  scoreFeedItem,
} from "@/lib/decisionFeed/rankFeed";
import type {
  DecisionFeedItem,
  DecisionFeedResponse,
  FeedDomainFilter,
  FeedSourceEpisode,
} from "@/lib/decisionFeed/types";

function asDomain(value: string | null | undefined): DecisionDomain {
  const d = (value || "product").toLowerCase();
  if (d === "flight" || d === "hotel" || d === "subscription") return d;
  return "product";
}

function formatMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `€${Math.round(n)}`;
}

function buildPreviousState(src: FeedSourceEpisode): string {
  const parts: string[] = [];
  if (src.previousDecision) parts.push(String(src.previousDecision));
  else parts.push(src.decision);
  if (src.previousConfidence != null) parts.push(`${Math.round(src.previousConfidence)}%`);
  if (src.previousPrice != null) parts.push(formatMoney(src.previousPrice));
  return parts.join(" · ");
}

function buildCurrentState(src: FeedSourceEpisode): string {
  const decision = src.currentDecision || src.decision;
  const conf = src.currentConfidence ?? src.confidence;
  const price = src.currentPrice ?? src.price;
  const parts = [String(decision)];
  if (conf != null) parts.push(`${Math.round(conf)}%`);
  if (price != null) parts.push(formatMoney(price));
  return parts.join(" · ");
}

function briefHrefFor(src: FeedSourceEpisode): string {
  const q = (src.searchQuery || "").trim();
  if (q) return `/?q=${encodeURIComponent(q)}`;
  if (src.decisionId) return `/decisions#${encodeURIComponent(src.decisionId)}`;
  return "/decisions";
}

function actionLabelFor(domain: DecisionDomain, kind: string): string {
  if (kind === "decision_changed") return "Open Decision Brief";
  if (domain === "flight") return "Review flight decision";
  if (domain === "hotel") return "Review stay decision";
  if (domain === "subscription") return "Review subscription decision";
  return "Open Decision Brief";
}

export function feedItemFromSource(src: FeedSourceEpisode): DecisionFeedItem | null {
  if (!src.changes?.length) return null;
  const domain = asDomain(src.domain);
  const priority = classifyFeedPriority({
    changes: src.changes,
    previousDecision: src.previousDecision ?? null,
    currentDecision: src.currentDecision ?? src.decision,
    previousPrice: src.previousPrice ?? null,
    currentPrice: src.currentPrice ?? src.price,
    watched: src.watched,
  });
  const primaryKind = primaryChangeKind(src.changes);
  const rankScore = scoreFeedItem({
    priority,
    changes: src.changes,
    timestamp: src.createdAt,
    watched: src.watched,
    previousPrice: src.previousPrice,
    currentPrice: src.currentPrice ?? src.price,
    previousConfidence: src.previousConfidence,
    currentConfidence: src.currentConfidence ?? src.confidence,
    previousDecision: src.previousDecision ?? null,
    currentDecision: src.currentDecision ?? src.decision,
  });

  return {
    id: src.id,
    decisionId: src.decisionId ?? null,
    domain,
    title: src.productTitle || src.searchQuery || "Living decision update",
    timestamp: src.createdAt,
    previousState: buildPreviousState(src),
    currentState: buildCurrentState(src),
    whyChanged: src.changes.map((c) => c.label).join(" · "),
    priority,
    rankScore,
    watched: src.watched,
    merchant: src.merchant,
    productLink: src.productLink,
    searchQuery: src.searchQuery ?? null,
    briefHref: briefHrefFor(src),
    changes: src.changes,
    primaryKind,
    actionLabel: actionLabelFor(domain, primaryKind),
  };
}

export function sourceFromUpdate(item: DecisionUpdateItem): FeedSourceEpisode {
  return {
    id: item.id,
    decisionId: item.decisionId,
    productLink: item.productLink,
    productTitle: item.productTitle,
    merchant: item.merchant,
    searchQuery: null,
    decision: item.currentDecision || item.previousDecision || "COMPARE",
    confidence: item.currentConfidence,
    price: item.currentPrice,
    changes: item.changes,
    createdAt: item.createdAt,
    watched: item.watched,
    domain: item.domain || "product",
    previousDecision: item.previousDecision,
    previousConfidence: item.previousConfidence,
    previousPrice: item.previousPrice,
    currentDecision: item.currentDecision,
    currentConfidence: item.currentConfidence,
    currentPrice: item.currentPrice,
  };
}

export function sourceFromEpisode(
  ep: DecisionMemoryEpisode,
  previous?: DecisionMemoryEpisode | null
): FeedSourceEpisode {
  return {
    id: ep.id,
    decisionId: ep.decisionId,
    productLink: ep.productLink,
    productTitle: ep.productTitle,
    merchant: ep.merchant,
    searchQuery: ep.searchQuery,
    decision: ep.decision,
    confidence: ep.confidence,
    price: ep.price,
    changes: ep.changes || [],
    createdAt: ep.createdAt,
    watched: ep.watched,
    domain: ep.domain || "product",
    previousDecision: previous?.decision ?? ep.currentDecision ?? null,
    previousConfidence: previous?.confidence ?? ep.previousConfidence ?? null,
    previousPrice: previous?.price ?? null,
    currentDecision: ep.decision,
    currentConfidence: ep.confidence,
    currentPrice: ep.price,
  };
}

/** Rank + optional domain filter. Fast O(n log n). */
export function buildRankedFeed(
  sources: FeedSourceEpisode[],
  opts?: { domain?: FeedDomainFilter; limit?: number; since?: string | null }
): DecisionFeedResponse {
  const domain = opts?.domain || "all";
  const limit = opts?.limit ?? 80;
  const since = opts?.since ?? null;

  const items: DecisionFeedItem[] = [];
  for (const src of sources) {
    if (since && src.createdAt <= since) continue;
    if (!src.changes?.length) continue;
    const item = feedItemFromSource(src);
    if (!item) continue;
    if (domain !== "all" && item.domain !== domain) continue;
    items.push(item);
  }

  items.sort((a, b) => {
    if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
    return a.timestamp < b.timestamp ? 1 : -1;
  });

  const sliced = items.slice(0, limit);

  // Counts across unfiltered ranked set for chip badges
  const allItems: DecisionFeedItem[] = [];
  for (const src of sources) {
    if (since && src.createdAt <= since) continue;
    const item = feedItemFromSource(src);
    if (item) allItems.push(item);
  }

  const counts = {
    all: allItems.length,
    product: allItems.filter((i) => i.domain === "product").length,
    flight: allItems.filter((i) => i.domain === "flight").length,
    hotel: allItems.filter((i) => i.domain === "hotel").length,
    subscription: allItems.filter((i) => i.domain === "subscription").length,
    critical: sliced.filter((i) => i.priority === "critical").length,
    important: sliced.filter((i) => i.priority === "important").length,
    informational: sliced.filter((i) => i.priority === "informational").length,
  };

  return {
    items: sliced,
    generatedAt: new Date().toISOString(),
    since,
    counts,
  };
}
