/**
 * P6.3 — Strategic balance pairs unit tests.
 */
import { computeStrategicBalancePairs } from "../../lib/strategicRanking/strategicRankingBalances.ts";

let failed = 0;
const balanced = computeStrategicBalancePairs({
  multiObjective: {
    trustObjective: 0.5,
    valueObjective: 0.48,
    priceObjective: 0.52,
    conversionObjective: 0.5,
    stabilityObjective: 0.51,
    qualityObjective: 0.45,
    aestheticObjective: 0.4,
  },
  intent: { premiumIntent: 0.5 },
});

const imbalanced = computeStrategicBalancePairs({
  multiObjective: {
    trustObjective: 0.9,
    valueObjective: 0.1,
    priceObjective: 0.1,
    conversionObjective: 0.9,
    stabilityObjective: 0.1,
    qualityObjective: 0.2,
    aestheticObjective: 0.85,
  },
  intent: { premiumIntent: 0.9 },
});

if (balanced.trustValueBalance <= imbalanced.trustValueBalance) {
  failed += 1;
  console.error("FAIL trust/value balance ordering");
} else {
  console.log(`OK balanced trustValue=${balanced.trustValueBalance} imbalanced=${imbalanced.trustValueBalance}`);
}

if (balanced.premiumAffordabilityBalance <= 0 || balanced.conversionStabilityBalance <= 0) {
  failed += 1;
  console.error("FAIL balance pairs not positive");
} else {
  console.log(`OK premiumAffordability=${balanced.premiumAffordabilityBalance} conversionStability=${balanced.conversionStabilityBalance}`);
}

if (failed) process.exit(1);
console.log("\nStrategic balance pair tests passed");
