/**
 * Offline category routing reliability — Phase 1 category owners.
 * Usage: npx --yes tsx scripts/category-reliability-sanity.mjs
 */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";

const CASES = [
  ["yves saint laurent libre edp 90ml", "fragrance"],
  ["luxury ساعة under 300", "watch"],
  ["minimal desk setup", "desk_setup"],
  ["كرسي office minimal", "furniture"],
  ["جزمة مثل nike vomero بس ارخص", "shoes"],
  ["cheap but luxury looking sofa", "furniture"],
];

let failed = 0;
for (const [query, expected] of CASES) {
  const c = buildCanonicalQuery(query);
  const ok = c.category === expected;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${query} → expected ${expected}, got ${c.category}`);
  } else {
    console.log(`OK ${query} → ${c.category} (${c.marketMode})`);
  }
}

if (failed) {
  console.error(`\n${failed}/${CASES.length} failed`);
  process.exit(1);
}
console.log(`\n${CASES.length}/${CASES.length} category routing checks passed`);
