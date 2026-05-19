/** Quick P0 canonical checks — no network. Run: node --experimental-strip-types scripts/p0-canonical-sanity.mjs */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { isRelaxedIdentityLane } from "../lib/search/searchIntentModes.ts";

const cases = [
  ["nike shoes like vomero but cheaper", "shoes", "alternative", true],
  ["جزمة مثل nike vomero بس ارخص", "shoes", "alternative", true],
  ["كرسي office minimal", "furniture", null, true],
  ["كرسي مكتب مريح وفخم", "furniture", null, true],
  ["yves saint laurent libre edp 90ml", "fragrance", null, null],
  ["minimal desk setup", "desk_setup", null, true],
];

let failed = 0;
for (const [q, expectCat, expectPrimary, expectRelaxed] of cases) {
  const c = buildCanonicalQuery(q);
  const ok =
    c.category === expectCat &&
    (expectPrimary == null || c.intent.primary === expectPrimary) &&
    (expectRelaxed == null || isRelaxedIdentityLane(c) === expectRelaxed);
  if (!ok) {
    failed++;
    console.error("FAIL", q, {
      category: c.category,
      primary: c.intent.primary,
      mode: c.marketMode,
      model: c.model,
      relaxed: isRelaxedIdentityLane(c),
    });
  } else {
    console.log("OK", q.slice(0, 40), "→", c.category, c.intent.primary, c.marketMode, c.model);
  }
}
process.exit(failed ? 1 : 0);
