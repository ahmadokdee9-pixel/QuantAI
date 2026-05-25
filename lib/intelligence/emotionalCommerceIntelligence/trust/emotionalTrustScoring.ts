/**
 * Phase 17 — Emotional trust scoring.
 */

import type { TrustEngineResult } from "@/lib/intelligence/trust/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function scoreEmotionalTrust(args: {
  trust?: TrustEngineResult | null;
  impulse01: number;
}): { score01: number; label: string } {
  const base = args.trust?.meta.avgTrustScore ?? 0.45;
  const adjusted = round4(Math.min(1, Math.max(0, base * 0.85 + (1 - args.impulse01) * 0.1)));
  const label = adjusted > 0.6 ? "emotionally_trusted" : adjusted > 0.35 ? "cautious_emotion" : "low_emotional_trust";
  return { score01: adjusted, label };
}
