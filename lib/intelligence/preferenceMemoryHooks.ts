/**
 * Phase 34 — Future Preference Memory Hooks.
 * Interfaces only — no persistence implemented yet.
 */

import type { BuyerIdentityProfile } from "@/lib/intelligence/buyerIdentityEngine";
import type { TastePreferenceProfile } from "@/lib/intelligence/tasteMatchEngine";

export type PreferenceMemorySnapshot = {
  version: 0;
  favoriteBrands: string[];
  budgetRange: { min: number; max: number } | null;
  stylePreferences: string[];
  buyingBehavior: ("deal_seeker" | "premium_buyer" | "research_heavy" | "impulse_ready")[];
};

export type PreferenceMemoryHook = {
  /** Future: load persisted user preferences. Returns null when no memory exists. */
  loadMemory: (userId?: string) => PreferenceMemorySnapshot | null;
  /** Future: merge session query signals with stored preferences. */
  mergeWithQuery: (
    memory: PreferenceMemorySnapshot | null,
    buyer: BuyerIdentityProfile,
    taste: TastePreferenceProfile
  ) => { buyer: BuyerIdentityProfile; taste: TastePreferenceProfile };
  /** Future: capture post-search preference signals for learning. */
  captureSessionSignals: (args: {
    query: string;
    clickedLinks: string[];
    savedLinks: string[];
  }) => void;
};

const EMPTY_MEMORY: PreferenceMemorySnapshot = {
  version: 0,
  favoriteBrands: [],
  budgetRange: null,
  stylePreferences: [],
  buyingBehavior: [],
};

/** Stub hook — architecture-ready, no-op until memory ships. */
export const preferenceMemoryHook: PreferenceMemoryHook = {
  loadMemory: () => null,
  mergeWithQuery: (_memory, buyer, taste) => ({ buyer, taste }),
  captureSessionSignals: () => {},
};

export function createPreferenceMemoryHook(
  overrides?: Partial<PreferenceMemoryHook>
): PreferenceMemoryHook {
  return { ...preferenceMemoryHook, ...overrides };
}

export { EMPTY_MEMORY };
