/**
 * QuantAI market memory — client-persisted price snapshots for listings the user has seen.
 * Bounded storage; tray-local merge only (no server archive).
 */

import type { QuantProduct } from "@/lib/shoppingScore";

export const MARKET_MEMORY_STORAGE_KEY = "quantai-market-memory-v1";
const MAX_SNAPSHOTS = 650;
const MAX_PER_LINK = 32;
const DEDUPE_MS = 4 * 60 * 60 * 1000;
const DEDUPE_PRICE_REL = 0.006;

export type PriceSnapshot = {
  link: string;
  price: number;
  store: string;
  titleKey: string;
  queryNorm: string;
  ts: number;
};

export type MarketMemoryState = {
  version: 1;
  snapshots: PriceSnapshot[];
  updatedAt: number;
};

export function emptyMarketMemory(): MarketMemoryState {
  return { version: 1, snapshots: [], updatedAt: 0 };
}

export function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 56);
}

function normalizeQueryNorm(q: string): string {
  return q.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
}

function prune(state: MarketMemoryState): void {
  const byLink = new Map<string, PriceSnapshot[]>();
  for (const s of state.snapshots) {
    const g = byLink.get(s.link) ?? [];
    g.push(s);
    byLink.set(s.link, g);
  }
  const next: PriceSnapshot[] = [];
  for (const [, arr] of byLink) {
    arr.sort((a, b) => b.ts - a.ts);
    next.push(...arr.slice(0, MAX_PER_LINK));
  }
  next.sort((a, b) => b.ts - a.ts);
  state.snapshots = next.slice(0, MAX_SNAPSHOTS);
}

function nearSamePrice(a: number, b: number): boolean {
  if (a <= 0 || b <= 0) return a === b;
  return Math.abs(a - b) / Math.max(a, b) < DEDUPE_PRICE_REL;
}

export function loadMarketMemory(): MarketMemoryState {
  if (typeof window === "undefined") return emptyMarketMemory();
  try {
    const raw = localStorage.getItem(MARKET_MEMORY_STORAGE_KEY);
    if (!raw) return emptyMarketMemory();
    const o = JSON.parse(raw) as Partial<MarketMemoryState>;
    if (o.version !== 1 || !Array.isArray(o.snapshots)) return emptyMarketMemory();
    const snapshots = o.snapshots
      .filter(
        (x): x is PriceSnapshot =>
          x != null &&
          typeof x.link === "string" &&
          typeof x.price === "number" &&
          Number.isFinite(x.price) &&
          x.price > 0 &&
          x.price < 10_000_000 &&
          typeof x.ts === "number" &&
          typeof x.store === "string" &&
          typeof x.titleKey === "string"
      )
      .map((x) => ({
        link: x.link.slice(0, 512),
        price: Math.round(x.price * 100) / 100,
        store: x.store.slice(0, 64),
        titleKey: x.titleKey.slice(0, 80),
        queryNorm: typeof x.queryNorm === "string" ? x.queryNorm.slice(0, 80) : "",
        ts: Math.min(Date.now(), Math.max(0, x.ts)),
      }));
    const st: MarketMemoryState = { version: 1, snapshots, updatedAt: typeof o.updatedAt === "number" ? o.updatedAt : 0 };
    prune(st);
    return st;
  } catch {
    return emptyMarketMemory();
  }
}

export function saveMarketMemory(state: MarketMemoryState): void {
  if (typeof window === "undefined") return;
  try {
    state.updatedAt = Date.now();
    prune(state);
    localStorage.setItem(MARKET_MEMORY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

/** Append tray observations; dedupes noisy re-searches. */
export function recordTrayPriceSnapshots(products: QuantProduct[], searchQuery: string): void {
  if (typeof window === "undefined" || products.length === 0) return;
  const st = loadMarketMemory();
  const qn = normalizeQueryNorm(searchQuery);
  const now = Date.now();
  for (const p of products.slice(0, 56)) {
    if (p.price <= 0 || !p.link) continue;
    const titleKey = normalizeTitleKey(p.title);
    const last = st.snapshots.filter((s) => s.link === p.link).sort((a, b) => b.ts - a.ts)[0];
    if (
      last &&
      now - last.ts < DEDUPE_MS &&
      nearSamePrice(last.price, p.price) &&
      last.store.toLowerCase() === p.store.toLowerCase()
    ) {
      continue;
    }
    st.snapshots.push({
      link: p.link,
      price: p.price,
      store: p.store,
      titleKey,
      queryNorm: qn,
      ts: now,
    });
  }
  saveMarketMemory(st);
}

export function getSnapshotsForLink(memory: MarketMemoryState | null | undefined, link: string): PriceSnapshot[] {
  if (!memory?.snapshots.length) return [];
  return memory.snapshots.filter((s) => s.link === link).sort((a, b) => a.ts - b.ts);
}

export type HistoricalRange = {
  low: number;
  high: number;
  samples: number;
  oldestTs: number;
  newestTs: number;
};

export function computeHistoricalLowHigh(memory: MarketMemoryState | null | undefined, link: string): HistoricalRange | null {
  const snaps = getSnapshotsForLink(memory, link);
  if (snaps.length < 2) return null;
  const prices = snaps.map((s) => s.price);
  return {
    low: Math.min(...prices),
    high: Math.max(...prices),
    samples: snaps.length,
    oldestTs: snaps[0]!.ts,
    newestTs: snaps[snaps.length - 1]!.ts,
  };
}

export type RecurringCycleHint = {
  cycleLikely: boolean;
  notes: string;
};

/** Very light heuristic: alternating drops/rises + multiple distinct price levels. */
export function detectRecurringPriceCycles(memory: MarketMemoryState | null | undefined, link: string): RecurringCycleHint {
  const snaps = getSnapshotsForLink(memory, link);
  if (snaps.length < 6) {
    return { cycleLikely: false, notes: "Not enough remembered visits to infer a discount cadence yet." };
  }
  const prices = snaps.map((s) => s.price);
  const levels = new Set(prices.map((p) => Math.round(p)));
  let turns = 0;
  for (let i = 2; i < prices.length; i++) {
    const a = prices[i - 2]! - prices[i - 1]!;
    const b = prices[i - 1]! - prices[i]!;
    if (a * b < 0) turns++;
  }
  const cycleLikely = levels.size >= 3 && turns >= 2;
  return {
    cycleLikely,
    notes: cycleLikely
      ? "Price has oscillated across multiple levels in your saved history—promo cycles are plausible."
      : "History is still too flat or sparse to claim a repeating promo rhythm.",
  };
}

export function marketMemoryFingerprint(m: MarketMemoryState | null | undefined): string {
  if (!m) return "0";
  return `${m.updatedAt}|${m.snapshots.length}`;
}
