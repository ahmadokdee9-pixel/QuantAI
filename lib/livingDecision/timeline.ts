import type { DecisionMemoryEpisode } from "@/lib/decisionMemory/types";
import type { LivingTimelineEvent, LivingDecisionThread } from "@/lib/livingDecision/types";
import { resolveThreadKey } from "@/lib/livingDecision/identity";

/** Build chronological living timeline (oldest → newest) from real episodes only. */
export function buildLivingTimelineEvents(
  episodes: DecisionMemoryEpisode[]
): LivingTimelineEvent[] {
  if (!episodes.length) return [];
  const ordered = [...episodes].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
  );
  const events: LivingTimelineEvent[] = [];

  const first = ordered[0]!;
  events.push({
    id: `${first.id}_recorded`,
    at: first.createdAt,
    kind: "recorded",
    label: `Decision recorded: ${first.decision}`,
    action: first.decision,
    current: first.decision,
  });

  for (const ep of ordered.slice(1)) {
    const changes = Array.isArray(ep.changes) ? ep.changes : [];
    if (changes.length === 0) {
      events.push({
        id: `${ep.id}_recheck`,
        at: ep.createdAt,
        kind: "recorded",
        label: `Rechecked — still ${ep.decision}`,
        action: ep.decision,
        current: ep.decision,
      });
      continue;
    }
    for (let i = 0; i < changes.length; i += 1) {
      const change = changes[i]!;
      events.push({
        id: `${ep.id}_${change.kind}_${i}`,
        at: ep.createdAt,
        kind: change.kind,
        label: change.label,
        action: ep.decision,
        previous: change.previous ?? null,
        current: change.current ?? null,
      });
    }
  }

  return events;
}

export function buildLivingDecisionThread(
  episodes: DecisionMemoryEpisode[]
): LivingDecisionThread | null {
  if (!episodes.length) return null;
  const latest = [...episodes].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]!;
  const decisionId =
    latest.decisionId ||
    resolveThreadKey({
      memoryIdentity: latest.memoryIdentity,
      productLink: latest.productLink,
      domain: latest.domain,
    });

  const events = buildLivingTimelineEvents(episodes);
  const recentChanges = episodes
    .flatMap((ep) => ep.changes || [])
    .slice(-8);

  return {
    decisionId,
    domain: latest.domain || "product",
    memoryIdentity: latest.memoryIdentity || latest.productLink,
    productLink: latest.productLink,
    title: latest.productTitle,
    merchant: latest.merchant,
    provider: latest.provider || latest.merchant,
    current: {
      decisionId,
      domain: latest.domain || "product",
      action: latest.decision,
      confidence: latest.confidence,
      reasons: latest.reasons,
      price: latest.price,
      rating: latest.rating ?? null,
      availability: latest.availability,
      stockState: latest.stockState ?? null,
      merchant: latest.merchant,
      provider: latest.provider || latest.merchant,
      evidence: latest.evidence || [],
      timestamp: latest.createdAt,
      memoryIdentity: latest.memoryIdentity || latest.productLink,
      productLink: latest.productLink,
      productTitle: latest.productTitle,
    },
    events,
    recentChanges,
    watched: episodes.some((ep) => ep.watched),
  };
}

export function groupEpisodesByLivingId(
  episodes: DecisionMemoryEpisode[]
): Map<string, DecisionMemoryEpisode[]> {
  const map = new Map<string, DecisionMemoryEpisode[]>();
  for (const ep of episodes) {
    const key =
      ep.decisionId ||
      resolveThreadKey({
        memoryIdentity: ep.memoryIdentity,
        productLink: ep.productLink,
        domain: ep.domain,
      });
    const list = map.get(key) || [];
    list.push(ep);
    map.set(key, list);
  }
  return map;
}
