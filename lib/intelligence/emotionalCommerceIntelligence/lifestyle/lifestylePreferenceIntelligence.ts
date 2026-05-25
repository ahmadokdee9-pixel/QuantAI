/**
 * Phase 17 — Lifestyle preference intelligence.
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function resolveLifestylePreference(args: {
  query: string;
  sessionMemory: CommerceSessionMemoryV1;
}): { lifestyleLabel: string; alignment01: number } {
  const q = args.query.toLowerCase();
  let lifestyleLabel = "general_lifestyle";
  if (/\b(home|family|parent|kids)\b/.test(q)) lifestyleLabel = "family_home";
  if (/\b(office|work|professional)\b/.test(q)) lifestyleLabel = "professional";
  if (/\b(travel|outdoor|active)\b/.test(q)) lifestyleLabel = "active_outdoor";
  if (/\b(gym|fitness|wellness)\b/.test(q)) lifestyleLabel = "wellness";
  const alignment01 = round4(
    Math.min(1, 0.3 + args.sessionMemory.styleTags.length / 12 + args.sessionMemory.emotionalToneTags.length / 10)
  );
  return { lifestyleLabel, alignment01 };
}
