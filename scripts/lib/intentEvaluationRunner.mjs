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
import { applyControlledIntentRuntime } from "../../lib/intent/intentRuntimeController.ts";
import { applyControlledIntentOrchestration } from "../../lib/intent/intentOrchestrator.ts";
import { applyControlledIntentMemory } from "../../lib/intent/intentMemory.ts";
import { applyControlledIntentCoordination } from "../../lib/intent/intentCoordination.ts";
import { applyControlledIntentFusion } from "../../lib/intent/intentFusion.ts";
import { applyControlledAdaptiveReasoning } from "../../lib/reasoning/adaptiveReasoning.ts";
import { applyControlledDecisionIntelligence } from "../../lib/decision/decisionIntelligence.ts";
import { applyControlledStrategyIntelligence } from "../../lib/strategy/strategyIntelligence.ts";
import { applyControlledMarketIntelligence } from "../../lib/market/marketIntelligence.ts";
import { applyControlledBehavioralCommerce } from "../../lib/behavioral/behavioralCommerce.ts";
import { applyControlledCognitionEngine } from "../../lib/cognition/cognitionIntelligence.ts";
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
  const preRuntimeLinks = runA.map((p) => p.link || p.title);
  const runtimeResult = applyControlledIntentRuntime({
    products: runA,
    query: part.query,
    canonicalQuery: canonical,
    intentIntelligence: intent,
    intentApply,
    intentProductionApply,
    intentObservability: observability,
    intentCanary: canary,
    intentEvaluation: evaluation,
    intentOptimization: optimization,
    intentGovernance: governance,
    intentCalibration: calibration,
    preOrderLinks: preRuntimeLinks,
    rankingStable,
  });
  const runtimeProducts = runtimeResult.products;
  const runtime = runtimeResult.meta;
  const preOrchestrationLinks = runtimeProducts.map((p) => p.link || p.title);
  const orchestrationResult = applyControlledIntentOrchestration({
    products: runtimeProducts,
    evaluation,
    optimization,
    governance,
    calibration,
    runtime,
    preOrderLinks: preOrchestrationLinks,
  });
  const orchestrationProducts = orchestrationResult.products;
  const orchestration = orchestrationResult.meta;
  const preMemoryLinks = orchestrationProducts.map((p) => p.link || p.title);
  const memoryResult = applyControlledIntentMemory({
    products: orchestrationProducts,
    query: part.query,
    canonicalQuery: canonical,
    governance,
    calibration,
    runtime,
    orchestration,
    preOrderLinks: preMemoryLinks,
    trayId: part.id,
  });
  const memoryProducts = memoryResult.products;
  const memory = memoryResult.meta;
  const preCoordinationLinks = memoryProducts.map((p) => p.link || p.title);
  const coordinationResult = applyControlledIntentCoordination({
    products: memoryProducts,
    query: part.query,
    canonicalQuery: canonical,
    governance,
    calibration,
    runtime,
    orchestration,
    memory,
    preOrderLinks: preCoordinationLinks,
    trayId: part.id,
  });
  const coordinationProducts = coordinationResult.products;
  const coordination = coordinationResult.meta;
  const preFusionLinks = coordinationProducts.map((p) => p.link || p.title);
  const fusionResult = applyControlledIntentFusion({
    products: coordinationProducts,
    query: part.query,
    canonicalQuery: canonical,
    governance,
    calibration,
    runtime,
    orchestration,
    memory,
    coordination,
    preOrderLinks: preFusionLinks,
    trayId: part.id,
  });
  const fusionProducts = fusionResult.products;
  const fusion = fusionResult.meta;
  const preReasoningLinks = fusionProducts.map((p) => p.link || p.title);
  const reasoningResult = applyControlledAdaptiveReasoning({
    products: fusionProducts,
    query: part.query,
    canonicalQuery: canonical,
    governance,
    calibration,
    runtime,
    orchestration,
    memory,
    coordination,
    fusion,
    preOrderLinks: preReasoningLinks,
    trayId: part.id,
  });
  const reasoningProducts = reasoningResult.products;
  const adaptiveReasoning = reasoningResult.meta;
  const preDecisionLinks = reasoningProducts.map((p) => p.link || p.title);
  const decisionResult = applyControlledDecisionIntelligence({
    products: reasoningProducts,
    query: part.query,
    canonicalQuery: canonical,
    governance,
    calibration,
    runtime,
    orchestration,
    memory,
    coordination,
    fusion,
    reasoning: adaptiveReasoning,
    preOrderLinks: preDecisionLinks,
    trayId: part.id,
  });
  const decisionProducts = decisionResult.products;
  const decisionIntelligence = decisionResult.meta;
  const preStrategyLinks = decisionProducts.map((p) => p.link || p.title);
  const strategyResult = applyControlledStrategyIntelligence({
    products: decisionProducts,
    query: part.query,
    canonicalQuery: canonical,
    governance,
    calibration,
    runtime,
    orchestration,
    memory,
    coordination,
    fusion,
    reasoning: adaptiveReasoning,
    decision: decisionIntelligence,
    preOrderLinks: preStrategyLinks,
    trayId: part.id,
  });
  const strategyProducts = strategyResult.products;
  const strategyIntelligence = strategyResult.meta;
  const preMarketLinks = strategyProducts.map((p) => p.link || p.title);
  const marketResult = applyControlledMarketIntelligence({
    products: strategyProducts,
    query: part.query,
    canonicalQuery: canonical,
    governance,
    calibration,
    runtime,
    orchestration,
    memory,
    coordination,
    fusion,
    reasoning: adaptiveReasoning,
    decision: decisionIntelligence,
    strategy: strategyIntelligence,
    preOrderLinks: preMarketLinks,
    trayId: part.id,
  });
  const marketProducts = marketResult.products;
  const marketIntelligence = marketResult.meta;
  const preBehavioralLinks = marketProducts.map((p) => p.link || p.title);
  const behavioralResult = applyControlledBehavioralCommerce({
    products: marketProducts,
    query: part.query,
    canonicalQuery: canonical,
    governance,
    calibration,
    runtime,
    orchestration,
    memory,
    coordination,
    fusion,
    reasoning: adaptiveReasoning,
    decision: decisionIntelligence,
    strategy: strategyIntelligence,
    market: marketIntelligence,
    preOrderLinks: preBehavioralLinks,
    trayId: part.id,
  });
  const behavioralProducts = behavioralResult.products;
  const behavioralCommerce = behavioralResult.meta;
  const preCognitionLinks = behavioralProducts.map((p) => p.link || p.title);
  const cognitionResult = applyControlledCognitionEngine({
    products: behavioralProducts,
    query: part.query,
    canonicalQuery: canonical,
    governance,
    calibration,
    runtime,
    orchestration,
    memory,
    coordination,
    fusion,
    reasoning: adaptiveReasoning,
    decision: decisionIntelligence,
    strategy: strategyIntelligence,
    market: marketIntelligence,
    behavioral: behavioralCommerce,
    preOrderLinks: preCognitionLinks,
    trayId: part.id,
  });
  const cognitionProducts = cognitionResult.products;
  const cognitionEngine = cognitionResult.meta;

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
    runtime,
    runtimeProducts,
    orchestration,
    orchestrationProducts,
    memory,
    memoryProducts,
    coordination,
    coordinationProducts,
    fusion,
    fusionProducts,
    adaptiveReasoning,
    reasoningProducts,
    decisionIntelligence,
    decisionProducts,
    strategyIntelligence,
    strategyProducts,
    marketIntelligence,
    marketProducts,
    behavioralCommerce,
    behavioralProducts,
    cognitionEngine,
    cognitionProducts,
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
      runtime: row.runtime,
      orchestration: row.orchestration,
      memory: row.memory,
      coordination: row.coordination,
      fusion: row.fusion,
      adaptiveReasoning: row.adaptiveReasoning,
      decisionIntelligence: row.decisionIntelligence,
      strategyIntelligence: row.strategyIntelligence,
      marketIntelligence: row.marketIntelligence,
      behavioralCommerce: row.behavioralCommerce,
      cognitionEngine: row.cognitionEngine,
      row,
    };
  });
  const aggregateContext = aggregateIntentEvaluations(rows.map((r) => ({ trayId: r.trayId, evaluation: r.evaluation })));
  for (const r of rows) {
    const prev = { ...process.env };
    for (const [k, v] of Object.entries(env)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = String(v);
    }

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
    const preRuntimeLinks = r.row.products.map((p) => p.link || p.title);
    const runtimeResult = applyControlledIntentRuntime({
      products: r.row.products,
      query: r.row.query,
      canonicalQuery: buildCanonicalQuery(r.row.query),
      intentIntelligence: r.row.intent,
      intentApply: r.row.intentApply,
      intentProductionApply: r.row.intentProductionApply,
      intentObservability: r.row.observability,
      intentCanary: r.row.canary,
      intentEvaluation: r.evaluation,
      intentOptimization: r.optimization,
      intentGovernance: r.governance,
      intentCalibration: r.calibration,
      preOrderLinks: preRuntimeLinks,
      rankingStable: r.row.rankingStable,
    });
    r.runtime = runtimeResult.meta;
    const preOrchLinks = runtimeResult.products.map((p) => p.link || p.title);
    const orchestrationResult = applyControlledIntentOrchestration({
      products: runtimeResult.products,
      evaluation: r.evaluation,
      optimization: r.optimization,
      governance: r.governance,
      calibration: r.calibration,
      runtime: r.runtime,
      preOrderLinks: preOrchLinks,
    });
    r.orchestration = orchestrationResult.meta;
    r.row.runtime = r.runtime;
    r.row.orchestration = r.orchestration;
    r.row.runtimeProducts = runtimeResult.products;
    r.row.orchestrationProducts = orchestrationResult.products;
    const preMemLinks = orchestrationResult.products.map((p) => p.link || p.title);
    const memoryResult = applyControlledIntentMemory({
      products: orchestrationResult.products,
      query: r.row.query,
      canonicalQuery: buildCanonicalQuery(r.row.query),
      governance: r.governance,
      calibration: r.calibration,
      runtime: r.runtime,
      orchestration: r.orchestration,
      preOrderLinks: preMemLinks,
      trayId: r.trayId,
    });
    r.memory = memoryResult.meta;
    r.row.memory = r.memory;
    r.row.memoryProducts = memoryResult.products;
    const preCoordLinks = memoryResult.products.map((p) => p.link || p.title);
    const coordinationResult = applyControlledIntentCoordination({
      products: memoryResult.products,
      query: r.row.query,
      canonicalQuery: buildCanonicalQuery(r.row.query),
      governance: r.governance,
      calibration: r.calibration,
      runtime: r.runtime,
      orchestration: r.orchestration,
      memory: r.memory,
      preOrderLinks: preCoordLinks,
      trayId: r.trayId,
    });
    r.coordination = coordinationResult.meta;
    r.row.coordination = r.coordination;
    r.row.coordinationProducts = coordinationResult.products;
    const preFusionLinks = coordinationResult.products.map((p) => p.link || p.title);
    const fusionResult = applyControlledIntentFusion({
      products: coordinationResult.products,
      query: r.row.query,
      canonicalQuery: buildCanonicalQuery(r.row.query),
      governance: r.governance,
      calibration: r.calibration,
      runtime: r.runtime,
      orchestration: r.orchestration,
      memory: r.memory,
      coordination: r.coordination,
      preOrderLinks: preFusionLinks,
      trayId: r.trayId,
    });
    r.fusion = fusionResult.meta;
    r.row.fusion = r.fusion;
    r.row.fusionProducts = fusionResult.products;
    const preReasoningLinks = fusionResult.products.map((p) => p.link || p.title);
    const reasoningResult = applyControlledAdaptiveReasoning({
      products: fusionResult.products,
      query: r.row.query,
      canonicalQuery: buildCanonicalQuery(r.row.query),
      governance: r.governance,
      calibration: r.calibration,
      runtime: r.runtime,
      orchestration: r.orchestration,
      memory: r.memory,
      coordination: r.coordination,
      fusion: r.fusion,
      preOrderLinks: preReasoningLinks,
      trayId: r.trayId,
    });
    r.adaptiveReasoning = reasoningResult.meta;
    r.row.adaptiveReasoning = r.adaptiveReasoning;
    r.row.reasoningProducts = reasoningResult.products;
    const preDecisionLinks = reasoningResult.products.map((p) => p.link || p.title);
    const decisionResult = applyControlledDecisionIntelligence({
      products: reasoningResult.products,
      query: r.row.query,
      canonicalQuery: buildCanonicalQuery(r.row.query),
      governance: r.governance,
      calibration: r.calibration,
      runtime: r.runtime,
      orchestration: r.orchestration,
      memory: r.memory,
      coordination: r.coordination,
      fusion: r.fusion,
      reasoning: r.adaptiveReasoning,
      preOrderLinks: preDecisionLinks,
      trayId: r.trayId,
    });
    r.decisionIntelligence = decisionResult.meta;
    r.row.decisionIntelligence = r.decisionIntelligence;
    r.row.decisionProducts = decisionResult.products;
    const preStrategyLinks = decisionResult.products.map((p) => p.link || p.title);
    const strategyResult = applyControlledStrategyIntelligence({
      products: decisionResult.products,
      query: r.row.query,
      canonicalQuery: buildCanonicalQuery(r.row.query),
      governance: r.governance,
      calibration: r.calibration,
      runtime: r.runtime,
      orchestration: r.orchestration,
      memory: r.memory,
      coordination: r.coordination,
      fusion: r.fusion,
      reasoning: r.adaptiveReasoning,
      decision: r.decisionIntelligence,
      preOrderLinks: preStrategyLinks,
      trayId: r.trayId,
    });
    r.strategyIntelligence = strategyResult.meta;
    r.row.strategyIntelligence = r.strategyIntelligence;
    r.row.strategyProducts = strategyResult.products;
    const preMarketLinks = strategyResult.products.map((p) => p.link || p.title);
    const marketResult = applyControlledMarketIntelligence({
      products: strategyResult.products,
      query: r.row.query,
      canonicalQuery: buildCanonicalQuery(r.row.query),
      governance: r.governance,
      calibration: r.calibration,
      runtime: r.runtime,
      orchestration: r.orchestration,
      memory: r.memory,
      coordination: r.coordination,
      fusion: r.fusion,
      reasoning: r.adaptiveReasoning,
      decision: r.decisionIntelligence,
      strategy: r.strategyIntelligence,
      preOrderLinks: preMarketLinks,
      trayId: r.trayId,
    });
    r.marketIntelligence = marketResult.meta;
    r.row.marketIntelligence = r.marketIntelligence;
    r.row.marketProducts = marketResult.products;
    const preBehavioralLinks = marketResult.products.map((p) => p.link || p.title);
    const behavioralResult = applyControlledBehavioralCommerce({
      products: marketResult.products,
      query: r.row.query,
      canonicalQuery: buildCanonicalQuery(r.row.query),
      governance: r.governance,
      calibration: r.calibration,
      runtime: r.runtime,
      orchestration: r.orchestration,
      memory: r.memory,
      coordination: r.coordination,
      fusion: r.fusion,
      reasoning: r.adaptiveReasoning,
      decision: r.decisionIntelligence,
      strategy: r.strategyIntelligence,
      market: r.marketIntelligence,
      preOrderLinks: preBehavioralLinks,
      trayId: r.trayId,
    });
    r.behavioralCommerce = behavioralResult.meta;
    r.row.behavioralCommerce = r.behavioralCommerce;
    r.row.behavioralProducts = behavioralResult.products;
    const preCognitionLinks = behavioralResult.products.map((p) => p.link || p.title);
    const cognitionResult = applyControlledCognitionEngine({
      products: behavioralResult.products,
      query: r.row.query,
      canonicalQuery: buildCanonicalQuery(r.row.query),
      governance: r.governance,
      calibration: r.calibration,
      runtime: r.runtime,
      orchestration: r.orchestration,
      memory: r.memory,
      coordination: r.coordination,
      fusion: r.fusion,
      reasoning: r.adaptiveReasoning,
      decision: r.decisionIntelligence,
      strategy: r.strategyIntelligence,
      market: r.marketIntelligence,
      behavioral: r.behavioralCommerce,
      preOrderLinks: preCognitionLinks,
      trayId: r.trayId,
    });
    r.cognitionEngine = cognitionResult.meta;
    r.row.cognitionEngine = r.cognitionEngine;
    r.row.cognitionProducts = cognitionResult.products;
    r.row.optimization = r.optimization;
    r.row.governance = r.governance;
    r.row.calibration = r.calibration;

    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
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
