/**
 * P5.2 — Deterministic in-process memory store (query-context keys only; no user profiling).
 */

import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { QuantProduct } from "@/lib/shoppingScore";

export type IntentMemorySnapshot = {
  sessionKey: string;
  topLinks: string[];
  trustMemory: number;
  suppressionMemory: number;
  diversityMemory: number;
  driftMemory: number;
  orchestrationScore: number;
  runtimeScore: number;
  stabilizationHash: string;
  savedAt: string;
};

const store = new Map<string, IntentMemorySnapshot>();

/** Canonical session key from query context — never uses user identifiers. */
export function buildMemorySessionKey(args: { query: string; trayId?: string; category?: string }): string {
  const q = args.query.trim().toLowerCase().slice(0, 120);
  const cat = (args.category ?? "unknown").toLowerCase();
  const tray = args.trayId ?? "default";
  return `ctx:${cat}:${tray}:${q}`;
}

function stabilizationHash(links: string[]): string {
  return links.slice(0, 5).join("|");
}

export function getMemorySnapshot(sessionKey: string): IntentMemorySnapshot | null {
  return store.get(sessionKey) ?? null;
}

export function saveMemorySnapshot(snapshot: IntentMemorySnapshot): void {
  store.set(snapshot.sessionKey, snapshot);
}

export function clearIntentMemoryStore(): void {
  store.clear();
}

export function buildMemorySnapshot(args: {
  sessionKey: string;
  products: QuantProduct[];
  orchestration: IntentOrchestrationMeta;
  runtime: IntentRuntimeMeta;
}): IntentMemorySnapshot {
  const { sessionKey, products, orchestration, runtime } = args;
  const topLinks = products.slice(0, 5).map((p) => p.link || p.title);
  return {
    sessionKey,
    topLinks,
    trustMemory: orchestration.trustBalance,
    suppressionMemory: orchestration.suppressionBalance,
    diversityMemory: orchestration.diversityBalance,
    driftMemory: orchestration.analytics.topDriftCount,
    orchestrationScore: orchestration.orchestrationScore,
    runtimeScore: runtime.runtimeScore,
    stabilizationHash: stabilizationHash(topLinks),
    savedAt: new Date(0).toISOString(),
  };
}

/** Deterministic reconstruction ordering from snapshot continuity (no learning). */
export function reconstructRankingFromSnapshot(args: {
  products: QuantProduct[];
  snapshot: IntentMemorySnapshot;
  previous: IntentMemorySnapshot | null;
}): QuantProduct[] {
  const { products, snapshot, previous } = args;
  if (!previous || products.length <= 1) return products;

  const prevOrder = new Map(previous.topLinks.map((link, i) => [link, i]));
  const scored = products.map((p, index) => {
    const link = p.link || p.title;
    const prevIdx = prevOrder.get(link);
    let score = products.length - index;
    if (prevIdx != null && prevIdx === index) score += 0.8;
    if (snapshot.stabilizationHash === previous.stabilizationHash) score += 0.4;
    return { p, index, score: Math.round(score * 1000) / 1000 };
  });

  return scored
    .sort((a, b) => {
      const d = b.score - a.score;
      if (Math.abs(d) > 0.0001) return d;
      return a.index - b.index;
    })
    .map((x) => x.p);
}

export function computeReplayMemoryIntegrity(args: {
  snapshot: IntentMemorySnapshot;
  previous: IntentMemorySnapshot | null;
  reconstructedLinks: string[];
}): number {
  const { snapshot, previous, reconstructedLinks } = args;
  if (!previous) return 100;
  let matches = 0;
  for (let i = 0; i < Math.min(5, snapshot.topLinks.length, reconstructedLinks.length); i += 1) {
    if (snapshot.topLinks[i] === reconstructedLinks[i]) matches += 1;
  }
  const hashOk = snapshot.stabilizationHash === stabilizationHash(reconstructedLinks.slice(0, 5)) ? 10 : 0;
  return Math.min(100, Math.round((matches / 5) * 90 + hashOk));
}
