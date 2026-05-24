/**
 * Phase 5 — Canonical offer intelligence (trusted vs suspicious offers).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { CanonicalProductNode } from "@/lib/intelligence/identity/types";
import type {
  CanonicalOfferIntelligence,
  MerchantTrustProfile,
  PriceTruthProfile,
} from "../types";
import { buildTrustExplainability } from "../explain/trustExplainability";
import { buildTrustRankingPrepSignals } from "../ranking/trustRankingSignals";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

const TRUSTED_THRESHOLD = 62;
const SUSPICIOUS_THRESHOLD = 42;

export function buildCanonicalOfferIntelligence(args: {
  node: CanonicalProductNode;
  products: QuantProduct[];
  merchantProfiles: Record<string, MerchantTrustProfile>;
  priceTruthByCommerceId: Record<string, PriceTruthProfile>;
}): CanonicalOfferIntelligence {
  const { node, products, merchantProfiles, priceTruthByCommerceId } = args;
  const priceTruth = priceTruthByCommerceId[node.commerceId];
  const trustedOffers: string[] = [];
  const suspiciousOffers: string[] = [];

  let merchantConfSum = 0;
  let offerCount = 0;

  for (const offer of node.offers) {
    const product = products.find((p) => p.link === offer.link);
    const storeKey = offer.store.trim().toLowerCase();
    const merchant = merchantProfiles[storeKey];
    const prep = buildTrustRankingPrepSignals({
      offer,
      merchant,
      priceTruth,
      product,
    });
    const trusted =
      prep.trustScore >= TRUSTED_THRESHOLD &&
      prep.fakeDiscountRisk < 0.45 &&
      !merchant?.alert;
    const suspicious =
      prep.trustScore < SUSPICIOUS_THRESHOLD ||
      prep.fakeDiscountRisk >= 0.55 ||
      merchant?.alert === true;

    if (trusted) trustedOffers.push(offer.link);
    if (suspicious) suspiciousOffers.push(offer.link);

    merchantConfSum += prep.merchantReliabilityScore;
    offerCount += 1;
  }

  const sampleOffer = node.offers[0];
  const sampleProduct = products.find((p) => p.link === sampleOffer?.link);
  const sampleMerchant = sampleOffer
    ? merchantProfiles[sampleOffer.store.trim().toLowerCase()]
    : undefined;

  const explain = buildTrustExplainability({
    offer: sampleOffer ?? {
      listingKey: "",
      link: "",
      store: "",
      price: 0,
      oldPrice: null,
      trustScore: 50,
      merchantConfidence01: 0.5,
      isRepresentative: true,
      warehouseConfidence: 0.5,
      duplicateSellerRisk: 0,
    },
    merchant: sampleMerchant,
    priceTruth,
    trusted: trustedOffers.length >= suspiciousOffers.length,
  });

  return {
    canonicalProductId: node.canonicalProductId,
    commerceId: node.commerceId,
    trustedOffers,
    suspiciousOffers,
    pricingConfidence01: round4(priceTruth?.historicalConfidence01 ?? 0.2),
    merchantConfidence01: round4(
      offerCount ? merchantConfSum / offerCount / 100 : 0.5
    ),
    historicalPriceConfidence01: round4(priceTruth?.historicalConfidence01 ?? 0.15),
    explain,
    rankingPrep: buildTrustRankingPrepSignals({
      offer: sampleOffer ?? node.offers[0]!,
      merchant: sampleMerchant,
      priceTruth,
      product: sampleProduct,
    }),
  };
}

export function buildAllOfferIntelligence(
  canonicalProducts: CanonicalProductNode[],
  products: QuantProduct[],
  merchantProfiles: Record<string, MerchantTrustProfile>,
  priceTruthByCommerceId: Record<string, PriceTruthProfile>
): CanonicalOfferIntelligence[] {
  return canonicalProducts.map((node) =>
    buildCanonicalOfferIntelligence({
      node,
      products,
      merchantProfiles,
      priceTruthByCommerceId,
    })
  );
}
