/**
 * Phase 5 — Suspicious seller / duplicate identity detection.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";
import type { MerchantConsistencySnapshot } from "./merchantConsistencyTracker";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export type SuspiciousSellerVerdict = {
  storeKey: string;
  suspicious: boolean;
  duplicateIdentityRisk01: number;
  fakeInventoryRisk01: number;
  reasons: string[];
};

export function detectSuspiciousSellers(
  products: QuantProduct[],
  consistency: MerchantConsistencySnapshot[]
): SuspiciousSellerVerdict[] {
  const byStore = new Map<string, QuantProduct[]>();
  for (const p of products) {
    const k = p.store.trim().toLowerCase();
    const list = byStore.get(k) ?? [];
    list.push(p);
    byStore.set(k, list);
  }

  const storeCounts = new Map<string, number>();
  for (const p of products) {
    const k = p.store.trim().toLowerCase();
    storeCounts.set(k, (storeCounts.get(k) ?? 0) + 1);
  }

  const verdicts: SuspiciousSellerVerdict[] = [];
  for (const snap of consistency) {
    const listings = byStore.get(snap.storeKey) ?? [];
    const reasons: string[] = [];
    let fakeInventoryRisk01 = 0;
    let duplicateIdentityRisk01 = 0;

    const dupCount = storeCounts.get(snap.storeKey) ?? 0;
    if (dupCount > 3) {
      duplicateIdentityRisk01 = clamp01((dupCount - 2) * 0.15);
      reasons.push("duplicate_merchant_listings");
    }

    const lowTrust = listings.filter((p) => getStoreTrustScore(p.store) < 58).length;
    if (lowTrust > 0 && listings.length >= 2) {
      fakeInventoryRisk01 = clamp01(lowTrust / listings.length);
      reasons.push("low_trust_repeated_listings");
    }

    const availNoise = listings.filter((p) =>
      /limited|only \d|hurry|flash|clearance/i.test(`${p.availability ?? ""} ${p.title}`)
    ).length;
    if (availNoise >= 2) {
      fakeInventoryRisk01 = Math.max(fakeInventoryRisk01, 0.45);
      reasons.push("urgency_inventory_pattern");
    }

    if (snap.priceSpreadRatio > 0.4) reasons.push("erratic_pricing_same_seller");
    if (snap.titleQuality01 < 0.55) reasons.push("poor_catalog_quality");

    const suspicious =
      duplicateIdentityRisk01 >= 0.35 ||
      fakeInventoryRisk01 >= 0.45 ||
      snap.consistencyScore < 0.5 ||
      reasons.length >= 2;

    verdicts.push({
      storeKey: snap.storeKey,
      suspicious,
      duplicateIdentityRisk01,
      fakeInventoryRisk01,
      reasons,
    });
  }
  return verdicts;
}
