/**
 * Phase 4.0 — Intent Intelligence institutional eval.
 * Usage: npm run test:intent-intelligence
 */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { computeIntentIntelligence } from "../lib/intent/intentIntelligenceEngine.ts";
import { isIntentIntelligenceApplyEnabled } from "../lib/intent/intentIntelligenceFlags.ts";
import { saveValidationRun } from "./lib/validationHistory.mjs";

process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "false";

const CASES = [
  {
    id: "arabic_office_chair_luxury",
    group: "arabic",
    query: "كرسي مكتب مريح وفخم",
    language: "arabic",
    minConfidence: 0.35,
    expectCategory: "furniture",
    expectActiveDims: ["category", "taste"],
  },
  {
    id: "arabic_alternative_shoes",
    group: "arabic",
    query: "جزمة مثل nike vomero بس ارخص",
    language: "mixed",
    minConfidence: 0.4,
    expectCategory: "shoes",
    expectActiveDims: ["category", "budget", "urgencyComparison"],
    expectLabels: ["alternative"],
  },
  {
    id: "arabic_niche_fragrance",
    group: "arabic",
    query: "عطر نيش فاخر ثابت",
    language: "arabic",
    minConfidence: 0.35,
    expectCategory: "fragrance",
    expectActiveDims: ["category", "taste"],
  },
  {
    id: "english_quiet_luxury_watch",
    group: "english",
    query: "elegant swiss dress watch quiet luxury",
    language: "english",
    minConfidence: 0.45,
    expectCategory: "watch",
    expectActiveDims: ["category", "taste"],
    expectLabels: ["luxury"],
  },
  {
    id: "english_premium_headphones",
    group: "english",
    query: "best premium headphones for focus",
    language: "english",
    minConfidence: 0.45,
    expectCategory: "audio",
    expectActiveDims: ["category", "taste", "budget"],
  },
  {
    id: "english_phone_budget",
    group: "english",
    query: "iphone 15 pro max under 900",
    language: "english",
    minConfidence: 0.45,
    expectCategory: "phone",
    expectActiveDims: ["category", "product", "budget"],
  },
  {
    id: "mixed_office_chair",
    group: "mixed",
    query: "كرسي office minimal",
    language: "mixed",
    minConfidence: 0.4,
    expectCategory: "furniture",
    expectActiveDims: ["category", "taste"],
    expectLabels: ["minimal"],
  },
  {
    id: "vague_home_shopping",
    group: "vague",
    query: "something nice for home",
    language: "english",
    minConfidence: 0.15,
    maxConfidence: 0.55,
    expectCategory: "home",
    expectActiveDims: ["category"],
  },
  {
    id: "luxury_minimal_desk",
    group: "luxury_minimal",
    query: "minimal oak desk setup clean",
    language: "english",
    minConfidence: 0.45,
    expectCategory: "desk_setup",
    expectActiveDims: ["category", "taste"],
    expectLabels: ["minimal"],
  },
  {
    id: "budget_laptop",
    group: "budget",
    query: "cheap but good laptop under 500",
    language: "english",
    minConfidence: 0.4,
    expectCategory: "laptop",
    expectActiveDims: ["category", "budget"],
  },
  {
    id: "trust_sensitive_fragrance",
    group: "trust",
    query: "authentic ysl libre eau de parfum trusted seller only",
    language: "english",
    minConfidence: 0.45,
    expectCategory: "fragrance",
    expectActiveDims: ["category", "product", "trust"],
    expectLabels: ["trusted_only"],
  },
  {
    id: "comparison_urgency",
    group: "comparison",
    query: "compare sony wh-1000xm5 vs bose qc45 which is better",
    language: "english",
    minConfidence: 0.45,
    expectCategory: "audio",
    expectActiveDims: ["category", "urgencyComparison"],
    expectLabels: ["comparison"],
  },
];

let failed = 0;
const results = [];

if (isIntentIntelligenceApplyEnabled()) {
  console.error("FAIL intent apply must be OFF for P4.0 eval");
  process.exit(1);
}

for (const c of CASES) {
  const canonical = buildCanonicalQuery(c.query);
  const run1 = computeIntentIntelligence({ query: c.query, canonicalQuery: canonical });
  const run2 = computeIntentIntelligence({ query: c.query, canonicalQuery: canonical });

  const dims = run1.detectedIntents;
  const activeDimOk = (c.expectActiveDims ?? []).every((d) => dims[d]?.active === true);
  const categoryOk = !c.expectCategory || dims.category.category === c.expectCategory;
  const languageOk = !c.language || run1.languageProfile === c.language;
  const confidenceOk =
    run1.confidence >= (c.minConfidence ?? 0) &&
    (c.maxConfidence == null || run1.confidence <= c.maxConfidence);
  const labelsOk =
    !c.expectLabels?.length ||
    c.expectLabels.every((l) => run1.detectedIntentLabels.some((x) => x.includes(l)));
  const stableOk =
    run1.confidence === run2.confidence &&
    run1.detectedIntentLabels.join("|") === run2.detectedIntentLabels.join("|");
  const applyOff = run1.applyEnabled === false;
  const latencyOk = run1.latencyMs <= 12;

  const ok =
    run1.active &&
    applyOff &&
    activeDimOk &&
    categoryOk &&
    languageOk &&
    confidenceOk &&
    labelsOk &&
    stableOk &&
    latencyOk;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${c.id}`, {
      confidence: run1.confidence,
      category: dims.category.category,
      language: run1.languageProfile,
      labels: run1.detectedIntentLabels,
      activeDimOk,
      categoryOk,
      labelsOk,
      stableOk,
      latencyMs: run1.latencyMs,
    });
  } else {
    console.log(
      `OK ${c.id} conf=${run1.confidence} cat=${dims.category.category} lang=${run1.languageProfile} latency=${run1.latencyMs}ms`
    );
  }

  results.push({
    id: c.id,
    group: c.group,
    query: c.query,
    pass: ok,
    meta: run1,
  });
}

const report = {
  suite: "intent-intelligence",
  phase: "P4.0",
  at: new Date().toISOString(),
  apply_enabled: false,
  cases_passed: results.filter((r) => r.pass).length,
  cases_total: results.length,
  pass_rate_pct: Math.round((results.filter((r) => r.pass).length / results.length) * 100),
  min_confidence: Math.min(...results.map((r) => r.meta.confidence ?? 0)),
  max_latency_ms: Math.max(...results.map((r) => r.meta.latencyMs ?? 0)),
  arabic_pass: results.filter((r) => r.group === "arabic" && r.pass).length,
  english_pass: results.filter((r) => r.group === "english" && r.pass).length,
  mixed_pass: results.filter((r) => r.group === "mixed" && r.pass).length,
  vague_pass: results.filter((r) => r.group === "vague" && r.pass).length,
  results,
  recommendation: failed === 0 ? "p4_meta_soak_ready" : "fix_intent_engine_before_p4_1",
};

saveValidationRun(report, "intent-intelligence");

if (failed) process.exit(1);
console.log("\nIntent intelligence eval passed");
