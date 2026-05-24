/**
 * Phase 4 — Lightweight in-memory price history (commerceId-keyed, tray-scoped).
 * No vector DB. Session-local shadow store for future persistence layer.
 */

import type { PriceSnapshot } from "../types";

const MAX_SNAPSHOTS_PER_KEY = 12;

/** Tray-local price history store (deterministic replay). */
export class PriceHistoryStore {
  private readonly snapshots = new Map<string, PriceSnapshot[]>();

  record(snapshot: PriceSnapshot): void {
    const key = `${snapshot.commerceId}::${snapshot.store.toLowerCase()}`;
    const list = this.snapshots.get(key) ?? [];
    list.push(snapshot);
    if (list.length > MAX_SNAPSHOTS_PER_KEY) list.shift();
    this.snapshots.set(key, list);
  }

  getHistory(commerceId: string, store?: string): PriceSnapshot[] {
    if (store) {
      return [...(this.snapshots.get(`${commerceId}::${store.toLowerCase()}`) ?? [])];
    }
    const out: PriceSnapshot[] = [];
    for (const [key, list] of this.snapshots) {
      if (key.startsWith(`${commerceId}::`)) out.push(...list);
    }
    return out.sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  }

  medianPrice(commerceId: string): number | null {
    const all = this.getHistory(commerceId);
    const prices = all.map((s) => s.price).filter((n) => n > 0).sort((a, b) => a - b);
    if (!prices.length) return null;
    return prices[Math.floor(prices.length / 2)] ?? null;
  }

  size(): number {
    return this.snapshots.size;
  }

  clear(): void {
    this.snapshots.clear();
  }
}

export const trayPriceHistoryStore = new PriceHistoryStore();
