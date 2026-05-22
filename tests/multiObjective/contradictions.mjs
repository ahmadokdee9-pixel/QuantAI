/**
 * P6.2 — Cross-objective contradiction detection unit tests.
 */
import { buildCanonicalQuery } from "../../lib/search/canonicalQuery.ts";
import { detectMultiObjectiveContradictions } from "../../lib/multiObjective/multiObjectiveContradictions.ts";
import { synthesizeUnifiedMultiObjectiveState } from "../../lib/multiObjective/multiObjectiveFusion.ts";
import { evaluateValueObjective } from "../../lib/multiObjective/multiObjectiveValue.ts";

let failed = 0;
const decision = { premiumDecision: 0.6, valueDecision: 0.5, trustDecision: 0.4, analytics: { trustValueAnalytics: 50 } };
const strategy = { strategicValue: 0.5, premiumPositioning: 0.6, strategicTrust: 0.4 };
const intent = { hesitationIntent: 0.6, contradictionCount: 2, rollbackTriggered: false, analytics: {} };
const cognition = { rollbackTriggered: false };

const value = evaluateValueObjective({ decision, strategy, intent });
const state = synthesizeUnifiedMultiObjectiveState({
  quality: { qualityObjective: 0.25, qualityConfidence: 0.4 },
  price: { priceObjective: 0.65, priceSensitivity: "high" },
  trust: { trustObjective: 0.55, trustSensitivity: "moderate" },
  value,
  intent: { intentObjective: 0.5, recommendationObjective: 0.4, comparisonObjective: 0.3, explorationObjective: 0.3 },
  aesthetic: { aestheticObjective: 0.3, tasteAlignment: 0.3 },
  stability: { stabilityObjective: 0.4, continuityStrength: 0.4 },
  conversion: { conversionObjective: 0.6, readinessObjective: 0.55 },
});

const result = detectMultiObjectiveContradictions({ state, value, intent, cognition });

if (result.contradictionCount < 2) {
  failed += 1;
  console.error(`FAIL expected contradictions got=${result.contradictionCount}`, result.contradictions);
} else {
  console.log(`OK contradictions=${result.contradictionCount}`, result.contradictions.join(","));
}

if (failed) process.exit(1);
console.log("\nMulti-objective contradiction tests passed");
