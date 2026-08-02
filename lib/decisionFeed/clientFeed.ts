/**
 * Guest / offline Decision Feed — built from local Living Decision memory only.
 */

import {
  listLocalDecisionMemory,
  listLocalDecisionUpdates,
  readVisitSince,
} from "@/lib/decisionFeed/localVisitBridge";
import {
  buildRankedFeed,
  sourceFromEpisode,
  sourceFromUpdate,
} from "@/lib/decisionFeed/buildFeed";
import type { DecisionFeedResponse, FeedDomainFilter } from "@/lib/decisionFeed/types";
import type { DecisionMemoryEpisode } from "@/lib/decisionMemory/types";

function previousFor(
  ep: DecisionMemoryEpisode,
  all: DecisionMemoryEpisode[]
): DecisionMemoryEpisode | null {
  const key = ep.decisionId || ep.memoryIdentity || ep.productLink;
  return (
    all.find(
      (row) =>
        (row.decisionId || row.memoryIdentity || row.productLink) === key &&
        row.id !== ep.id &&
        row.createdAt < ep.createdAt
    ) || null
  );
}

export function buildLocalDecisionFeed(opts?: {
  domain?: FeedDomainFilter;
  limit?: number;
}): DecisionFeedResponse {
  const since = readVisitSince();
  const updates = listLocalDecisionUpdates(since);
  const episodes = listLocalDecisionMemory();
  const queryByLink = new Map<string, string | null>();
  for (const ep of episodes) {
    if (!queryByLink.has(ep.productLink) && ep.searchQuery) {
      queryByLink.set(ep.productLink, ep.searchQuery);
    }
  }

  const sources = [
    ...updates.map((item) => {
      const src = sourceFromUpdate(item);
      src.searchQuery = queryByLink.get(item.productLink) ?? null;
      return src;
    }),
    ...episodes
      .filter((ep) => ep.changes?.length && (ep.watched || !since || ep.createdAt > since))
      .map((ep) => sourceFromEpisode(ep, previousFor(ep, episodes))),
  ];

  // Dedupe by episode id
  const seen = new Set<string>();
  const unique = sources.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  return buildRankedFeed(unique, {
    domain: opts?.domain || "all",
    limit: opts?.limit ?? 80,
    since,
  });
}
