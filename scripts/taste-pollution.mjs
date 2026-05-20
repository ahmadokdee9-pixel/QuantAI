/**
 * Phase 2.3 taste pollution gate — expanded golden trays + snapshot.
 * Usage: npx --yes tsx scripts/taste-pollution.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { buildVerticalTasteShadowMeta } from "../lib/taste/verticalTasteShadow.ts";
import { isTasteGrammarApplyEnabled } from "../lib/taste/verticalTasteFlags.ts";
import { POLLUTION_GOLDEN, POLLUTION_RX, MOCK } from "./lib/tasteEvalCases.mjs";
import { buildCaseSnapshot } from "./lib/tasteEvalRunner.mjs";
import { saveValidationRun } from "./lib/validationHistory.mjs";

let falseLuxuryPromoted = 0;
let tastePollutionTop5 = 0;
let gamingPollutionInMinimal = 0;
const rows = [];
const snapshots = [];

for (const g of POLLUTION_GOLDEN) {
  const canonicalQuery = buildCanonicalQuery(g.query);
  const good = MOCK(g.goodTitle);
  const bad = MOCK(g.badTitle);
  const shadow = buildVerticalTasteShadowMeta({ query: g.query, canonicalQuery, products: [good, bad] });

  const badRow = shadow.rows.find((r) => POLLUTION_RX[g.pollutionKey].test(r.title));
  const flagged = Boolean(
    shadow.active && badRow && (badRow.tasteViolations.length > 0 || badRow.tasteFit01 < 0.4)
  );

  if (!flagged && shadow.active) tastePollutionTop5 += 1;

  const goodRow = shadow.rows[0];
  if (goodRow && badRow && badRow.tasteFit01 > goodRow.tasteFit01 && badRow.tasteViolations.length === 0) {
    falseLuxuryPromoted += 1;
  }

  if (/\b(minimal|desk setup|office minimal)\b/i.test(g.query) && shadow.active && !flagged) {
    gamingPollutionInMinimal += 1;
  }

  snapshots.push(buildCaseSnapshot({ query: g.query, products: [good, bad] }, shadow, canonicalQuery));
  rows.push({ query: g.query, vertical: g.vertical, flagged, violations: badRow?.tasteViolations ?? [] });
  console.log(`${flagged ? "OK" : "FAIL"} ${g.query} → flagged=${flagged}`);
}

const trustCapRespectedPct = isTasteGrammarApplyEnabled() ? 0 : 100;

const report = {
  suite: "taste-pollution",
  at: new Date().toISOString(),
  false_luxury_promoted: falseLuxuryPromoted,
  false_aesthetic_promoted: falseLuxuryPromoted,
  trust_cap_respected_pct: trustCapRespectedPct,
  taste_pollution_top5: tastePollutionTop5,
  gaming_pollution_in_minimal: gamingPollutionInMinimal,
  snapshots,
  rows,
};

const { file } = saveValidationRun(report, "taste-pollution");

const failed =
  falseLuxuryPromoted > 0 || trustCapRespectedPct < 100 || tastePollutionTop5 > 0 || gamingPollutionInMinimal > 0;

console.log(`\nfalse_luxury_promoted=${falseLuxuryPromoted}`);
console.log(`trust_cap_respected_pct=${trustCapRespectedPct}`);
console.log(`taste_pollution_top5=${tastePollutionTop5}`);
console.log(`gaming_pollution_in_minimal=${gamingPollutionInMinimal}`);
console.log(`wrote ${file}`);

if (failed) process.exit(1);
console.log("\nTaste pollution gate: PASS");
