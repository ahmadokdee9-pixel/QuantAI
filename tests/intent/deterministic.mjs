/**
 * P6.1 — Deterministic output unit tests.
 */
import { runIntentEngine } from "../../lib/intent/intentEngine.ts";
import { buildCanonicalQuery } from "../../lib/search/canonicalQuery.ts";

let failed = 0;
const args = {
  query: "best trusted laptop compare",
  canonicalQuery: buildCanonicalQuery("best trusted laptop compare"),
  decision: { premiumDecision: 0.2, valueDecision: 0.4, decisionConfidence: 0.5 },
  strategy: {
    premiumPositioning: 0.2,
    strategicValue: 0.3,
    strategicTrust: 0.4,
    comparisonIntelligence: 0.5,
    recommendationHierarchy: 0.4,
    momentumConfidence: 0.3,
    routingLane: "compare",
    analytics: { comparisonIntelligenceAnalytics: 50, recommendationAnalytics: 50 },
  },
  behavioral: { conversionReadiness: 0.5, decisionHesitation: 0.3, buyingFriction: 0.3, rollbackTriggered: false },
  cognition: {
    conversionProbability: 0.5,
    trustValueBalance: 0.4,
    behavioralReadinessFusion: 0.4,
    cognitionConfidence: 0.5,
    cognitionScore: 50,
    contradictionCount: 0,
    rollbackTriggered: false,
    analytics: { rankingContinuityAnalytics: 70, replayIntegrityAnalytics: 80 },
    cognitionStability: 0.5,
  },
  governance: { anomalyDetected: false, blockedPolicies: [] },
  profile: {
    id: "bounded-intent",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresCognitionStable: false,
    maxDelta: 1,
    maxReadinessAmplification: 0.8,
    maxTrustAmplification: 0.8,
    maxAestheticAmplification: 0.8,
  },
};

const run1 = runIntentEngine(args);
const run2 = runIntentEngine(args);

if (run1.signals.signalHash !== run2.signals.signalHash) {
  failed += 1;
  console.error("FAIL signal hash mismatch");
} else {
  console.log(`OK signalHash=${run1.signals.signalHash.slice(0, 40)}...`);
}

if (run1.influence.intentDelta !== run2.influence.intentDelta) {
  failed += 1;
  console.error("FAIL intent delta mismatch");
} else {
  console.log(`OK intentDelta=${run1.influence.intentDelta}`);
}

if (failed) process.exit(1);
console.log("\nDeterministic output tests passed");
