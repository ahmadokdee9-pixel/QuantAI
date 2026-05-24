/**
 * Phase 6 — Shopping intent memory (repeated searches, trajectories).
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";

const MAX_INTENTS = 24;

export type ShoppingIntentRecord = {
  queryNorm: string;
  count: number;
  lastSeenAt: string;
  categoryHints: string[];
};

export type ShoppingIntentMemory = {
  records: ShoppingIntentRecord[];
  trajectoryId: string;
  repeatSearch01: number;
};

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 120);
}

export function updateShoppingIntentMemory(args: {
  query: string;
  sessionMemory: CommerceSessionMemoryV1;
  prior?: ShoppingIntentRecord[];
}): ShoppingIntentMemory {
  const norm = normalizeQuery(args.query);
  const records = [...(args.prior ?? [])];
  const existing = records.find((r) => r.queryNorm === norm);
  const now = new Date().toISOString();

  if (existing) {
    existing.count += 1;
    existing.lastSeenAt = now;
  } else {
    records.push({
      queryNorm: norm,
      count: 1,
      lastSeenAt: now,
      categoryHints: Object.keys(args.sessionMemory.categoryAffinity).slice(0, 4),
    });
  }

  records.sort((a, b) => b.count - a.count);
  const bounded = records.slice(0, MAX_INTENTS);
  const repeat = bounded.find((r) => r.queryNorm === norm);
  const repeatSearch01 = repeat && repeat.count > 1 ? Math.min(1, repeat.count / 5) : 0;

  const trajectoryId = bounded
    .slice(0, 3)
    .map((r) => r.queryNorm.slice(0, 16))
    .join(">");

  return {
    records: bounded,
    trajectoryId: trajectoryId || "single_shot",
    repeatSearch01: Math.round(repeatSearch01 * 10000) / 10000,
  };
}
