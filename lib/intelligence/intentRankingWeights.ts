import type { CommerceSearchIntents } from "./searchIntentV2";
import type { CategoryWeightProfile, ProductCategorySlug } from "./types";

function normalizeWeights(w: CategoryWeightProfile): CategoryWeightProfile {
  const sum =
    w.price +
    w.rating +
    w.reviewDepth +
    w.retailerTrust +
    w.delivery +
    w.popularity +
    w.pricePerformance +
    w.discountQuality;
  if (sum <= 0) return w;
  const f = 1 / sum;
  return {
    price: w.price * f,
    rating: w.rating * f,
    reviewDepth: w.reviewDepth * f,
    retailerTrust: w.retailerTrust * f,
    delivery: w.delivery * f,
    popularity: w.popularity * f,
    pricePerformance: w.pricePerformance * f,
    discountQuality: w.discountQuality * f,
  };
}

/**
 * Phase-2: shift category weight vectors from universal commerce intents (tray-local, bounded).
 */
export function applyIntentAwareCategoryWeights(
  base: CategoryWeightProfile,
  intents: CommerceSearchIntents,
  slug: ProductCategorySlug
): CategoryWeightProfile {
  const d: CategoryWeightProfile = { ...base };

  if (intents.qualitySeeking && intents.budget) {
    d.retailerTrust += 0.038;
    d.pricePerformance += 0.032;
    d.rating += 0.018;
    d.discountQuality -= 0.048;
  }

  if (intents.fragranceBeauty && (slug === "beauty" || slug === "fashion" || slug === "general")) {
    d.rating += 0.022;
    d.reviewDepth += 0.018;
    d.retailerTrust += 0.02;
    d.popularity += 0.012;
    d.price -= 0.014;
  }

  if ((intents.feminineStyle || intents.masculineStyle) && (slug === "fashion" || slug === "beauty")) {
    d.retailerTrust += 0.016;
    d.rating += 0.014;
    d.popularity += 0.01;
  }

  if (intents.minimalistStyle && (slug === "home" || slug === "electronics" || slug === "general")) {
    d.rating += 0.014;
    d.retailerTrust += 0.012;
    d.popularity += 0.01;
  }

  if (intents.homeLifestyle && slug === "home") {
    d.pricePerformance += 0.018;
    d.retailerTrust += 0.016;
    d.rating += 0.012;
  }

  if (intents.wellnessFitness && (slug === "sports" || slug === "general")) {
    d.pricePerformance += 0.02;
    d.retailerTrust += 0.012;
    d.rating += 0.01;
  }

  if (intents.giftingEmotional || intents.giftUse) {
    d.popularity += 0.014;
    d.rating += 0.012;
    d.retailerTrust += 0.014;
  }

  if (intents.longTermValue) {
    d.retailerTrust += 0.02;
    d.rating += 0.016;
    d.reviewDepth += 0.012;
    d.discountQuality -= 0.018;
  }

  if (intents.gaming && slug === "electronics") {
    d.pricePerformance += 0.022;
    d.retailerTrust += 0.016;
    d.reviewDepth += 0.01;
    d.discountQuality -= 0.012;
  }

  if (intents.portableLight && slug === "electronics") {
    d.pricePerformance += 0.014;
    d.delivery += 0.01;
  }

  if (intents.alternativeSeeking) {
    d.pricePerformance += 0.024;
    d.price += 0.018;
    d.retailerTrust += 0.012;
  }

  if (intents.realDiscountOnly || intents.dealHunter) {
    d.discountQuality += 0.018;
    d.retailerTrust += 0.012;
    d.pricePerformance += 0.01;
  }

  if (intents.trustedOnly || intents.riskAvoidance) {
    d.retailerTrust += 0.028;
    d.discountQuality -= 0.012;
  }

  if (intents.quietLuxury || intents.luxury) {
    d.retailerTrust += 0.02;
    d.rating += 0.016;
    d.discountQuality -= 0.014;
  }

  if (intents.aestheticPremium && (slug === "electronics" || slug === "fashion" || slug === "home")) {
    d.rating += 0.012;
    d.popularity += 0.01;
  }

  return normalizeWeights(d);
}
