/**
 * P6.2 — Eight-objective balance unit tests.
 */
import { synthesizeUnifiedMultiObjectiveState } from "../../lib/multiObjective/multiObjectiveFusion.ts";

let failed = 0;
const balanced = synthesizeUnifiedMultiObjectiveState({
  quality: { qualityObjective: 0.5, qualityConfidence: 0.5 },
  price: { priceObjective: 0.48, priceSensitivity: "moderate" },
  trust: { trustObjective: 0.52, trustSensitivity: "moderate" },
  value: { valueObjective: 0.5, premiumObjective: 0.45 },
  intent: { intentObjective: 0.5, recommendationObjective: 0.5, comparisonObjective: 0.3, explorationObjective: 0.3 },
  aesthetic: { aestheticObjective: 0.45, tasteAlignment: 0.45 },
  stability: { stabilityObjective: 0.55, continuityStrength: 0.55 },
  conversion: { conversionObjective: 0.5, readinessObjective: 0.5 },
});

const imbalanced = synthesizeUnifiedMultiObjectiveState({
  quality: { qualityObjective: 0.9, qualityConfidence: 0.5 },
  price: { priceObjective: 0.1, priceSensitivity: "high" },
  trust: { trustObjective: 0.85, trustSensitivity: "high" },
  value: { valueObjective: 0.15, premiumObjective: 0.8 },
  intent: { intentObjective: 0.2, recommendationObjective: 0.2, comparisonObjective: 0.8, explorationObjective: 0.7 },
  aesthetic: { aestheticObjective: 0.1, tasteAlignment: 0.1 },
  stability: { stabilityObjective: 0.3, continuityStrength: 0.3 },
  conversion: { conversionObjective: 0.85, readinessObjective: 0.8 },
});

if (balanced.objectiveBalance <= imbalanced.objectiveBalance) {
  failed += 1;
  console.error("FAIL balanced state should score higher", { balanced: balanced.objectiveBalance, imbalanced: imbalanced.objectiveBalance });
} else {
  console.log(`OK balanced=${balanced.objectiveBalance} imbalanced=${imbalanced.objectiveBalance}`);
}

const objectives = [
  balanced.qualityObjective,
  balanced.priceObjective,
  balanced.trustObjective,
  balanced.valueObjective,
  balanced.intentObjective,
  balanced.aestheticObjective,
  balanced.stabilityObjective,
  balanced.conversionObjective,
];
if (objectives.length !== 8 || objectives.some((v) => v < 0 || v > 1)) {
  failed += 1;
  console.error("FAIL eight objectives not bounded");
} else {
  console.log("OK eight objectives bounded");
}

if (failed) process.exit(1);
console.log("\nMulti-objective balance tests passed");
