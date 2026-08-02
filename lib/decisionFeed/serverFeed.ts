/**
 * Server Decision Feed — signed-in users, real Supabase Living Decision data.
 */

import {
  listDecisionMemoryForUser,
  listDecisionUpdatesForUser,
} from "@/lib/decisionMemory/server";
import type { DecisionMemoryEpisode } from "@/lib/decisionMemory/types";
import {
  buildRankedFeed,
  sourceFromEpisode,
  sourceFromUpdate,
} from "@/lib/decisionFeed/buildFeed";
import type { DecisionFeedResponse, FeedDomainFilter } from "@/lib/decisionFeed/types";

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

export async function buildServerDecisionFeed(
  userId: string,
  opts?: { domain?: FeedDomainFilter; limit?: number }
): Promise<DecisionFeedResponse> {
  const [updatesResult, memoryResult] = await Promise.all([
    listDecisionUpdatesForUser(userId),
    listDecisionMemoryForUser(userId, { limit: 200 }),
  ]);

  const episodes = memoryResult.items;
  const queryByLink = new Map<string, string | null>();
  for (const ep of episodes) {
    if (!queryByLink.has(ep.productLink) && ep.searchQuery) {
      queryByLink.set(ep.productLink, ep.searchQuery);
    }
  }

  const updateSources = updatesResult.items.map((item) => {
    const src = sourceFromUpdate(item);
    src.searchQuery = queryByLink.get(item.productLink) ?? null;
    return src;
  });

  const watchedChanged = episodes
    .filter((ep) => ep.watched && ep.changes?.length)
    .map((ep) => sourceFromEpisode(ep, previousFor(ep, episodes)));

  const seen = new Set<string>();
  const sources = [...updateSources, ...watchedChanged].filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  return buildRankedFeed(sources, {
    domain: opts?.domain || "all",
    limit: opts?.limit ?? 80,
    since: null, // updates list already filtered by visit marker
  });
}
