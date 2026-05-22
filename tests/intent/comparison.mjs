/**
 * P6.1 — Comparison intent unit tests.
 */
import { buildCanonicalQuery } from "../../lib/search/canonicalQuery.ts";
import { evaluateIntentComparison } from "../../lib/intent/intentComparison.ts";

let failed = 0;
const compareQuery = buildCanonicalQuery("compare iphone vs samsung phones");
const recommendQuery = buildCanonicalQuery("best wireless headphones");

const strategy = {
  comparisonIntelligence: 0.5,
  recommendationHierarchy: 0.4,
  analytics: { comparisonIntelligenceAnalytics: 60, recommendationAnalytics: 50 },
};

const compare = evaluateIntentComparison({ canonicalQuery: compareQuery, strategy });
const recommend = evaluateIntentComparison({ canonicalQuery: recommendQuery, strategy });

if (compare.comparisonIntent <= recommend.comparisonIntent) {
  failed += 1;
  console.error("FAIL comparison intent classification");
} else {
  console.log(`OK compare intent=${compare.comparisonIntent} mode=${compare.intentMode}`);
}

if (recommend.recommendationIntent <= compare.recommendationIntent) {
  failed += 1;
  console.error("FAIL recommendation intent classification");
} else {
  console.log(`OK recommend intent=${recommend.recommendationIntent} mode=${recommend.intentMode}`);
}

if (failed) process.exit(1);
console.log("\nComparison intent tests passed");
