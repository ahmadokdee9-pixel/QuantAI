/**
 * Phase 13 — Cross-session buying personality.
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { ShopperPersonaProfile } from "@/lib/intelligence/shopperPersona";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function resolveCrossSessionPersonality(args: {
  sessionMemory: CommerceSessionMemoryV1;
  shopperPersona?: ShopperPersonaProfile | null;
}): { personaId: string; stability01: number } {
  const primary =
    args.shopperPersona?.dominant[0] ?? args.sessionMemory.lastPersonas[0] ?? "balanced_shopper";
  const interactions = args.sessionMemory.interactionCount;
  const stability01 = round4(clamp01(0.35 + Math.min(0.55, interactions / 20)));
  return { personaId: primary, stability01 };
}
