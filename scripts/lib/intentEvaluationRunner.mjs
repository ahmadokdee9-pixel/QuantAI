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
import { buildIntentEvaluationMeta } from "../../lib/intent/intentEvaluationEngine.ts";
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
    observability,
    canary,
    evaluation,
  };
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
