/**
 * P6.1 — Premium/value balance unit tests.
 */
import { buildCanonicalQuery } from "../../lib/search/canonicalQuery.ts";
import { evaluateIntentValue } from "../../lib/intent/intentValue.ts";

let failed = 0;
const premiumQuery = buildCanonicalQuery("premium luxury watch");
const valueQuery = buildCanonicalQuery("cheap budget laptop under 500");

const strategy = {
  premiumPositioning: 0.4,
  strategicValue: 0.3,
};
const decision = {
  premiumDecision: 0.3,
  valueDecision: 0.3,
};

const premium = evaluateIntentValue({ canonicalQuery: premiumQuery, strategy, decision });
const value = evaluateIntentValue({ canonicalQuery: valueQuery, strategy, decision });

if (premium.premiumIntent <= value.premiumIntent) {
  failed += 1;
  console.error("FAIL premium orientation", { premium: premium.premiumIntent, value: value.premiumIntent });
} else {
  console.log(`OK premium orientation premium=${premium.premiumIntent} value=${value.valueIntent}`);
}

if (value.valueIntent <= premium.valueIntent) {
  failed += 1;
  console.error("FAIL value orientation");
} else {
  console.log(`OK value orientation premium=${premium.premiumIntent} value=${value.valueIntent}`);
}

if (failed) process.exit(1);
console.log("\nPremium/value balance tests passed");
