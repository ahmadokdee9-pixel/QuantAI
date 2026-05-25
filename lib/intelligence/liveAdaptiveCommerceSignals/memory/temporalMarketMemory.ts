/**
 * Phase 12 — Replay-safe temporal market memory (input-derived only).
 */

import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";
import type { LiveCommerceSignalsInput } from "../types";

export type TemporalMarketMemorySnapshot = {
  memoryKey: string;
  slotCount: number;
  horizonLabels: string[];
};

const MAX_SLOTS = 6;

export function buildTemporalMarketMemory(input: LiveCommerceSignalsInput): TemporalMarketMemorySnapshot {
  const q = input.query.toLowerCase().trim();
  const priceSig = input.products
    .slice(0, 8)
    .map((p) => `${p.store}:${Math.round(p.price)}`)
    .join("|");
  const memoryKey = `tmm_${fnv1aHex(`${q}~${priceSig}~${input.products.length}`)}`;

  const horizons: string[] = [];
  if (/\b(now|today|urgent)\b/.test(q)) horizons.push("immediate");
  if (/\b(this week|soon)\b/.test(q)) horizons.push("session");
  if (/\b(season|holiday|summer|winter)\b/.test(q)) horizons.push("seasonal");
  horizons.push("macro");

  return {
    memoryKey,
    slotCount: Math.min(MAX_SLOTS, horizons.length),
    horizonLabels: horizons.slice(0, MAX_SLOTS),
  };
}
