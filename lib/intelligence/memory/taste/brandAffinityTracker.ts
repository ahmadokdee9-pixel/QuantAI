/**
 * Phase 6 — Brand affinity tracker (deterministic, bounded).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";

const MAX_BRANDS = 16;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

const KNOWN_BRANDS =
  /\b(apple|samsung|sony|bose|dyson|google|nike|adidas|lg|dell|hp|lenovo|asus|xiaomi|oneplus|philips|bosch|ikea|hermes|rolex|gucci|prada)\b/gi;

export type BrandAffinityMap = Record<string, number>;

export function trackBrandAffinity(args: {
  query: string;
  products: QuantProduct[];
  sessionMemory: CommerceSessionMemoryV1;
}): BrandAffinityMap {
  const scores: BrandAffinityMap = {};

  const bump = (brand: string, w: number) => {
    const k = brand.toLowerCase();
    scores[k] = round4(Math.min(1, (scores[k] ?? 0) + w));
  };

  for (const b of args.sessionMemory.preferredBrands) bump(b, 0.35);
  const qm = args.query.match(KNOWN_BRANDS);
  if (qm) for (const b of qm) bump(b, 0.4);

  for (const p of args.products.slice(0, 12)) {
    const tm = p.title.match(KNOWN_BRANDS);
    if (tm) for (const b of tm) bump(b, 0.2);
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const bounded: BrandAffinityMap = {};
  for (const [k, v] of sorted.slice(0, MAX_BRANDS)) bounded[k] = v;
  return bounded;
}

export function topBrands(affinity: BrandAffinityMap, n = 5): string[] {
  return Object.entries(affinity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}
