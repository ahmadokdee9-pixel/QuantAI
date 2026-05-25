/**
 * Phase 17 — Style personality mapping.
 */

import type { ShopperPersonaProfile } from "@/lib/intelligence/shopperPersona";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function mapStylePersonality(args: {
  query: string;
  sessionMemory: CommerceSessionMemoryV1;
  shopperPersona?: ShopperPersonaProfile | null;
}): { personality: string; confidence01: number } {
  const q = args.query.toLowerCase();
  const persona = args.shopperPersona?.dominant[0] ?? args.sessionMemory.lastPersonas[0] ?? "balanced_shopper";
  let personality: string = persona;
  if (/\b(luxury|designer|status)\b/.test(q)) personality = "status_seeker";
  if (/\b(cozy|comfort|soft)\b/.test(q)) personality = "comfort_seeker";
  if (/\b(deal|budget|value)\b/.test(q)) personality = "value_optimizer";
  const confidence01 = round4(
    Math.min(1, 0.4 + args.sessionMemory.interactionCount / 30 + (args.shopperPersona?.dominant.length ?? 0) * 0.05)
  );
  return { personality, confidence01 };
}
