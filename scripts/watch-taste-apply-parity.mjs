/**
 * Phase 2.4 — shadow vs apply parity for watches canary.
 * Usage: TASTE_GRAMMAR_ENABLED=true npx --yes tsx scripts/watch-taste-apply-parity.mjs
 */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { watchTasteShadowApplyParity } from "../lib/taste/watchTasteApply.ts";

const MOCK = (title) => ({
  title,
  store: "Store",
  price: 200,
  link: `https://x/${title.slice(0, 8)}`,
  extensions: [],
  rating: 4.3,
});

const CASES = [
  {
    query: "luxury watch under 3000",
    good: MOCK("Omega Seamaster Automatic Swiss Mechanical"),
    bad: MOCK("Samsung Galaxy Fit3 Fitness Tracker"),
  },
  {
    query: "premium mechanical swiss watch",
    good: MOCK("Hamilton Khaki Field Automatic"),
    bad: MOCK("Apple Watch Series 9 GPS"),
  },
];

process.env.TASTE_GRAMMAR_ENABLED = "true";

let failed = 0;
for (const c of CASES) {
  const canonical = buildCanonicalQuery(c.query);
  for (const p of [c.good, c.bad]) {
    const r = watchTasteShadowApplyParity(c.query, p, canonical);
    const ok = r.parityOk;
    if (!ok) {
      failed += 1;
      console.error(`FAIL ${c.query} / ${p.title.slice(0, 40)} — ${r.reason}`);
    } else {
      console.log(`OK ${c.query} apply=${r.applyDelta} shadow=${r.shadowDelta}`);
    }
  }
}

if (failed) process.exit(1);
console.log("\nWatch taste apply parity passed");
