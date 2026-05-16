/**
 * QuantAI market spread — tray/family fair band + overpriced detection.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";

const TRUST_OK = 66;

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export type FairMarketRange = {
  low: number;
  high: number;
  mid: number;
  spreadPct: number;
};

export function calculateMarketSpread(prices: number[]): { spreadPct: number; mid: number } {
  const p = prices.filter((x) => x > 0);
  if (!p.length) return { spreadPct: 0, mid: 0 };
  const mid = median(p);
  const minP = Math.min(...p);
  const maxP = Math.max(...p);
  const spreadPct = mid > 0 ? Math.round(((maxP - minP) / mid) * 100) : 0;
  return { spreadPct, mid };
}

export function estimateFairMarketValueRange(members: QuantProduct[]): FairMarketRange {
  const prices = members.map((m) => m.price).filter((x) => x > 0);
  if (!prices.length) return { low: 0, high: 0, mid: 0, spreadPct: 0 };
  const mid = median(prices);
  const { spreadPct } = calculateMarketSpread(prices);
  const pad = Math.max(6, Math.round(mid * 0.04));
  const low = Math.max(1, Math.round(Math.min(...prices) - pad * 0.5));
  const high = Math.round(Math.max(...prices) + pad);
  return { low, high, mid, spreadPct };
}

export function listingOverpricedVersusFair(product: QuantProduct, fairMid: number): boolean {
  if (fairMid <= 0 || product.price <= 0) return false;
  return product.price > fairMid * 1.14;
}

export type LowestTrustedPick = { link: string; store: string; price: number; trust: number };

export function pickLowestTrustedSeller(members: QuantProduct[]): LowestTrustedPick | null {
  let best: LowestTrustedPick | null = null;
  for (const p of members) {
    if (p.price <= 0) continue;
    const t = getStoreTrustScore(p.store);
    if (t < TRUST_OK) continue;
    if (!best || p.price < best.price || (p.price === best.price && t > best.trust)) {
      best = { link: p.link, store: p.store, price: p.price, trust: t };
    }
  }
  return best;
}

export function detectOverpricedListingLinks(members: QuantProduct[], fairMid: number): string[] {
  const out: string[] = [];
  for (const p of members) {
    if (listingOverpricedVersusFair(p, fairMid) && getStoreTrustScore(p.store) < 72) {
      out.push(p.link);
    }
  }
  return out;
}
