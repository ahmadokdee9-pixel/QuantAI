/**
 * P6.1 — Intent continuity unit tests.
 */
import { buildCanonicalQuery } from "../../lib/search/canonicalQuery.ts";
import { buildIntentSignalBundle } from "../../lib/intent/intentConfidence.ts";
import { computeIntentReplayIntegrity } from "../../lib/intent/intentRanking.ts";

let failed = 0;
const cognition = {
  analytics: { rankingContinuityAnalytics: 80, replayIntegrityAnalytics: 90 },
  cognitionStability: 0.5,
  cognitionConfidence: 0.4,
};

const signals = buildIntentSignalBundle({
  recommendationIntent: 0.5,
  comparisonIntent: 0.3,
  premiumIntent: 0.4,
  valueIntent: 0.4,
  trustIntent: 0.5,
  readinessIntent: 0.5,
  hesitationIntent: 0.2,
  emotionalIntent: 0.2,
  aestheticIntent: 0.3,
  explorationIntent: 0.3,
  hiddenBuyingIntent: 0.4,
  cognition,
});

if (signals.intentContinuity <= 0 || signals.intentContinuity > 1) {
  failed += 1;
  console.error("FAIL intent continuity bounds");
} else {
  console.log(`OK intent continuity=${signals.intentContinuity}`);
}

const replay = computeIntentReplayIntegrity({
  preLinks: ["a", "b", "c"],
  postLinks: ["a", "b", "c"],
  signals,
});
if (replay < 90) {
  failed += 1;
  console.error(`FAIL continuity replay=${replay}`);
} else {
  console.log(`OK continuity replay=${replay}`);
}

if (failed) process.exit(1);
console.log("\nIntent continuity tests passed");
