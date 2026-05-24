/**
 * Phase 7 — Latent intent resolver (upgrade, luxury, value, urgency, trust, aesthetic, comparison, impulse/analytical).
 */

import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { LatentIntentProfile } from "../types";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function resolveLatentIntent(args: {
  query: string;
  products: QuantProduct[];
  sessionMemory: CommerceSessionMemoryV1;
  memoryResult?: CommerceMemoryResult | null;
  trustResult?: TrustEngineResult | null;
}): LatentIntentProfile {
  const q = args.query.toLowerCase();
  const taste = args.memoryResult?.canonicalTaste;

  let upgradeIntent01 = 0.2;
  let luxuryIntent01 = taste?.premiumIntent.premiumPreference01 ?? 0.2;
  let valueSeekingIntent01 = taste?.pricingBehavior.dealSeeking01 ?? 0.25;
  let urgency01 = 0.15;
  let trustFirst01 = taste?.trustProfile.trustSensitivity01 ?? 0.35;
  let aestheticDriven01 = taste?.aestheticProfile.luxury01 ?? 0.2;
  let comparisonDriven01 = 0.25;
  let impulseShopping01 = 0.2;
  let analyticalShopping01 = 0.35;

  if (/\b(upgrade|newer|pro max|plus|next gen)\b/.test(q)) upgradeIntent01 += 0.5;
  if (/\b(luxury|premium|designer|boutique|hermes|rolex)\b/.test(q)) luxuryIntent01 += 0.55;
  if (/\b(cheap|budget|deal|discount|value|under)\b/.test(q)) valueSeekingIntent01 += 0.5;
  if (/\b(today|urgent|asap|now|fast shipping|same day)\b/.test(q)) urgency01 += 0.55;
  if (/\b(trusted|reliable|authentic|verified)\b/.test(q)) trustFirst01 += 0.35;
  if (/\b(compare|vs|versus|which is better)\b/.test(q)) comparisonDriven01 += 0.5;
  if (/\b(minimal|aesthetic|design|style)\b/.test(q)) aestheticDriven01 += 0.4;

  const traySpread = new Set(args.products.map((p) => p.qiCategory ?? "general")).size;
  if (traySpread >= 3) comparisonDriven01 += 0.25;
  if (args.sessionMemory.interactionCount <= 2) impulseShopping01 += 0.2;
  if (args.sessionMemory.interactionCount >= 5) analyticalShopping01 += 0.25;

  const trustPrep = args.trustResult ? Object.values(args.trustResult.rankingPrepByLink) : [];
  if (trustPrep.length) {
    const avgTrust = trustPrep.reduce((s, p) => s + p.trustScore, 0) / trustPrep.length / 100;
    trustFirst01 = round4(clamp01(trustFirst01 * 0.5 + avgTrust * 0.5));
  }

  if (args.memoryResult?.preferenceSignals.preferenceScore) {
    analyticalShopping01 += args.memoryResult.preferenceSignals.stability01 * 0.2;
  }

  return {
    upgradeIntent01: round4(clamp01(upgradeIntent01)),
    luxuryIntent01: round4(clamp01(luxuryIntent01)),
    valueSeekingIntent01: round4(clamp01(valueSeekingIntent01)),
    urgency01: round4(clamp01(urgency01)),
    trustFirst01: round4(clamp01(trustFirst01)),
    aestheticDriven01: round4(clamp01(aestheticDriven01)),
    comparisonDriven01: round4(clamp01(comparisonDriven01)),
    impulseShopping01: round4(clamp01(impulseShopping01)),
    analyticalShopping01: round4(clamp01(analyticalShopping01)),
  };
}
