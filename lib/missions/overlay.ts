/**
 * Attach Living Decision overlays onto mission decisions from real memory episodes.
 */

import type { DecisionMemoryEpisode } from "@/lib/decisionMemory/types";
import type { MissionDecisionItem } from "@/lib/missions/types";
import { attachEstimatedSavings, computeMissionIntelligence } from "@/lib/missions/intelligence";
import type { Mission, MissionIntelligence } from "@/lib/missions/types";

function episodeKey(ep: DecisionMemoryEpisode): string {
  return (ep.decisionId || ep.memoryIdentity || ep.productLink || "").trim();
}

function matchEpisode(
  decision: MissionDecisionItem,
  byKey: Map<string, DecisionMemoryEpisode>,
  byQuery: Map<string, DecisionMemoryEpisode>
): DecisionMemoryEpisode | null {
  const keys = [
    decision.decisionId,
    decision.memoryIdentity,
    decision.productLink,
  ]
    .map((k) => (k || "").trim())
    .filter(Boolean);

  for (const k of keys) {
    const hit = byKey.get(k);
    if (hit) return hit;
  }

  const q = (decision.searchQuery || "").trim().toLowerCase();
  if (q) {
    const byExact = byQuery.get(q);
    if (byExact) return byExact;
    // Soft match: episode search query contains mission query or vice versa
    for (const [eq, ep] of byQuery) {
      if (eq.includes(q) || q.includes(eq)) return ep;
    }
  }

  return null;
}

export function indexLatestEpisodes(episodes: DecisionMemoryEpisode[]): {
  byKey: Map<string, DecisionMemoryEpisode>;
  byQuery: Map<string, DecisionMemoryEpisode>;
} {
  const sorted = [...episodes].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1
  );
  const byKey = new Map<string, DecisionMemoryEpisode>();
  const byQuery = new Map<string, DecisionMemoryEpisode>();

  for (const ep of sorted) {
    const k = episodeKey(ep);
    if (k && !byKey.has(k)) byKey.set(k, ep);
    if (ep.decisionId && !byKey.has(ep.decisionId)) byKey.set(ep.decisionId, ep);
    if (ep.memoryIdentity && !byKey.has(ep.memoryIdentity)) {
      byKey.set(ep.memoryIdentity, ep);
    }
    if (ep.productLink && !byKey.has(ep.productLink)) byKey.set(ep.productLink, ep);

    const q = (ep.searchQuery || "").trim().toLowerCase();
    if (q && !byQuery.has(q)) byQuery.set(q, ep);
  }

  return { byKey, byQuery };
}

export function overlayLivingOnDecisions(
  decisions: MissionDecisionItem[],
  episodes: DecisionMemoryEpisode[]
): MissionDecisionItem[] {
  const { byKey, byQuery } = indexLatestEpisodes(episodes);
  return decisions.map((d) => {
    const ep = matchEpisode(d, byKey, byQuery);
    if (!ep) return { ...d, living: d.living ?? null };

    const linked: MissionDecisionItem = {
      ...d,
      decisionId: d.decisionId || ep.decisionId || null,
      productLink: d.productLink || ep.productLink || null,
      memoryIdentity: d.memoryIdentity || ep.memoryIdentity || null,
      living: {
        action: ep.currentDecision ?? ep.decision ?? null,
        confidence: ep.currentConfidence ?? ep.confidence ?? null,
        price: ep.currentPrice ?? ep.price ?? null,
        changesCount: Array.isArray(ep.changes) ? ep.changes.length : 0,
        watched: Boolean(ep.watched),
        lastUpdatedAt: ep.createdAt ?? null,
      },
    };
    return linked;
  });
}

/** Sum real price drops from linked episode change history. */
export function sumRealPriceDropSavings(
  decisions: MissionDecisionItem[],
  episodes: DecisionMemoryEpisode[]
): number | null {
  const { byKey, byQuery } = indexLatestEpisodes(episodes);
  let total = 0;
  let hits = 0;

  for (const d of decisions) {
    const ep = matchEpisode(d, byKey, byQuery);
    if (!ep?.changes?.length) continue;
    for (const c of ep.changes) {
      if (
        c.kind !== "price_changed" &&
        c.kind !== "fare_changed" &&
        c.kind !== "subscription_price_changed"
      ) {
        continue;
      }
      const prev = typeof c.previous === "number" ? c.previous : Number(c.previous);
      const curr = typeof c.current === "number" ? c.current : Number(c.current);
      if (!Number.isFinite(prev) || !Number.isFinite(curr)) continue;
      if (curr < prev) {
        total += prev - curr;
        hits += 1;
      }
    }
  }

  if (hits === 0) return null;
  return Math.round(total);
}

export function enrichMission(
  mission: Mission,
  episodes: DecisionMemoryEpisode[]
): Mission & { intelligence: MissionIntelligence } {
  const decisions = overlayLivingOnDecisions(mission.decisions, episodes);
  const withLiving: Mission = { ...mission, decisions };
  let intelligence = computeMissionIntelligence(withLiving);
  intelligence = attachEstimatedSavings(
    intelligence,
    sumRealPriceDropSavings(decisions, episodes)
  );
  return { ...withLiving, intelligence };
}
