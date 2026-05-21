/**
 * P4.6 — Full-stack intent evaluation runner for validation scripts.
 */

import { buildCanonicalQuery } from "../../lib/search/canonicalQuery.ts";
import { semanticRerankSearchResults } from "../../lib/search/semanticReranker.ts";
import { computeIntentIntelligence } from "../../lib/intent/intentIntelligenceEngine.ts";
import { buildIntentApplyMeta } from "../../lib/intent/intentApply.ts";
import { buildIntentProductionApplyMeta } from "../../lib/intent/intentProductionApply.ts";
import { buildIntentObservabilityMeta } from "../../lib/intent/intentObservability.ts";
import { buildIntentCanaryMeta, setIntentCanarySessionKey } from "../../lib/intent/intentCanaryController.ts";
import { aggregateIntentEvaluations, buildIntentEvaluationMeta } from "../../lib/intent/intentEvaluationEngine.ts";
import { buildIntentOptimizationMeta } from "../../lib/intent/intentOptimizationEngine.ts";
import { buildIntentGovernanceMeta } from "../../lib/intent/intentGovernanceEngine.ts";
import { buildIntentCalibrationMeta } from "../../lib/intent/intentCalibrationEngine.ts";
import { INTENT_LIVE_PARTITIONS } from "./intentLiveObservabilityPartitions.mjs";

export { INTENT_LIVE_PARTITIONS };

export function runIntentEvaluationPartition(part, env = {}) {
  const prev = { ...process.env };
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = String(v);
  }

  const sessionKey = `user:eval-${part.id}`;
  setIntentCanarySessionKey(sessionKey);

  const canonical = buildCanonicalQuery(part.query);
  const products = [...part.products];
  const preLinks = products.map((p) => p.link);

  const intent = computeIntentIntelligence({ query: part.query, canonicalQuery: canonical });

  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "false";
  const offRanked = semanticRerankSearchResults(products, part.query, canonical);

  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = env.INTENT_INTELLIGENCE_APPLY_ENABLED ?? "true";
  const runA = semanticRerankSearchResults(products, part.query, canonical);
  const runB = semanticRerankSearchResults(products, part.query, canonical);
  const rankingStable = runA.map((p) => p.link).join("|") === runB.map((p) => p.link).join("|");

  const intentApply = buildIntentApplyMeta({
    query: part.query,
    canonicalQuery: canonical,
    products: runA,
    preOrderLinks: preLinks,
  });
  const intentProductionApply = buildIntentProductionApplyMeta({ intentApply });
  const observability = buildIntentObservabilityMeta({
    query: part.query,
    canonicalQuery: canonical,
    intentIntelligence: intent,
    intentApply,
    intentProductionApply,
    products: runA,
    preOrderLinks: preLinks,
    rankingStable,
  });
  const canary = buildIntentCanaryMeta({ sessionKey, observability });
  const evaluation = buildIntentEvaluationMeta({
    query: part.query,
    trayId: part.id,
    canonicalQuery: canonical,
    intentIntelligence: intent,
    intentApply,
    intentProductionApply,
    intentObservability: observability,
    intentCanary: canary,
    products: runA,
    preOrderLinks: preLinks,
    rankingStable,
  });
  const aggregateContext = aggregateIntentEvaluations([{ trayId: part.id, evaluation }]);
  const optimization = buildIntentOptimizationMeta({
    trayId: part.id,
    evaluation,
    aggregateContext,
  });
  const governance = buildIntentGovernanceMeta({
    evaluation,
    optimization,
    observability,
    intentApply,
    productionApply: intentProductionApply,
    canary,
    products: runA,
    rankingStable,
  });
  const calibration = buildIntentCalibrationMeta({
    evaluation,
    governance,
    observability,
    intentApply,
    productionApply: intentProductionApply,
    products: runA,
    rankingStable,
  });

  let drift = 0;
  const offTop = offRanked.slice(0, 3).map((p) => p.link);
  const onTop = runA.slice(0, 3).map((p) => p.link);
  for (let i = 0; i < Math.min(offTop.length, onTop.length); i += 1) {
    if (offTop[i] !== onTop[i]) drift += 1;
  }

  for (const [k, v] of Object.entries(prev)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  setIntentCanarySessionKey(null);

  return {
    id: part.id,
    query: part.query,
    drift,
    offLinks: offRanked.map((p) => p.link).join("|"),
    onLinks: runA.map((p) => p.link).join("|"),
    rankingStable,
    intent,
    intentApply,
    intentProductionApply,
    observability,
    canary,
    evaluation,
    optimization,
    governance,
    calibration,
    products: runA,
  };
}

/** Run all live partitions and return rows with shared aggregate context for P4.7. */
export function runIntentEvaluationPartitions(env = EVAL_CANARY_ENV) {
  const rows = INTENT_LIVE_PARTITIONS.map((part) => {
    const row = runIntentEvaluationPartition(part, env);
    return {
      trayId: part.id,
      evaluation: row.evaluation,
      optimization: row.optimization,
      governance: row.governance,
      calibration: row.calibration,
      row,
    };
  });
  const aggregateContext = aggregateIntentEvaluations(rows.map((r) => ({ trayId: r.trayId, evaluation: r.evaluation })));
  for (const r of rows) {
    r.optimization = buildIntentOptimizationMeta({
      trayId: r.trayId,
      evaluation: r.evaluation,
      aggregateContext,
    });
    r.governance = buildIntentGovernanceMeta({
      evaluation: r.evaluation,
      optimization: r.optimization,
      observability: r.row.observability,
      intentApply: r.row.intentApply,
      productionApply: r.row.intentProductionApply,
      canary: r.row.canary,
      products: r.row.products,
      rankingStable: r.row.rankingStable,
    });
    r.calibration = buildIntentCalibrationMeta({
      evaluation: r.evaluation,
      governance: r.governance,
      observability: r.row.observability,
      intentApply: r.row.intentApply,
      productionApply: r.row.intentProductionApply,
      products: r.row.products,
      rankingStable: r.row.rankingStable,
    });
    r.row.optimization = r.optimization;
    r.row.governance = r.governance;
    r.row.calibration = r.calibration;
  }
  return rows;
}

export const EVAL_CANARY_ENV = {
  NODE_ENV: "production",
  INTENT_INTELLIGENCE_APPLY_ENABLED: "true",
  INTENT_INTELLIGENCE_CANARY_APPLY: "true",
  INTENT_CANARY_ROLLOUT_STAGE: "100",
  TASTE_UNIFIED_APPLY_ENABLED: "false",
  TASTE_GRAMMAR_ENABLED: "false",
  TASTE_FRAGRANCE_GRAMMAR_ENABLED: "false",
  TASTE_FURNITURE_GRAMMAR_ENABLED: "false",
};
