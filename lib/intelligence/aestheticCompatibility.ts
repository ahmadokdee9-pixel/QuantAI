/**
 * Cross-category aesthetic / emotional compatibility vs session memory + persona.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { CommerceSessionMemoryV1 } from "./commerceSessionMemory";
import type { ShopperPersonaProfile } from "./shopperPersona";

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

export function aestheticCompatibility01(
  p: QuantProduct,
  profile: ShopperPersonaProfile,
  memory: CommerceSessionMemoryV1
): number {
  const blob = `${p.title} ${p.extensions.join(" ")}`.toLowerCase();
  let acc = 0;
  let n = 0;

  for (const tag of memory.aestheticsRecurring) {
    const needle = tag.replace(/_/g, " ");
    if (needle.length >= 3 && blob.includes(needle)) {
      acc += 1;
      n++;
    }
  }
  for (const st of memory.styleTags) {
    if (st.length >= 3 && blob.includes(st)) {
      acc += 0.85;
      n++;
    }
  }

  for (const lab of profile.labels) {
    if (lab === "minimalist" && /\b(minimal|slim|thin|matte|white|silver|aluminum)\b/i.test(blob)) {
      acc += 1;
      n++;
    }
    if (lab === "luxury_seeker" && /\b(luxury|premium|leather|gold|titanium|designer)\b/i.test(blob)) {
      acc += 1;
      n++;
    }
    if (lab === "gamer" && /\b(gaming|rgb|mechanical|rtx|hz|esports)\b/i.test(blob)) {
      acc += 1;
      n++;
    }
    if (lab === "productivity_focused" && /\b(ultrabook|keyboard|dock|monitor|ergonomic|office)\b/i.test(blob)) {
      acc += 1;
      n++;
    }
    if (lab === "feminine_energy" && /\b(women|lady|rose|gold|eau|parfum|floral)\b/i.test(blob)) {
      acc += 0.9;
      n++;
    }
    if (lab === "family_oriented" && /\b(kids|family|safe|bpa|school|toddler)\b/i.test(blob)) {
      acc += 0.85;
      n++;
    }
  }

  if (memory.priceComfortCenter > 0 && p.price > 0) {
    const r = p.price / memory.priceComfortCenter;
    if (r >= 0.55 && r <= 1.45) {
      acc += 0.75;
      n++;
    }
  }

  if (n === 0) return 0.38;
  return clamp01(acc / n);
}
