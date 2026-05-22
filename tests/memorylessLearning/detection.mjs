/**
 * P6.4 — Memoryless detection unit tests.
 */
import { detectMemorylessLearningSignals } from "../../lib/memorylessLearning/memorylessLearningDetection.ts";

let failed = 0;
const stable = detectMemorylessLearningSignals({
  intent: { intentConfidence: 0.5, intentDelta: 0.1, trustIntent: 0.5, rollbackTriggered: false },
  multiObjective: {
    multiObjectiveConfidence: 0.48,
    multiObjectiveDelta: 0.18,
    trustObjective: 0.4,
    conversionObjective: 0.5,
    rollbackTriggered: false,
  },
  strategic: {
    strategicRankingConfidence: 0.6,
    strategicRankingDelta: 0.2,
    trustValueBalance: 0.85,
    premiumAffordabilityBalance: 0.7,
    conversionStabilityBalance: 0.9,
    aestheticPracticalityBalance: 0.75,
    trustDominanceGuardActive: false,
    inflationGuardActive: false,
    rollbackTriggered: false,
    analytics: { harmonyAnalytics: 70, topDriftCount: 0 },
  },
});

const unstable = detectMemorylessLearningSignals({
  intent: { intentConfidence: 0.25, intentDelta: 0.5, trustIntent: 0.2, rollbackTriggered: false },
  multiObjective: {
    multiObjectiveConfidence: 0.28,
    multiObjectiveDelta: 0.8,
    trustObjective: 0.15,
    conversionObjective: 0.7,
    rollbackTriggered: false,
  },
  strategic: {
    strategicRankingConfidence: 0.3,
    strategicRankingDelta: 0.9,
    trustValueBalance: 0.2,
    premiumAffordabilityBalance: 0.15,
    conversionStabilityBalance: 0.2,
    aestheticPracticalityBalance: 0.8,
    trustDominanceGuardActive: true,
    inflationGuardActive: true,
    rollbackTriggered: false,
    analytics: { harmonyAnalytics: 30, topDriftCount: 2 },
  },
});

if (unstable.signalFatigueScore <= stable.signalFatigueScore) {
  failed += 1;
  console.error("FAIL fatigue detection ordering", { stable: stable.signalFatigueScore, unstable: unstable.signalFatigueScore });
} else {
  console.log(`OK fatigue stable=${stable.signalFatigueScore} unstable=${unstable.signalFatigueScore}`);
}

if (!unstable.lowConfidencePatternDetected) {
  failed += 1;
  console.error("FAIL low confidence pattern detection");
} else {
  console.log("OK low confidence pattern detected");
}

if (stable.rankingDriftScore >= unstable.rankingDriftScore) {
  failed += 1;
  console.error("FAIL drift score ordering");
} else {
  console.log(`OK drift stable=${stable.rankingDriftScore} unstable=${unstable.rankingDriftScore}`);
}

if (failed) process.exit(1);
console.log("\nMemoryless detection tests passed");
