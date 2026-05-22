/**
 * P6.5 — Market reality detection unit tests.
 */
import { detectMarketRealitySignals } from "../../lib/marketReality/marketRealityDetection.ts";

let failed = 0;
const stableProducts = [
  { id: 1, title: "Stable A", store: "Amazon", price: 100, displayPrice: "$100", rating: 4.8, link: "a", image: "", reviewsCount: 200, shipping: null, availability: "In stock", oldPrice: null, priceTrend: "stable", extensions: [], qiRealityTrust: { realityScore: 85, realityBand: "highly_realistic", fakeDiscountProbability: 0.05, discountManipulationRisk: 0.05, urgencyManipulationRisk: 0.05, emotionalTrapScore: 0.05, retailerReliability01: 0.9, marketplaceRisk01: 0.1, weakRetailer: false, listingSpecGap01: 0.05, imageTitleMismatchRisk: 0.05, stockVolatility01: 0.05, tooGoodToBeTrue01: 0.05 } },
];
const unstableProducts = [
  { id: 1, title: "Risky A", store: "unknown-shop", price: 10, displayPrice: "$10", rating: 0, link: "a", image: "", reviewsCount: 0, shipping: null, availability: "limited stock", oldPrice: 500, priceTrend: "down", extensions: [], outboundRouteKind: "google_fallback", qiMerchantConfidence01: 0.2, qiRealityTrust: { realityScore: 20, realityBand: "suspicious", fakeDiscountProbability: 0.9, discountManipulationRisk: 0.85, urgencyManipulationRisk: 0.7, emotionalTrapScore: 0.6, retailerReliability01: 0.15, marketplaceRisk01: 0.8, weakRetailer: true, listingSpecGap01: 0.7, imageTitleMismatchRisk: 0.6, stockVolatility01: 0.75, tooGoodToBeTrue01: 0.9 } },
];

const memoryless = { trustDegradationDetected: false, analytics: { trustAnalytics: 80 } };
const strategic = { inflationGuardActive: false, trustValueBalance: 0.8, rankingContinuity: 0.7, analytics: { harmonyAnalytics: 70 } };
const multiObjective = { trustObjective: 0.5 };
const intent = { trustIntent: 0.5 };

const stable = detectMarketRealitySignals({ products: stableProducts, intent, multiObjective, strategic, memoryless });
const unstable = detectMarketRealitySignals({ products: unstableProducts, intent, multiObjective, strategic, memoryless: { trustDegradationDetected: true, analytics: { trustAnalytics: 30 } } });

if (unstable.fakeDiscountScore <= stable.fakeDiscountScore) {
  failed += 1;
  console.error("FAIL fake discount ordering");
} else {
  console.log(`OK fakeDiscount stable=${stable.fakeDiscountScore} unstable=${unstable.fakeDiscountScore}`);
}

if (!unstable.fakeDiscountDetected || !unstable.unreliableOfferDetected) {
  failed += 1;
  console.error("FAIL unstable pattern detection");
} else {
  console.log("OK unstable patterns detected");
}

if (failed) process.exit(1);
console.log("\nMarket reality detection tests passed");
