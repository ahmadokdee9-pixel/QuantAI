/**
 * Phase 2.5 fragrance shadow vs apply parity.
 * Usage: TASTE_FRAGRANCE_GRAMMAR_ENABLED=true npx --yes tsx scripts/fragrance-taste-apply-parity.mjs
 */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { fragranceTasteShadowApplyParity } from "../lib/taste/fragranceTasteApply.ts";

const MOCK = (title) => ({
  title,
  store: "Store",
  price: 90,
  link: `https://x/${title.slice(0, 8)}`,
  extensions: [],
  rating: 4.3,
});

process.env.TASTE_FRAGRANCE_GRAMMAR_ENABLED = "true";

let failed = 0;
const cases = [
  { q: "yves saint laurent libre edp 90ml", good: MOCK("YSL Libre Eau de Parfum 90ml"), bad: MOCK("Inspired by Libre Type Scent Oil") },
  { q: "niche artisan perfume", good: MOCK("Le Labo Santal 33 EDP"), bad: MOCK("Inspired by Santal Clone") },
];

for (const c of cases) {
  const canonical = buildCanonicalQuery(c.q);
  for (const p of [c.good, c.bad]) {
    const r = fragranceTasteShadowApplyParity(c.q, p, canonical);
    if (!r.parityOk) {
      failed += 1;
      console.error(`FAIL ${c.q} / ${p.title.slice(0, 36)} — ${r.reason}`);
    } else {
      console.log(`OK ${c.q} apply=${r.applyDelta} shadow=${r.shadowDelta}`);
    }
  }
}

if (failed) process.exit(1);
console.log("\nFragrance taste apply parity passed");
