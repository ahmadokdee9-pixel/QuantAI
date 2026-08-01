/**
 * Local Decision Memory fallback (guest / offline).
 * Server remains source of truth when signed in.
 */

import { detectDecisionChanges, confidenceTrend } from "@/lib/decisionMemory/changeDetection";
import type {
  DecisionChange,
  DecisionMemoryEpisode,
  DecisionMemoryWriteInput,
  DecisionUpdateItem,
} from "@/lib/decisionMemory/types";
import {
  DECISION_MEMORY_STORAGE_KEY,
  DECISION_VISIT_STORAGE_KEY,
} from "@/lib/decisionMemory/types";
import { resolveLivingDecisionId, resolveThreadKey } from "@/lib/livingDecision/identity";
import { prepareLivingDecisionUpdate } from "@/lib/livingDecision/updateEngine";

type LocalStore = {
  version: 1;
  episodes: DecisionMemoryEpisode[];
  updatedAt: string;
};

type VisitStore = {
  version: 1;
  lastVisitAt: string | null;
  lastUpdatesSeenAt: string | null;
};

function emptyStore(): LocalStore {
  return { version: 1, episodes: [], updatedAt: new Date().toISOString() };
}

function readStore(): LocalStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(DECISION_MEMORY_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as LocalStore;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.episodes)) return emptyStore();
    return parsed;
  } catch {
    return emptyStore();
  }
}

function writeStore(store: LocalStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    DECISION_MEMORY_STORAGE_KEY,
    JSON.stringify({ ...store, updatedAt: new Date().toISOString() })
  );
}

function readVisit(): VisitStore {
  if (typeof window === "undefined") {
    return { version: 1, lastVisitAt: null, lastUpdatesSeenAt: null };
  }
  try {
    const raw = window.localStorage.getItem(DECISION_VISIT_STORAGE_KEY);
    if (!raw) return { version: 1, lastVisitAt: null, lastUpdatesSeenAt: null };
    const parsed = JSON.parse(raw) as VisitStore;
    return {
      version: 1,
      lastVisitAt: parsed?.lastVisitAt ?? null,
      lastUpdatesSeenAt: parsed?.lastUpdatesSeenAt ?? null,
    };
  } catch {
    return { version: 1, lastVisitAt: null, lastUpdatesSeenAt: null };
  }
}

function writeVisit(visit: VisitStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DECISION_VISIT_STORAGE_KEY, JSON.stringify(visit));
}

function threadKey(ep: DecisionMemoryEpisode): string {
  return (
    ep.decisionId ||
    resolveThreadKey({
      memoryIdentity: ep.memoryIdentity,
      productLink: ep.productLink,
      domain: ep.domain,
    })
  );
}

function enrichEpisodes(episodes: DecisionMemoryEpisode[]): DecisionMemoryEpisode[] {
  const latestByThread = new Map<string, DecisionMemoryEpisode>();
  for (const ep of episodes) {
    const key = threadKey(ep);
    if (!latestByThread.has(key)) latestByThread.set(key, ep);
  }

  return episodes.map((ep) => {
    const key = threadKey(ep);
    const latest = latestByThread.get(key);
    const hist = episodes
      .filter((row) => threadKey(row) === key)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const prevConf = hist[1]?.confidence ?? null;
    const currConf = hist[0]?.confidence ?? ep.confidence;
    const trend = confidenceTrend(prevConf, currConf);
    const hasChanges = (ep.changes?.length ?? 0) > 0;
    return {
      ...ep,
      decisionId: ep.decisionId || key,
      currentPrice: latest?.price ?? ep.price,
      currentDecision: latest?.decision ?? ep.decision,
      currentConfidence: latest?.confidence ?? ep.confidence,
      previousConfidence: prevConf,
      scoreTrend: trend,
      status: ep.watched ? "Watching" : hasChanges ? "Living" : "Recorded",
    };
  });
}

export function listLocalDecisionMemory(): DecisionMemoryEpisode[] {
  const store = readStore();
  const sorted = [...store.episodes].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return enrichEpisodes(sorted);
}

export function listLocalWatchedDecisions(): DecisionMemoryEpisode[] {
  const all = listLocalDecisionMemory();
  const latestWatched = new Map<string, DecisionMemoryEpisode>();
  for (const ep of all) {
    if (!ep.watched) continue;
    const key = threadKey(ep);
    if (!latestWatched.has(key)) latestWatched.set(key, ep);
  }
  return [...latestWatched.values()];
}

export function listLocalEpisodesForLink(productLink: string): DecisionMemoryEpisode[] {
  const link = productLink.trim();
  return listLocalDecisionMemory()
    .filter((ep) => ep.productLink === link || ep.memoryIdentity === link || ep.decisionId === link)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

export function listLocalEpisodesForDecisionId(decisionId: string): DecisionMemoryEpisode[] {
  const id = decisionId.trim();
  return listLocalDecisionMemory()
    .filter((ep) => ep.decisionId === id || threadKey(ep) === id)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

export function recordLocalDecisionMemory(
  input: DecisionMemoryWriteInput
): DecisionMemoryEpisode | null {
  const link = input.productLink?.trim();
  if (!link || !input.decision) return null;

  const store = readStore();
  const memoryIdentity = resolveThreadKey({
    memoryIdentity: input.memoryIdentity,
    productLink: link,
    domain: input.domain,
  });
  const previous = store.episodes
    .filter(
      (ep) =>
        ep.productLink === link ||
        ep.memoryIdentity === memoryIdentity ||
        (input.decisionId && ep.decisionId === input.decisionId)
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];

  const prepared = prepareLivingDecisionUpdate({
    input: {
      domain: input.domain || "product",
      memoryIdentity,
      productLink: link,
      productTitle: input.productTitle,
      merchant: input.merchant,
      provider: input.provider ?? input.merchant,
      image: input.image,
      decision: input.decision,
      confidence: input.confidence,
      price: input.price,
      rating: input.rating,
      score: input.score,
      reasons: input.reasons,
      availability: input.availability,
      stockState: input.stockState,
      evidence: input.evidence,
      sourceFreshnessAt: input.sourceFreshnessAt,
      searchQuery: input.searchQuery,
      watched: input.watched,
      betterAlternativeTitle: input.betterAlternativeTitle,
    },
    previous: previous
      ? {
          decisionId: previous.decisionId,
          decision: previous.decision,
          confidence: previous.confidence,
          price: previous.price,
          availability: previous.availability,
          rating: previous.rating,
          stockState: previous.stockState,
          merchant: previous.merchant,
          provider: previous.provider,
          domain: previous.domain,
        }
      : null,
    userScope: "guest",
  });

  // Dedupe identical snapshot within 5 minutes
  if (previous) {
    const ageMs = Date.now() - new Date(previous.createdAt).getTime();
    if (
      ageMs < 5 * 60 * 1000 &&
      previous.decision === prepared.write.decision &&
      Math.round(previous.confidence ?? -1) === Math.round(prepared.write.confidence ?? -2) &&
      Math.round(previous.price ?? -1) === Math.round(prepared.write.price ?? -2) &&
      prepared.changes.length === 0
    ) {
      return previous;
    }
  }

  const changes =
    Array.isArray(input.changes) && input.changes.length
      ? input.changes
      : prepared.changes.length
        ? prepared.changes
        : detectDecisionChanges(previous, prepared.write);

  const decisionId =
    prepared.decisionId ||
    resolveLivingDecisionId({
      existingDecisionId: previous?.decisionId,
      userScope: "guest",
      memoryIdentity,
      productLink: link,
      domain: input.domain,
    });

  const episode: DecisionMemoryEpisode = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    decisionId,
    searchQuery: prepared.write.searchQuery ?? null,
    productId: prepared.write.productId ?? null,
    productLink: link,
    productTitle: prepared.write.productTitle ?? null,
    merchant: prepared.write.merchant ?? null,
    image: prepared.write.image ?? null,
    decision: prepared.write.decision,
    confidence: prepared.write.confidence ?? null,
    price: prepared.write.price ?? null,
    score: prepared.write.score ?? null,
    reasons: Array.isArray(prepared.write.reasons)
      ? prepared.write.reasons.filter(Boolean).slice(0, 8)
      : [],
    availability: prepared.write.availability ?? null,
    watched: Boolean(prepared.write.watched) || Boolean(previous?.watched),
    changes,
    createdAt: new Date().toISOString(),
    domain: prepared.write.domain || "product",
    memoryIdentity,
    contextualVerb: input.contextualVerb ?? null,
    evidence: Array.isArray(prepared.write.evidence) ? prepared.write.evidence : [],
    sourceFreshnessAt: prepared.write.sourceFreshnessAt ?? null,
    rating: prepared.write.rating ?? null,
    provider: prepared.write.provider ?? null,
    stockState: prepared.write.stockState ?? null,
  };

  store.episodes = [episode, ...store.episodes].slice(0, 400);
  writeStore(store);
  return episode;
}

export function markLocalDecisionWatched(productLink: string): boolean {
  const link = productLink.trim();
  if (!link) return false;
  const store = readStore();
  let touched = false;
  store.episodes = store.episodes.map((ep) => {
    if (
      ep.productLink !== link &&
      ep.memoryIdentity !== link &&
      ep.decisionId !== link
    ) {
      return ep;
    }
    touched = true;
    return { ...ep, watched: true };
  });
  if (!touched) return false;
  writeStore(store);
  return true;
}

export function listLocalDecisionUpdates(sinceIso?: string | null): DecisionUpdateItem[] {
  const visit = readVisit();
  const since = sinceIso ?? visit.lastUpdatesSeenAt ?? visit.lastVisitAt;
  const all = listLocalDecisionMemory();
  const items: DecisionUpdateItem[] = [];

  for (const ep of all) {
    if (!ep.changes?.length) continue;
    if (since && ep.createdAt <= since) continue;
    const previous = all.find(
      (row) =>
        threadKey(row) === threadKey(ep) &&
        row.id !== ep.id &&
        row.createdAt < ep.createdAt
    );
    items.push({
      id: ep.id,
      decisionId: ep.decisionId,
      productLink: ep.productLink,
      productTitle: ep.productTitle,
      merchant: ep.merchant,
      summary: ep.changes.map((c: DecisionChange) => c.label).join(" · "),
      changes: ep.changes,
      previousDecision: previous?.decision ?? null,
      currentDecision: ep.decision,
      previousConfidence: previous?.confidence ?? null,
      currentConfidence: ep.confidence,
      previousPrice: previous?.price ?? null,
      currentPrice: ep.price,
      createdAt: ep.createdAt,
      watched: ep.watched,
      domain: ep.domain,
    });
  }

  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 40);
}

export function markLocalUpdatesSeen(): void {
  const now = new Date().toISOString();
  writeVisit({
    version: 1,
    lastVisitAt: now,
    lastUpdatesSeenAt: now,
  });
}

export function touchLocalVisit(): void {
  const visit = readVisit();
  writeVisit({
    ...visit,
    version: 1,
    lastVisitAt: new Date().toISOString(),
  });
}

export function scoreHistoryForLink(productLink: string): Array<{
  confidence: number;
  createdAt: string;
  decision: string;
}> {
  return listLocalEpisodesForLink(productLink)
    .filter((ep) => ep.confidence != null)
    .map((ep) => ({
      confidence: Math.round(ep.confidence!),
      createdAt: ep.createdAt,
      decision: ep.decision,
    }));
}
