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

function enrichEpisodes(episodes: DecisionMemoryEpisode[]): DecisionMemoryEpisode[] {
  const latestByLink = new Map<string, DecisionMemoryEpisode>();
  for (const ep of episodes) {
    if (!latestByLink.has(ep.productLink)) latestByLink.set(ep.productLink, ep);
  }

  return episodes.map((ep) => {
    const latest = latestByLink.get(ep.productLink);
    const older = episodes.find(
      (row) =>
        row.productLink === ep.productLink &&
        row.id !== ep.id &&
        row.createdAt < ep.createdAt
    );
    const hist = episodes
      .filter((row) => row.productLink === ep.productLink)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const prevConf = hist[1]?.confidence ?? older?.confidence ?? null;
    const currConf = hist[0]?.confidence ?? ep.confidence;
    const trend = confidenceTrend(prevConf, currConf);
    const hasChanges = (ep.changes?.length ?? 0) > 0;
    return {
      ...ep,
      currentPrice: latest?.price ?? ep.price,
      currentDecision: latest?.decision ?? ep.decision,
      currentConfidence: latest?.confidence ?? ep.confidence,
      previousConfidence: prevConf,
      scoreTrend: trend,
      status: ep.watched ? "Watching" : hasChanges ? "Updated" : "Recorded",
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
    if (!latestWatched.has(ep.productLink)) latestWatched.set(ep.productLink, ep);
  }
  return [...latestWatched.values()];
}

export function recordLocalDecisionMemory(
  input: DecisionMemoryWriteInput
): DecisionMemoryEpisode | null {
  const link = input.productLink?.trim();
  if (!link || !input.decision) return null;

  const store = readStore();
  const previous = store.episodes
    .filter((ep) => ep.productLink === link)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];

  // Dedupe identical snapshot within 5 minutes
  if (previous) {
    const ageMs = Date.now() - new Date(previous.createdAt).getTime();
    if (
      ageMs < 5 * 60 * 1000 &&
      previous.decision === input.decision &&
      Math.round(previous.confidence ?? -1) === Math.round(input.confidence ?? -2) &&
      Math.round(previous.price ?? -1) === Math.round(input.price ?? -2)
    ) {
      return previous;
    }
  }

  const changes = detectDecisionChanges(previous, input);
  const episode: DecisionMemoryEpisode = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    searchQuery: input.searchQuery ?? null,
    productId: input.productId ?? null,
    productLink: link,
    productTitle: input.productTitle ?? null,
    merchant: input.merchant ?? null,
    image: input.image ?? null,
    decision: input.decision,
    confidence: input.confidence ?? null,
    price: input.price ?? null,
    score: input.score ?? null,
    reasons: Array.isArray(input.reasons) ? input.reasons.filter(Boolean).slice(0, 8) : [],
    availability: input.availability ?? null,
    watched: Boolean(input.watched) || Boolean(previous?.watched),
    changes,
    createdAt: new Date().toISOString(),
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
    if (ep.productLink !== link) return ep;
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
        row.productLink === ep.productLink &&
        row.id !== ep.id &&
        row.createdAt < ep.createdAt
    );
    items.push({
      id: ep.id,
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
  return listLocalDecisionMemory()
    .filter((ep) => ep.productLink === productLink && ep.confidence != null)
    .map((ep) => ({
      confidence: Math.round(ep.confidence!),
      createdAt: ep.createdAt,
      decision: ep.decision,
    }))
    .reverse();
}
