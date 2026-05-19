/**
 * Ranking quality evaluation — golden queries with intent/category assertions.
 * Usage: SEARCH_BASE_URL=https://quant-ai-app.vercel.app npm run test:search-eval
 */
import { ValidationRequestQueue, validationSearch, isInfrastructureFailure } from "./lib/validationQueue.mjs";
import { saveValidationRun, loadPreviousRun, compareValidationRuns, deployId } from "./lib/validationHistory.mjs";

const BASE_URL = process.env.SEARCH_BASE_URL || "http://localhost:3000";
const queue = new ValidationRequestQueue({ minIntervalMs: 2000 });

/** Consumer fitness / band lane — must not dominate luxury watch trays. */
const FITNESS_WATCH_RX =
  /\b(galaxy\s+fit|fitbit|mi\s+band|smart\s+band|fitness\s+tracker|activity\s+tracker|amazfit\s+band|whoop)\b|galaxy\s+fit\d+/i;

const LUXURY_WATCH_TITLE_RX =
  /watch|horloge|wristwatch|timepiece|chronograph|automatic|mechanical|swiss|dress|ساعة/i;

function luxuryWatchCase(query, extra = {}) {
  return {
    query,
    minProducts: 2,
    category: "watch",
    luxuryWatchLane: true,
    titleMustMatch: LUXURY_WATCH_TITLE_RX,
    ...extra,
  };
}

const CASES = [
  {
    query: "best premium headphones for focus",
    minProducts: 3,
    category: "audio",
    titleMustMatch: /headphone|earbud|airpod|bose|sony|wh-|koptelefoon/i,
  },
  {
    query: "gaming monitor for PS5 under 500",
    minProducts: 3,
    category: "electronics",
    titleMustMatch: /monitor|display|beeldscherm|scherm|hz|gaming/i,
  },
  {
    query: "minimal white sneakers like Common Projects",
    minProducts: 2,
    category: "shoes",
    titleMustMatch: /sneaker|trainer|shoe|common|achilles|leather|white/i,
  },
  {
    query: "iphone 15 pro max titanium",
    minProducts: 4,
    category: "phone",
    titleMustMatch: /iphone\s*15/i,
    titleMustNotMatch: /iphone\s*1[0-4]\b|case|cover|hoesje/i,
  },
  {
    query: "iphone 15 برو max titanium",
    minProducts: 3,
    category: "phone",
    titleMustMatch: /iphone\s*15/i,
  },
  {
    query: "كرسي office minimal",
    minProducts: 2,
    category: "furniture",
    titleMustMatch: /chair|stoel|office|desk|kantoor/i,
  },
  luxuryWatchCase("luxury ساعة under 300"),
  luxuryWatchCase("luxury watch under 3000"),
  luxuryWatchCase("elegant swiss watch"),
  luxuryWatchCase("luxury men's watch"),
  luxuryWatchCase("rolex alternative watch"),
  luxuryWatchCase("omega vs tag heuer watch"),
  luxuryWatchCase("premium mechanical watch"),
  luxuryWatchCase("ساعة شكلها luxury بس سعرها معقول"),
  {
    query: "جزمة مثل nike vomero بس ارخص",
    minProducts: 2,
    category: "shoes",
    titleMustMatch: /nike|vomero|shoe|sneaker|trainer|حذاء/i,
  },
  {
    query: "cheap but luxury looking sofa",
    minProducts: 3,
    category: "furniture",
    titleMustMatch: /sofa|couch|bank|sectional|hoekbank|كنبة/i,
  },
  {
    query: "compare airpods pro vs airpods 4",
    minProducts: 3,
    category: "audio",
    titleMustMatch: /airpods?/i,
  },
  {
    query: "yves saint laurent libre edp 90ml",
    minProducts: 2,
    category: "fragrance",
    titleMustMatch: /libre|yves|saint\s+laurent|parfum|edp/i,
  },
  {
    query: "nike shoes like vomero but cheaper",
    minProducts: 3,
    category: "shoes",
    titleMustMatch: /nike|vomero|shoe|sneaker|trainer/i,
  },
];

function topTitles(products, n = 8) {
  return products.slice(0, n).map((p) => p.title ?? "");
}

const results = [];
for (const spec of CASES) {
  const row = { query: spec.query, ok: true, issues: [] };
  try {
    const result = await validationSearch(BASE_URL, spec.query, queue);
    const { status, success, products, meta } = result;
    row.status = status;
    row.count = products.length;
    row.category = meta?.canonicalQuery?.category ?? meta?.canonicalQuery?.semantic?.productCategory ?? null;
    row.titles = topTitles(products);
    row.latencyMs = result.latencyMs ?? null;

    if (isInfrastructureFailure(result)) {
      row.issues.push(`infrastructure_${result.infrastructure?.kind ?? "unknown"}`);
      row.ok = false;
      results.push(row);
      continue;
    }
    if (!success || status !== 200) row.issues.push("api_failure");
    if (products.length < spec.minProducts) row.issues.push(`low_tray_count_${products.length}`);
    if (spec.category && row.category && row.category !== spec.category) {
      row.issues.push(`category_mismatch_${row.category}`);
    }
    const top = products.slice(0, 5);
    if (spec.titleMustMatch) {
      const hits = top.filter((p) => spec.titleMustMatch.test(p.title ?? ""));
      if (hits.length < Math.min(2, top.length)) row.issues.push("weak_title_alignment");
    }
    if (spec.titleMustNotMatch) {
      const bad = top.filter((p) => spec.titleMustNotMatch.test(p.title ?? ""));
      if (bad.length >= 2) row.issues.push("contamination_in_top5");
    }
    if (spec.luxuryWatchLane && top.length >= 2) {
      const fitnessInTop = top.filter((p) => FITNESS_WATCH_RX.test(p.title ?? "")).length;
      if (fitnessInTop >= 2) row.issues.push("fitness_pollution_top5");
      const luxuryEvidence = top.filter(
        (p) =>
          LUXURY_WATCH_TITLE_RX.test(p.title ?? "") &&
          !FITNESS_WATCH_RX.test(p.title ?? "")
      ).length;
      if (luxuryEvidence < Math.min(2, top.length)) row.issues.push("weak_luxury_watch_alignment");
    }
  } catch (e) {
    row.ok = false;
    row.issues.push(e instanceof Error ? e.message : "unknown_error");
  }
  row.ok = row.issues.length === 0;
  results.push(row);
}

for (const r of results) {
  const flag = r.ok ? "PASS" : "FAIL";
  console.log(`[${flag}] ${r.query}`);
  console.log(`  products=${r.count ?? 0} category=${r.category ?? "?"} issues=${r.issues.join(", ") || "none"}`);
  if (r.titles?.length) {
    for (const t of r.titles.slice(0, 3)) console.log(`    · ${t.slice(0, 90)}`);
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);

const evalReport = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  deployId: deployId(),
  queries: results,
  summary: {
    total: results.length,
    passed: results.length - failed.length,
    passRatePct: Math.round(((results.length - failed.length) / results.length) * 100),
    luxuryWatchCases: results.filter((r) => CASES.find((c) => c.query === r.query)?.luxuryWatchLane),
  },
};
const previous = loadPreviousRun("search-eval");
evalReport.regression = compareValidationRuns(
  {
    queries: results.map((r) => ({
      query: r.query,
      pass: r.ok,
      productCount: r.count ?? 0,
      canonicalCategory: r.category,
      scores: { ranking: r.ok ? 100 : 40 },
    })),
  },
  previous
);
saveValidationRun(evalReport, "search-eval");

if (failed.length) process.exitCode = 1;
