/**
 * Persona + session memory → bounded composite shifts + fit narrative (post-cache safe).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";
import type { CommerceSessionMemoryV1 } from "./commerceSessionMemory";
import type { ShopperPersonaProfile } from "./shopperPersona";
import { aestheticCompatibility01 } from "./aestheticCompatibility";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function personaCompositeDelta(
  p: QuantProduct,
  profile: ShopperPersonaProfile,
  memory: CommerceSessionMemoryV1,
  aesthetic01: number
): number {
  let d = Math.round(aesthetic01 * 2.4);
  const dom = new Set(profile.dominant);
  const trust = getStoreTrustScore(p.store);
  const stars = ratingValue(p.rating);
  const blob = p.title.toLowerCase();

  if (dom.has("gamer") && p.qiCategory === "electronics" && /\b(gaming|rgb|rtx|hz|mechanical)\b/i.test(blob)) d += 1;
  if (dom.has("productivity_focused") && /\b(ultrabook|thinkpad|macbook|dock|monitor|keyboard)\b/i.test(blob)) {
    d += 1;
  }
  if (dom.has("deal_hunter") && p.oldPrice != null && p.oldPrice > p.price) d += 1;
  if (dom.has("value_sniper") && p.qiSignals && p.qiSignals.pricePerformance >= 72) d += 1;
  if (dom.has("premium_buyer") && trust >= 76 && stars >= 4.2) d += 1;
  if (dom.has("luxury_seeker") && trust >= 74 && /\b(luxury|premium|designer|limited)\b/i.test(blob)) d += 1;
  if (dom.has("family_oriented") && trust >= 70 && /\b(safe|kids|family|school)\b/i.test(blob)) d += 1;
  if (dom.has("creator_enthusiast") && /\b(camera|microphone|4k|oled|stream)\b/i.test(blob)) d += 1;

  for (const b of memory.preferredBrands) {
    if (b.length >= 2 && blob.includes(b)) d += 1;
  }

  if (dom.has("aesthetic_focused")) d += Math.round(aesthetic01 * 1.1);

  const arch = p.qiHumanIntentProfile?.likelyBuyerArchetypes ?? [];
  const hi = p.qiHumanIntentProfile;
  if (hi) {
    if (arch.includes("gamer") && dom.has("gamer") && p.qiCategory === "electronics") d += 1;
    if (arch.includes("student") && dom.has("value_sniper") && p.qiSignals && p.qiSignals.priceFit >= 68) d += 1;
    if (arch.includes("luxury shopper") && dom.has("luxury_seeker")) d += 1;
    if (hi.giftingLikelihood > 0.52 && dom.has("family_oriented") && /\b(gift|set|bundle)\b/i.test(blob)) d += 1;
  }

  if (dom.has("value_sniper") && trust < 52) d -= 2;
  if (dom.has("premium_buyer") && trust < 66) d -= 1;

  return clamp(d, -3, 5);
}

function buildPersonaFitLine(
  p: QuantProduct,
  profile: ShopperPersonaProfile,
  memory: CommerceSessionMemoryV1,
  aesthetic01: number
): string | null {
  if (profile.labels.length === 1 && profile.labels[0] === "neutral" && memory.interactionCount <= 1) {
    return null;
  }
  const bits: string[] = [];
  bits.push(`Persona lens: ${profile.labels.slice(0, 3).join(", ")}`);
  if (aesthetic01 >= 0.62) bits.push("aesthetic/memory alignment reads strong on title tokens");
  else if (aesthetic01 >= 0.45) bits.push("partial fit vs your rolling style tags and tray center price");
  if (memory.preferredBrands.some((b) => p.title.toLowerCase().includes(b))) {
    bits.push("matches a brand you recently anchored in-session");
  }
  return bits.join(" — ").slice(0, 320);
}

export function applyPersonaRanking(
  products: QuantProduct[],
  profile: ShopperPersonaProfile,
  memory: CommerceSessionMemoryV1
): QuantProduct[] {
  const out = products.map((p) => {
    const ae = aestheticCompatibility01(p, profile, memory);
    const delta = personaCompositeDelta(p, profile, memory, ae);
    const line = buildPersonaFitLine(p, profile, memory, ae);
    let reason = (p.qiReason ?? "").trim();
    if (line) reason = `${reason} ${line}`.trim().slice(0, 1600);
    return {
      ...p,
      qiComposite: clamp((p.qiComposite ?? 0) + delta, 0, 100),
      qiReason: reason,
    };
  });
  return [...out].sort((a, b) => (b.qiComposite ?? 0) - (a.qiComposite ?? 0));
}
