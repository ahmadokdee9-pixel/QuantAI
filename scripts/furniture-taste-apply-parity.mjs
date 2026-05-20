/**
 * Phase 2.6 furniture shadow vs apply parity.
 * Usage: TASTE_FURNITURE_GRAMMAR_ENABLED=true npx --yes tsx scripts/furniture-taste-apply-parity.mjs
 */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { furnitureTasteShadowApplyParity } from "../lib/taste/furnitureTasteApply.ts";

const MOCK = (title) => ({
  title,
  store: "Store",
  price: 320,
  link: `https://x/${title.slice(0, 8)}`,
  extensions: [],
  rating: 4.3,
});

process.env.TASTE_FURNITURE_GRAMMAR_ENABLED = "true";

let failed = 0;
const cases = [
  {
    q: "minimal oak desk setup",
    good: MOCK("Oak Standing Desk Matte Cable Management Minimal"),
    bad: MOCK("RGB Gaming Chair Racer LED Gamer"),
  },
  {
    q: "executive ergonomic workspace",
    good: MOCK("Steelcase Gesture Ergonomic Office Chair Lumbar"),
    bad: MOCK("Racing Style Gamer Chair Ergonomic Look"),
  },
  {
    q: "clean studio desk minimal",
    good: MOCK("White Studio Desk Monochrome Cable Management"),
    bad: MOCK("LED Gamer Desk RGB Gaming Setup"),
  },
];

for (const c of cases) {
  const canonical = buildCanonicalQuery(c.q);
  for (const p of [c.good, c.bad]) {
    const r = furnitureTasteShadowApplyParity(c.q, p, canonical);
    if (!r.parityOk) {
      failed += 1;
      console.error(`FAIL ${c.q} / ${p.title.slice(0, 36)} — ${r.reason}`);
    } else {
      console.log(`OK ${c.q} apply=${r.applyDelta} shadow=${r.shadowDelta}`);
    }
  }
}

if (failed) process.exit(1);
console.log("\nFurniture taste apply parity passed");
