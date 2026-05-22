/**
 * P6.1 — Emotional query handling unit tests.
 */
import { buildCanonicalQuery } from "../../lib/search/canonicalQuery.ts";
import { evaluateIntentEmotion } from "../../lib/intent/intentEmotion.ts";

let failed = 0;
const emotional = evaluateIntentEmotion({
  query: "I love this amazing perfume must buy now",
  canonicalQuery: buildCanonicalQuery("amazing perfume must buy"),
});
const neutral = evaluateIntentEmotion({
  query: "laptop 16gb ram",
  canonicalQuery: buildCanonicalQuery("laptop 16gb ram"),
});

if (emotional.emotionalIntent <= neutral.emotionalIntent) {
  failed += 1;
  console.error("FAIL emotional detection");
} else {
  console.log(`OK emotional=${emotional.emotionalIntent} lane=${emotional.emotionLane}`);
}

const anxious = evaluateIntentEmotion({
  query: "worried about scam fake seller help",
  canonicalQuery: buildCanonicalQuery("trusted seller laptop"),
});
if (anxious.emotionLane !== "anxious") {
  failed += 1;
  console.error("FAIL anxious lane");
} else {
  console.log(`OK anxious lane emotional=${anxious.emotionalIntent}`);
}

if (failed) process.exit(1);
console.log("\nEmotional query tests passed");
