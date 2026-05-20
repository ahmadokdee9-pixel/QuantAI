/**
 * Phase 2.3 taste eval runner — metrics, snapshots, regression diff (offline only).
 */

import { buildCanonicalQuery } from "../../lib/search/canonicalQuery.ts";
import { buildVerticalTasteShadowMeta } from "../../lib/taste/verticalTasteShadow.ts";
import { isTasteGrammarApplyEnabled } from "../../lib/taste/verticalTasteFlags.ts";

export function runTasteCase(testCase) {
  const canonicalQuery = buildCanonicalQuery(testCase.query);
  const shadow = buildVerticalTasteShadowMeta({
    query: testCase.query,
    canonicalQuery,
    products: testCase.products,
  });
  const pass = testCase.expect(shadow);
  const goodRow = shadow.rows[0];
  const badRow = shadow.rows[1];

  const integrityOk =
    !shadow.active ||
    !goodRow ||
    !badRow ||
    goodRow.tasteFit01 >= badRow.tasteFit01 ||
    badRow.tasteViolations.length > 0;

  const laneConfidenceOk = shadow.active && shadow.grammarLane != null && shadow.intent01 >= 0.3;

  const isMinimalLane = /\b(minimal|desk setup|office minimal)\b/i.test(testCase.query);
  const gamingPollution =
    isMinimalLane &&
    badRow &&
    (badRow.tasteViolations.includes("gaming_rgb_pollution") ||
      badRow.tasteViolations.includes("aesthetic_mismatch") ||
      badRow.tasteViolations.includes("party_audio_pollution"));

  const falseLuxuryPromoted =
    shadow.active &&
    goodRow &&
    badRow &&
    badRow.tasteFit01 > goodRow.tasteFit01 &&
    badRow.tasteViolations.length === 0;

  const pollutionUnflagged =
    shadow.active &&
    badRow &&
    badRow.tasteViolations.length === 0 &&
    badRow.tasteFit01 >= 0.4;

  return {
    name: testCase.name,
    tags: testCase.tags ?? [],
    query: testCase.query,
    pass,
    shadow,
    integrityOk,
    laneConfidenceOk,
    gamingPollution,
    falseLuxuryPromoted,
    pollutionUnflagged,
    snapshot: buildCaseSnapshot(testCase, shadow, canonicalQuery),
  };
}

export function buildCaseSnapshot(testCase, shadow, canonicalQuery) {
  return {
    query: testCase.query,
    vertical: shadow.vertical ?? canonicalQuery.category,
    grammarLane: shadow.grammarLane,
    intent01: shadow.intent01,
    compareAxes: shadow.compareAxes ?? [],
    tasteTelemetry: {
      tasteFit: shadow.tasteFit,
      evidenceTier: shadow.evidenceTier,
      violations: shadow.violations ?? shadow.tasteViolations,
      applyEnabled: shadow.applyEnabled,
    },
    top5Tray: (shadow.rows ?? []).slice(0, 5).map((r) => ({
      title: r.title,
      store: r.store,
      tasteFit01: r.tasteFit01,
      evidenceTier: r.evidenceTier,
      violations: r.tasteViolations,
      grammarLane: r.grammarLane,
      shadowDelta: r.shadowDelta,
    })),
  };
}

export function aggregateTasteMetrics(results) {
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const integrityOk = results.filter((r) => r.integrityOk).length;
  const laneOk = results.filter((r) => r.laneConfidenceOk).length;
  const gamingPollutionInMinimal = results.filter((r) => {
    const minimalQuery = /\b(minimal|desk setup|office minimal|كرسي office)\b/i.test(r.query);
    return minimalQuery && r.shadow.active && !r.gamingPollution && r.pollutionUnflagged;
  }).length;

  const falseLuxuryPromoted = results.filter((r) => r.falseLuxuryPromoted).length;
  const tastePollutionTop5 = results.filter((r) => r.pollutionUnflagged).length;
  const maxShadowLatencyMs = Math.max(0, ...results.map((r) => r.shadow.latencyMs ?? 0));

  return {
    cases_total: total,
    cases_passed: passed,
    pass_rate_pct: total ? Math.round((passed / total) * 100) : 0,
    aesthetic_intent_integrity_pct: total ? Math.round((integrityOk / total) * 100) : 0,
    semantic_lane_confidence_pct: total ? Math.round((laneOk / total) * 100) : 0,
    gaming_pollution_in_minimal: gamingPollutionInMinimal,
    false_luxury_promoted: falseLuxuryPromoted,
    false_aesthetic_promoted: falseLuxuryPromoted,
    taste_pollution_top5: tastePollutionTop5,
    trust_cap_respected_pct: isTasteGrammarApplyEnabled() ? 0 : 100,
    maxShadowLatencyMs,
    applyEnabled: isTasteGrammarApplyEnabled(),
  };
}

export function compareTasteSnapshots(current, previous) {
  if (!previous?.snapshots) {
    return { hasBaseline: false, regressions: [] };
  }
  const prevMap = new Map(previous.snapshots.map((s) => [s.query, s]));
  const regressions = [];

  for (const cur of current.snapshots ?? []) {
    const prev = prevMap.get(cur.query);
    if (!prev) continue;

    if (prev.grammarLane && cur.grammarLane && prev.grammarLane !== cur.grammarLane) {
      regressions.push({
        query: cur.query,
        kind: "lane_drift",
        detail: `${prev.grammarLane} → ${cur.grammarLane}`,
      });
    }

    const prevViol = (prev.tasteTelemetry?.violations ?? []).length;
    const curViol = (cur.tasteTelemetry?.violations ?? []).length;
    const prevBad = (prev.top5Tray ?? []).find((r) => (r.violations ?? []).length > 0);
    const curBad = (cur.top5Tray ?? []).find((r) => /gaming|fit|inspired|dupe/i.test(r.title ?? ""));
    if (prevBad && (prevBad.violations ?? []).length > 0 && curBad && (curBad.violations ?? []).length === 0) {
      regressions.push({ query: cur.query, kind: "pollution_unflagged_regression", detail: "was flagged, now clean" });
    }

    if ((prev.tasteTelemetry?.tasteFit ?? 0) > 0.65 && (cur.tasteTelemetry?.tasteFit ?? 1) < 0.4) {
      regressions.push({ query: cur.query, kind: "taste_fit_drop", detail: "aggregate fit collapsed" });
    }
  }

  return { hasBaseline: true, regressions, regressionCount: regressions.length };
}
