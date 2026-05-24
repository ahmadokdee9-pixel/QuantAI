/**
 * Phase 4 — Merchant offer graph linker (canonical product → offers).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";
import type { CanonicalProductNode, MerchantOfferLink } from "./types";
import { resolveProductIdentity } from "./productIdentityResolver";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function warehouseConfidence01(p: QuantProduct): number {
  const blob = `${p.store} ${p.title} ${p.availability ?? ""}`.toLowerCase();
  let c = 0.72;
  if (/\b(warehouse|fulfillment|ships from|sold by)\b/i.test(blob)) c -= 0.08;
  if (/\b(marketplace|third[-\s]?party|reseller)\b/i.test(blob)) c -= 0.18;
  if (getStoreTrustScore(p.store) >= 78) c += 0.12;
  return round4(Math.min(1, Math.max(0, c)));
}

function duplicateSellerRisk01(store: string, stores: string[]): number {
  const norm = store.trim().toLowerCase();
  const matches = stores.filter((s) => s.trim().toLowerCase() === norm).length;
  return matches > 1 ? round4(Math.min(1, (matches - 1) * 0.35)) : 0;
}

export function linkMerchantOffer(product: QuantProduct, allStores: string[]): MerchantOfferLink {
  const commerce = product.qiNormalizedCommerce;
  const resolved = resolveProductIdentity(product);
  return {
    listingKey: commerce?.listingKey ?? resolved.listingKey,
    link: product.link,
    store: product.store,
    price: product.price,
    oldPrice: product.oldPrice,
    trustScore: getStoreTrustScore(product.store),
    merchantConfidence01: product.qiMerchantConfidence01 ?? getStoreTrustScore(product.store) / 100,
    isRepresentative: commerce?.isRepresentative !== false,
    warehouseConfidence: warehouseConfidence01(product),
    duplicateSellerRisk: duplicateSellerRisk01(product.store, allStores),
  };
}

export function buildMerchantOfferGraph(
  products: QuantProduct[]
): Map<string, MerchantOfferLink[]> {
  const stores = products.map((p) => p.store);
  const byCommerce = new Map<string, MerchantOfferLink[]>();

  for (const p of products) {
    const resolved = p.qiNormalizedCommerce ?? resolveProductIdentity(p);
    const key = resolved.commerceId;
    const offer = linkMerchantOffer(p, stores);
    const list = byCommerce.get(key) ?? [];
    list.push(offer);
    byCommerce.set(key, list);
  }

  for (const [key, offers] of byCommerce) {
    offers.sort((a, b) => a.price - b.price);
    byCommerce.set(key, offers);
  }

  return byCommerce;
}

export function offersToCanonicalNodes(
  offerGraph: Map<string, MerchantOfferLink[]>,
  metaByCommerceId: Map<
    string,
    { variantKey: string; familyGraphId: string; normalizedTitle: string; confidence: number }
  >
): CanonicalProductNode[] {
  const nodes: CanonicalProductNode[] = [];
  for (const [commerceId, offers] of offerGraph) {
    const prices = offers.map((o) => o.price).filter((n) => n > 0);
    const sorted = [...prices].sort((a, b) => a - b);
    const m = metaByCommerceId.get(commerceId) ?? {
      variantKey: "",
      familyGraphId: "",
      normalizedTitle: "",
      confidence: 0.5,
    };
    nodes.push({
      canonicalProductId: `qcp4_${commerceId.replace(/^qcid_/, "")}`,
      commerceId,
      familyGraphId: m.familyGraphId,
      variantKey: m.variantKey,
      normalizedTitle: m.normalizedTitle,
      identityConfidence: m.confidence,
      offers,
      merchantCount: new Set(offers.map((o) => o.store.toLowerCase())).size,
      priceMin: sorted[0] ?? 0,
      priceMax: sorted[sorted.length - 1] ?? 0,
      priceMedian: sorted[Math.floor(sorted.length / 2)] ?? 0,
      mergeReasons: ["variant_key_match"],
    });
  }
  return nodes;
}
