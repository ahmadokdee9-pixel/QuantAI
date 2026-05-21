/**
 * P4.1 — Intent apply parity (cap + suppression).
 */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { computeIntentIntelligence } from "../lib/intent/intentIntelligenceEngine.ts";
import { computeIntentApplyDelta, intentListingHardSuppressed } from "../lib/intent/intentApply.ts";

const MOCK = (title, store, price) => ({
  title,
  store,
  price,
  link: `https://x/${title.slice(0, 8)}`,
  extensions: [],
  rating: 4.2,
});

process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
process.env.TASTE_UNIFIED_APPLY_ENABLED = "false";

let failed = 0;
const cases = [
  {
    q: "authentic ysl libre trusted seller only",
    good: MOCK("YSL Libre EDP 90ml Authentic Sealed", "Douglas", 95),
    bad: MOCK("Inspired by Libre Clone Oil", "Temu Deals", 12),
  },
  {
    q: "cheap but good laptop under 500",
    good: MOCK("Lenovo IdeaPad Slim 3 Laptop", "Coolblue", 449),
    bad: MOCK("Laptop 90% Off Was 999 Hurry Buy", "Temu Deals", 89),
  },
];

for (const c of cases) {
  const canonical = buildCanonicalQuery(c.q);
  const intent = computeIntentIntelligence({ query: c.q, canonicalQuery: canonical });
  for (const p of [c.good, c.bad]) {
    const { delta, suppressed } = computeIntentApplyDelta({
      product: p,
      canonicalQuery: canonical,
      intent,
      medianPrice: 400,
    });
    const hard = intentListingHardSuppressed(p, intent, canonical);
    if (/inspired|hurry|temu/i.test(`${p.title} ${p.store}`) && delta >= 0) {
      failed += 1;
      console.error(`FAIL pollution not penalized: ${p.title.slice(0, 40)} delta=${delta}`);
    } else if (delta > 3 || delta < -3) {
      failed += 1;
      console.error(`FAIL cap exceeded: delta=${delta}`);
    } else {
      console.log(`OK ${c.q.slice(0, 28)} delta=${delta} suppressed=${suppressed || hard}`);
    }
  }
}

if (failed) process.exit(1);
console.log("\nIntent apply parity passed");
