/**
 * P6.1 — Contradiction detection unit tests.
 */
import { buildCanonicalQuery } from "../../lib/search/canonicalQuery.ts";
import { detectIntentContradictions } from "../../lib/intent/intentContradictions.ts";
import { evaluateIntentComparison } from "../../lib/intent/intentComparison.ts";
import { evaluateIntentReadiness } from "../../lib/intent/intentReadiness.ts";
import { evaluateIntentTrust } from "../../lib/intent/intentTrust.ts";
import { evaluateIntentUnderstanding } from "../../lib/intent/intentUnderstanding.ts";
import { evaluateIntentValue } from "../../lib/intent/intentValue.ts";

let failed = 0;
const canonicalQuery = buildCanonicalQuery("premium budget laptop not sure vs compare");
const cognition = { contradictionCount: 0, rollbackTriggered: false };
const behavioral = { conversionReadiness: 0.6, decisionHesitation: 0.6, buyingFriction: 0.3 };
const strategy = {
  premiumPositioning: 0.5,
  strategicValue: 0.5,
  strategicTrust: 0.4,
  comparisonIntelligence: 0.5,
  recommendationHierarchy: 0.4,
  analytics: { comparisonIntelligenceAnalytics: 50, recommendationAnalytics: 50 },
};
const decision = { premiumDecision: 0.5, valueDecision: 0.5 };

const understanding = evaluateIntentUnderstanding({ query: canonicalQuery.originalQuery, canonicalQuery, cognition });
const value = evaluateIntentValue({ canonicalQuery, strategy, decision });
const comparison = evaluateIntentComparison({ canonicalQuery, strategy });
const readiness = evaluateIntentReadiness({ canonicalQuery, behavioral, cognition });
const trust = evaluateIntentTrust({ query: canonicalQuery.originalQuery, canonicalQuery, strategy, cognition });

const result = detectIntentContradictions({
  query: canonicalQuery.originalQuery,
  understanding,
  value,
  comparison,
  readiness,
  trust,
  cognition,
});

if (result.contradictionCount < 2) {
  failed += 1;
  console.error(`FAIL expected contradictions got=${result.contradictionCount}`, result.contradictions);
} else {
  console.log(`OK contradictions=${result.contradictionCount}`, result.contradictions.join(","));
}

if (failed) process.exit(1);
console.log("\nContradiction detection tests passed");
