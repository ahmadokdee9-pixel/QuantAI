/**
 * P6.6 — Commerce decision detection unit tests.
 */
import { detectCommerceDecisionSignals } from "../../lib/commerceDecision/commerceDecisionDetection.ts";

let failed = 0;
const stableProducts = [
  { id: 1, title: "A", store: "Amazon", price: 100, displayPrice: "$100", rating: 4.8, link: "a", image: "", reviewsCount: 200, shipping: null, availability: "In stock", oldPrice: null, priceTrend: "stable", extensions: [], qiComposite: 80 },
  { id: 2, title: "B", store: "Amazon", price: 95, displayPrice: "$95", rating: 4.7, link: "b", image: "", reviewsCount: 150, shipping: null, availability: "In stock", oldPrice: null, priceTrend: "stable", extensions: [], qiComposite: 78 },
];
const unstableProducts = [
  { id: 1, title: "X", store: "unknown", price: 5, displayPrice: "$5", rating: 0, link: "x", image: "", reviewsCount: 0, shipping: null, availability: "limited", oldPrice: 500, priceTrend: "down", extensions: [], qiComposite: 20 },
];

const memorylessStable = { learningConfidence: 0.55, learningDelta: 0.13, learningScore: 61, continuityReinforcement: 0.7, contradictionCount: 0, conversionInstabilityDetected: false, strategicOscillationDetected: false, routingLane: "continuity-safe", analytics: { topDriftCount: 0 } };
const memorylessUnstable = { learningConfidence: 0.28, learningDelta: 0.9, learningScore: 40, continuityReinforcement: 0.2, contradictionCount: 3, conversionInstabilityDetected: true, strategicOscillationDetected: true, routingLane: "drift-check", analytics: { topDriftCount: 2 } };
const marketStable = { fakeDiscountDetected: false, fakeDiscountScore: 0.05, trustDecayDetected: false, unreliableOfferDetected: false, verifiedPricingContinuity: 0.6, realityDelta: 0.06, realityScore: 55, routingLane: "pricing-safe", contradictionCount: 0 };
const marketUnstable = { fakeDiscountDetected: true, fakeDiscountScore: 0.8, trustDecayDetected: true, unreliableOfferDetected: true, verifiedPricingContinuity: 0.2, realityDelta: 0.8, realityScore: 30, routingLane: "discount-check", contradictionCount: 2 };
const strategic = { strategicRankingDelta: 0.2, strategicRankingScore: 64, strategicRankingConfidence: 0.6, trustValueBalance: 0.85, premiumAffordabilityBalance: 0.2, conversionStabilityBalance: 0.9, aestheticPracticalityBalance: 0.7, trustDominanceGuardActive: false, routingLane: "ranking-safe" };
const multiObjective = { multiObjectiveConfidence: 0.48, multiObjectiveDelta: 0.18, trustObjective: 0.4, conversionObjective: 0.65 };
const intentStable = { intentConfidence: 0.45, intentDelta: 0.1, trustIntent: 0.5 };
const intentUnstable = { intentConfidence: 0.25, intentDelta: 0.8, trustIntent: 0.15 };

const stable = detectCommerceDecisionSignals({ products: stableProducts, intent: intentStable, multiObjective, strategic, memoryless: memorylessStable, marketReality: marketStable });
const unstable = detectCommerceDecisionSignals({ products: unstableProducts, intent: intentUnstable, multiObjective, strategic, memoryless: memorylessUnstable, marketReality: marketUnstable });

if (unstable.decisionQualityScore >= stable.decisionQualityScore) {
  failed += 1;
  console.error("FAIL decision quality ordering");
} else {
  console.log(`OK quality stable=${stable.decisionQualityScore} unstable=${unstable.decisionQualityScore}`);
}

if (!unstable.unsafePromotionDominanceDetected || !unstable.lowConfidencePurchaseDecisionDetected) {
  failed += 1;
  console.error("FAIL unstable pattern detection");
} else {
  console.log("OK unstable patterns detected");
}

if (failed) process.exit(1);
console.log("\nCommerce decision detection tests passed");
