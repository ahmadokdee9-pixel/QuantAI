/**
 * Phase 2.2 taste pollution gate — offline golden trays (shadow classifiers).
 * Usage: npx --yes tsx scripts/taste-pollution.mjs
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { buildVerticalTasteShadowMeta } from "../lib/taste/verticalTasteShadow.ts";
import { isTasteGrammarApplyEnabled } from "../lib/taste/verticalTasteFlags.ts";

const POLLUTION_RX = {
  watch_fitness: /\b(galaxy\s+fit|fitbit|mi\s+band|fitness\s+tracker)\b/i,
  electronics_party: /\b(rgb gaming|bass boost party|party led)\b/i,
  furniture_gamer: /\b(gaming chair|racer|rgb led gamer)\b/i,
  fragrance_dupe: /\b(inspired by|type scent|dupe)\b/i,
};

const GOLDEN = [
  { query: "luxury swiss watch", vertical: "watch", pollutionKey: "watch_fitness", badTitle: "Samsung Galaxy Fit3 Fitness Tracker" },
  { query: "best premium headphones for focus", vertical: "audio", pollutionKey: "electronics_party", badTitle: "RGB Gaming Headset Bass Boost Party" },
  { query: "كرسي office minimal", vertical: "furniture", pollutionKey: "furniture_gamer", badTitle: "RGB Gaming Chair Racer LED" },
  { query: "yves saint laurent libre edp 90ml", vertical: "fragrance", pollutionKey: "fragrance_dupe", badTitle: "Inspired by Libre Type Scent Oil" },
];

let falseAestheticPromoted = 0;
let tastePollutionTop5 = 0;
const rows = [];

for (const g of GOLDEN) {
  const canonicalQuery = buildCanonicalQuery(g.query);
  const goodTitles = {
    watch: "Tissot Gentleman Automatic Swiss Dress Watch",
    audio: "Sony WH-1000XM5 Noise Cancelling Headphones",
    furniture: "Herman Miller Aeron Ergonomic Office Chair",
    fragrance: "Yves Saint Laurent Libre Eau de Parfum 90ml",
  };
  const good = { title: goodTitles[g.vertical] ?? "Premium product", store: "Store", price: 50, link: "https://x/a" };
  const bad = { title: g.badTitle, store: "Store", price: 20, link: "https://x/b" };
  const shadow = buildVerticalTasteShadowMeta({
    query: g.query,
    canonicalQuery,
    products: [good, bad],
  });

  const badRow = shadow.rows.find((r) => POLLUTION_RX[g.pollutionKey].test(r.title));
  const flagged = badRow && (badRow.tasteViolations.length > 0 || badRow.tasteFit01 < 0.4);

  if (!flagged && shadow.active) tastePollutionTop5 += 1;

  const goodRow = shadow.rows[0];
  if (goodRow && goodRow.tasteFit01 > 0.72 && badRow && badRow.tasteFit01 > goodRow.tasteFit01) {
    falseAestheticPromoted += 1;
  }

  rows.push({ query: g.query, vertical: g.vertical, flagged, shadow: { lane: shadow.grammarLane, violations: shadow.violations } });
  console.log(`${flagged ? "OK" : "FAIL"} ${g.query} → flagged=${flagged}`);
}

const trustCapRespectedPct = isTasteGrammarApplyEnabled() ? 0 : 100;

const report = {
  suite: "taste-pollution",
  at: new Date().toISOString(),
  false_aesthetic_promoted: falseAestheticPromoted,
  trust_cap_respected_pct: trustCapRespectedPct,
  taste_pollution_top5: tastePollutionTop5,
  rows,
};

const historyDir = resolve(import.meta.dirname, "../.validation/history");
if (!existsSync(historyDir)) mkdirSync(historyDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outPath = join(historyDir, `${stamp}__taste-pollution__.json`);
writeFileSync(outPath, JSON.stringify(report, null, 2));

let baselineP95 = null;
if (existsSync(historyDir)) {
  const rw = readdirSync(historyDir)
    .filter((f) => f.includes("__realworld__") && f.endsWith(".json"))
    .sort();
  if (rw.length) {
    const prev = JSON.parse(readFileSync(join(historyDir, rw[rw.length - 2] || rw[rw.length - 1]), "utf8"));
    const latencies = (prev.queries ?? [])
      .filter((q) => !q.infrastructureFailure && typeof q.latencyMs === "number")
      .map((q) => q.latencyMs);
    if (latencies.length) {
      baselineP95 = [...latencies].sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];
    }
  }
}

const failed =
  falseAestheticPromoted > 0 || trustCapRespectedPct < 100 || tastePollutionTop5 > 0;

console.log(`\nfalse_aesthetic_promoted=${falseAestheticPromoted}`);
console.log(`trust_cap_respected_pct=${trustCapRespectedPct}`);
console.log(`taste_pollution_top5=${tastePollutionTop5}`);
if (baselineP95 != null) console.log(`realworld_baseline_p95_ms=${baselineP95} (latency gate uses realworld suite)`);
console.log(`wrote ${outPath}`);

if (failed) process.exit(1);
console.log("\nTaste pollution gate: PASS");
