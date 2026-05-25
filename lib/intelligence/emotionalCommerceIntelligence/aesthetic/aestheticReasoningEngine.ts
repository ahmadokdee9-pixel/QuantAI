/**
 * Phase 17 — Aesthetic reasoning engine.
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function runAestheticReasoning(args: {
  query: string;
  sessionMemory: CommerceSessionMemoryV1;
  memory?: CommerceMemoryResult | null;
}): { aestheticScore01: number; cues: string[] } {
  const q = args.query.toLowerCase();
  const aesthetic = args.memory?.canonicalTaste.aestheticProfile;
  let score01 =
    ((aesthetic?.minimalist01 ?? 0.3) + (aesthetic?.luxury01 ?? 0.3) + (aesthetic?.professional01 ?? 0.25)) / 3;
  const cues: string[] = [];
  if (/\b(minimal|clean|scandi|simple)\b/.test(q)) {
    score01 += 0.15;
    cues.push("minimal_cue");
  }
  if (/\b(bold|maximal|statement|vibrant)\b/.test(q)) {
    score01 += 0.12;
    cues.push("maximal_cue");
  }
  if (args.sessionMemory.aestheticsRecurring.length > 0) cues.push("session_aesthetic_memory");
  return { aestheticScore01: round4(clamp01(score01)), cues };
}
