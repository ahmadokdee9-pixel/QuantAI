/**
 * Phase 3.2 unified shadow vs apply parity.
 */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { buildVerticalTasteShadowMeta } from "../lib/taste/verticalTasteShadow.ts";
import { computeUnifiedTasteApplyDelta } from "../lib/taste/unifiedTasteApply.ts";
import { computeUnifiedTasteSignals } from "../lib/taste/unifiedTasteIdentity.ts";

const MOCK = (title) => ({
  title,
  store: "Store",
  price: 420,
  link: `https://x/${title.slice(0, 8)}`,
  extensions: [],
  rating: 4.3,
});

process.env.TASTE_UNIFIED_APPLY_ENABLED = "true";
process.env.TASTE_GRAMMAR_ENABLED = "false";
process.env.TASTE_FRAGRANCE_GRAMMAR_ENABLED = "false";
process.env.TASTE_FURNITURE_GRAMMAR_ENABLED = "false";

let failed = 0;
const cases = [
  {
    q: "minimal oak desk setup",
    good: MOCK("Oak Standing Desk Matte Cable Management Minimal"),
    bad: MOCK("RGB Gaming Chair Racer LED Gamer"),
  },
  {
    q: "yves saint laurent libre edp 90ml",
    good: MOCK("YSL Libre Eau de Parfum 90ml"),
    bad: MOCK("Inspired by Libre Type Scent Oil"),
  },
];

for (const c of cases) {
  const canonical = buildCanonicalQuery(c.q);
  const shadow = buildVerticalTasteShadowMeta({ query: c.q, canonicalQuery: canonical, products: [c.good, c.bad] });
  const signals = computeUnifiedTasteSignals({ query: c.q, canonicalQuery: canonical, products: [c.good, c.bad], tasteGrammarShadow: shadow });
  for (const p of [c.good, c.bad]) {
    const apply = computeUnifiedTasteApplyDelta({ query: c.q, product: p, canonicalQuery: canonical, signals, tasteGrammarShadow: shadow });
    if (/gaming|inspired/i.test(p.title) && apply >= 0) {
      failed += 1;
      console.error(`FAIL pollution not penalized: ${p.title.slice(0, 40)} apply=${apply}`);
    } else if (apply > 4 || apply < -4) {
      failed += 1;
      console.error(`FAIL cap exceeded: apply=${apply}`);
    } else {
      console.log(`OK ${c.q.slice(0, 28)} apply=${apply} title=${p.title.slice(0, 32)}`);
    }
  }
}

if (failed) process.exit(1);
console.log("\nUnified taste apply parity passed");
