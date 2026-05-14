/**
 * Session-scoped commerce memory (JSON blob; client may persist in sessionStorage
 * and send back on POST /api/search). Server merges deterministically each call.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { ShopperPersonaProfile, ShopperPersonaId } from "./shopperPersona";
import { isShopperPersonaId } from "./shopperPersona";

export type CommerceSessionMemoryV1 = {
  version: 1;
  preferredBrands: string[];
  styleTags: string[];
  categoryAffinity: Record<string, number>;
  /** Running mean of “typical tray focus price” from recent searches (0 if unknown). */
  priceComfortCenter: number;
  priceComfortSamples: number;
  emotionalToneTags: string[];
  aestheticsRecurring: string[];
  lastPersonas: ShopperPersonaId[];
  interactionCount: number;
};

export const EMPTY_COMMERCE_SESSION_MEMORY: CommerceSessionMemoryV1 = {
  version: 1,
  preferredBrands: [],
  styleTags: [],
  categoryAffinity: {},
  priceComfortCenter: 0,
  priceComfortSamples: 0,
  emotionalToneTags: [],
  aestheticsRecurring: [],
  lastPersonas: [],
  interactionCount: 0,
};

function uniqPush(arr: string[], v: string, max: number) {
  const t = v.trim();
  if (t.length < 2) return;
  if (!arr.includes(t)) arr.push(t);
  while (arr.length > max) arr.shift();
}

export function safeParseCommerceSessionMemory(raw: unknown): CommerceSessionMemoryV1 {
  if (!raw || typeof raw !== "object") return { ...EMPTY_COMMERCE_SESSION_MEMORY };
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return { ...EMPTY_COMMERCE_SESSION_MEMORY };
  const brands = Array.isArray(o.preferredBrands) ? o.preferredBrands.filter((x): x is string => typeof x === "string") : [];
  const styles = Array.isArray(o.styleTags) ? o.styleTags.filter((x): x is string => typeof x === "string") : [];
  const cat =
    typeof o.categoryAffinity === "object" && o.categoryAffinity !== null
      ? { ...(o.categoryAffinity as Record<string, number>) }
      : {};
  const tones = Array.isArray(o.emotionalToneTags)
    ? o.emotionalToneTags.filter((x): x is string => typeof x === "string")
    : [];
  const aes = Array.isArray(o.aestheticsRecurring)
    ? o.aestheticsRecurring.filter((x): x is string => typeof x === "string")
    : [];
  const lp = Array.isArray(o.lastPersonas)
    ? o.lastPersonas.filter((x): x is ShopperPersonaId => typeof x === "string" && isShopperPersonaId(x))
    : [];
  return {
    version: 1,
    preferredBrands: brands.slice(0, 24),
    styleTags: styles.slice(0, 24),
    categoryAffinity: cat,
    priceComfortCenter: typeof o.priceComfortCenter === "number" && Number.isFinite(o.priceComfortCenter) ? o.priceComfortCenter : 0,
    priceComfortSamples: typeof o.priceComfortSamples === "number" && o.priceComfortSamples >= 0 ? Math.min(500, o.priceComfortSamples) : 0,
    emotionalToneTags: tones.slice(0, 20),
    aestheticsRecurring: aes.slice(0, 20),
    lastPersonas: lp.slice(0, 6),
    interactionCount: typeof o.interactionCount === "number" ? Math.min(10_000, o.interactionCount) : 0,
  };
}

function brandsFromQuery(q: string): string[] {
  const out: string[] = [];
  const m = q.match(/\b(apple|samsung|sony|bose|dyson|google|pixel|lg|dell|hp|lenovo|asus|xiaomi|oneplus|nike|adidas)\b/gi);
  if (m) for (const x of m) out.push(x.toLowerCase());
  return [...new Set(out)].slice(0, 6);
}

export function mergeCommerceSessionMemory(
  prev: CommerceSessionMemoryV1,
  query: string,
  traySample: QuantProduct[],
  profile: ShopperPersonaProfile,
  tasteTagIds: string[]
): CommerceSessionMemoryV1 {
  const next: CommerceSessionMemoryV1 = {
    ...prev,
    preferredBrands: [...prev.preferredBrands],
    styleTags: [...prev.styleTags],
    categoryAffinity: { ...prev.categoryAffinity },
    emotionalToneTags: [...prev.emotionalToneTags],
    aestheticsRecurring: [...prev.aestheticsRecurring],
    lastPersonas: [...profile.dominant],
    interactionCount: prev.interactionCount + 1,
  };

  for (const b of brandsFromQuery(query)) uniqPush(next.preferredBrands, b, 24);
  for (const lab of profile.labels) uniqPush(next.styleTags, lab, 24);
  for (const id of tasteTagIds) uniqPush(next.aestheticsRecurring, id, 20);
  for (const id of profile.dominant) uniqPush(next.emotionalToneTags, id, 20);

  const prices = traySample.map((p) => p.price).filter((n) => n > 0);
  if (prices.length) {
    const med = [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)]!;
    const n = next.priceComfortSamples + 1;
    next.priceComfortCenter = (next.priceComfortCenter * next.priceComfortSamples + med) / n;
    next.priceComfortSamples = n;
  }

  for (const p of traySample.slice(0, 8)) {
    const slug = p.qiCategory ?? "general";
    next.categoryAffinity[slug] = (next.categoryAffinity[slug] ?? 0) + 1;
  }

  return next;
}
