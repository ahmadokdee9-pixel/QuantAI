/**
 * Offline luxury-watch intent + routing sanity.
 * Usage: npx --yes tsx scripts/luxury-watch-canonical-sanity.mjs
 */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { hasLuxuryWatchIntent, luxuryWatchIntent01 } from "../lib/search/luxuryWatchIntent.ts";

const LUXURY_QUERIES = [
  "luxury watch under 3000",
  "elegant swiss watch",
  "luxury men's watch",
  "rolex alternative watch",
  "omega vs tag heuer watch",
  "premium mechanical watch",
  "luxury ساعة under 300",
  "ساعة شكلها luxury بس سعرها معقول",
];

let failed = 0;
for (const query of LUXURY_QUERIES) {
  const c = buildCanonicalQuery(query);
  const intent = luxuryWatchIntent01(c.semantic.envelope);
  const ok = c.category === "watch" && hasLuxuryWatchIntent(c.semantic.envelope);
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${query} → cat=${c.category} luxury01=${intent.toFixed(2)}`);
  } else {
    console.log(`OK ${query} → watch luxury01=${intent.toFixed(2)} mode=${c.marketMode}`);
  }
}

if (failed) process.exit(1);
console.log(`\n${LUXURY_QUERIES.length}/${LUXURY_QUERIES.length} luxury watch routing checks passed`);
