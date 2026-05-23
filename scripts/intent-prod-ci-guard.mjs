/**
 * P4.3 — CI guard: block accidental production intent apply activation in repo config.
 * Usage: node scripts/intent-prod-ci-guard.mjs (wired into production-validation-gate)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const EXAMPLE = resolve(ROOT, ".env.example");
const LOCAL = resolve(ROOT, ".env.local");
const ROUTE = resolve(ROOT, "app/api/search/route.ts");

let failed = 0;

function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
  if (!ok) failed += 1;
}

const example = existsSync(EXAMPLE) ? readFileSync(EXAMPLE, "utf8") : "";
check(
  "env_example_prod_apply_commented",
  /#\s*INTENT_INTELLIGENCE_PROD_APPLY=false/.test(example) || /INTENT_INTELLIGENCE_PROD_APPLY=false/.test(example),
  "INTENT_INTELLIGENCE_PROD_APPLY documented OFF in .env.example"
);

if (existsSync(LOCAL) && process.env.CI === "true" && process.env.INTENT_PROD_APPLY_CI_ALLOW !== "true") {
  const local = readFileSync(LOCAL, "utf8");
  const prodOn = /^\s*INTENT_INTELLIGENCE_PROD_APPLY\s*=\s*true\s*$/im.test(local);
  check("ci_local_prod_apply_not_true", !prodOn, prodOn ? "PROD_APPLY=true in .env.local on CI" : "ok");
}

const route = readFileSync(ROUTE, "utf8");
check(
  "intent_production_apply_telemetry",
  route.includes("intentProductionApply") && route.includes("buildIntentProductionApplyMeta"),
  "meta.intentProductionApply wired in search route"
);

check(
  "intent_observability_telemetry",
  route.includes("intentObservability") && route.includes("buildIntentObservabilityMeta"),
  "meta.intentObservability wired in search route"
);

check(
  "intent_canary_telemetry",
  route.includes("intentCanary") && route.includes("buildIntentCanaryMeta"),
  "meta.intentCanary wired in search route"
);

check(
  "intent_evaluation_telemetry",
  route.includes("intentEvaluation") && route.includes("buildIntentEvaluationMeta"),
  "meta.intentEvaluation wired in search route"
);

check(
  "intent_optimization_telemetry",
  route.includes("intentOptimization") && route.includes("buildIntentOptimizationMeta"),
  "meta.intentOptimization wired in search route"
);

check(
  "no_autonomous_optimization_apply",
  !/applyOptimization|autonomousOptimize/.test(route),
  "no autonomous optimization apply in search route"
);

check(
  "intent_governance_telemetry",
  route.includes("intentGovernance") && route.includes("buildIntentGovernanceMeta"),
  "meta.intentGovernance wired in search route"
);

check(
  "no_autonomous_governance_apply",
  !/applyGovernance|enforceGovernancePolicy|autonomousGovern/.test(route),
  "no autonomous governance apply in search route"
);

check(
  "intent_calibration_telemetry",
  route.includes("intentCalibration") && route.includes("buildIntentCalibrationMeta"),
  "meta.intentCalibration wired in search route"
);

check(
  "no_autonomous_calibration_apply",
  !/applyCalibration|enforceCalibration|autonomousCalibrat/.test(route),
  "no autonomous calibration apply in search route"
);

check(
  "intent_runtime_telemetry",
  route.includes("intentRuntime") && route.includes("applyControlledIntentRuntime"),
  "meta.intentRuntime wired in search route"
);

check(
  "runtime_default_off_in_example",
  /INTENT_RUNTIME_ENABLED=false/.test(example) || /#\s*INTENT_RUNTIME_ENABLED=false/.test(example),
  "INTENT_RUNTIME_ENABLED documented OFF in .env.example"
);

check(
  "no_autonomous_runtime_self_modify",
  !/selfModifyRuntime|autonomousRuntime|uncontrolledRank/.test(route),
  "no autonomous runtime self-modify in search route"
);

check(
  "intent_orchestration_telemetry",
  route.includes("intentOrchestration") && route.includes("applyControlledIntentOrchestration"),
  "meta.intentOrchestration wired in search route"
);

check(
  "orchestration_default_off_in_example",
  /INTENT_ORCHESTRATION_ENABLED=false/.test(example) || /#\s*INTENT_ORCHESTRATION_ENABLED=false/.test(example),
  "INTENT_ORCHESTRATION_ENABLED documented OFF in .env.example"
);

check(
  "no_autonomous_orchestration_self_modify",
  !/selfModifyOrchestr|autonomousOrchestr|uncontrolledAdapt/.test(route),
  "no autonomous orchestration self-modify in search route"
);

check(
  "intent_memory_telemetry",
  route.includes("intentMemory") && route.includes("applyControlledIntentMemory"),
  "meta.intentMemory wired in search route"
);

check(
  "memory_default_off_in_example",
  /INTENT_MEMORY_ENABLED=false/.test(example) || /#\s*INTENT_MEMORY_ENABLED=false/.test(example),
  "INTENT_MEMORY_ENABLED documented OFF in .env.example"
);

check(
  "no_personalization_memory",
  !/userProfile|personalizationMemory|embeddingMemory/.test(route),
  "no personalization memory in search route"
);

check(
  "intent_coordination_telemetry",
  route.includes("intentCoordination") && route.includes("applyControlledIntentCoordination"),
  "meta.intentCoordination wired in search route"
);

check(
  "coordination_default_off_in_example",
  /INTENT_COORDINATION_ENABLED=false/.test(example) || /#\s*INTENT_COORDINATION_ENABLED=false/.test(example),
  "INTENT_COORDINATION_ENABLED documented OFF in .env.example"
);

check(
  "no_personalization_coordination",
  !/userProfile|personalizationCoordination|embeddingCoordination|autonomousReasoning/.test(route),
  "no personalization coordination in search route"
);

check(
  "intent_fusion_telemetry",
  route.includes("intentFusion") && route.includes("applyControlledIntentFusion"),
  "meta.intentFusion wired in search route"
);

check(
  "fusion_default_off_in_example",
  /INTENT_FUSION_ENABLED=false/.test(example) || /#\s*INTENT_FUSION_ENABLED=false/.test(example),
  "INTENT_FUSION_ENABLED documented OFF in .env.example"
);

check(
  "no_personalization_fusion",
  !/userProfile|personalizationFusion|embeddingFusion|autonomousFusion/.test(route),
  "no personalization fusion in search route"
);

check(
  "adaptive_reasoning_telemetry",
  route.includes("adaptiveReasoning") && route.includes("applyControlledAdaptiveReasoning"),
  "meta.adaptiveReasoning wired in search route"
);

check(
  "reasoning_default_off_in_example",
  /ADAPTIVE_REASONING_ENABLED=false/.test(example) || /#\s*ADAPTIVE_REASONING_ENABLED=false/.test(example),
  "ADAPTIVE_REASONING_ENABLED documented OFF in .env.example"
);

check(
  "no_personalization_reasoning",
  !/userProfile|personalizationReasoning|embeddingReasoning|autonomousReasoning/.test(route),
  "no personalization reasoning in search route"
);

check(
  "decision_intelligence_telemetry",
  route.includes("decisionIntelligence") && route.includes("applyControlledDecisionIntelligence"),
  "meta.decisionIntelligence wired in search route"
);

check(
  "decision_default_off_in_example",
  /DECISION_INTELLIGENCE_ENABLED=false/.test(example) || /#\s*DECISION_INTELLIGENCE_ENABLED=false/.test(example),
  "DECISION_INTELLIGENCE_ENABLED documented OFF in .env.example"
);

check(
  "no_personalization_decision",
  !/userProfile|personalizationDecision|embeddingDecision|autonomousDecision/.test(route),
  "no personalization decision in search route"
);

check(
  "strategy_intelligence_telemetry",
  route.includes("strategyIntelligence") && route.includes("applyControlledStrategyIntelligence"),
  "meta.strategyIntelligence wired in search route"
);

check(
  "strategy_default_off_in_example",
  /STRATEGY_INTELLIGENCE_ENABLED=false/.test(example) || /#\s*STRATEGY_INTELLIGENCE_ENABLED=false/.test(example),
  "STRATEGY_INTELLIGENCE_ENABLED documented OFF in .env.example"
);

check(
  "no_personalization_strategy",
  !/userProfile|personalizationStrategy|embeddingStrategy|autonomousStrategy/.test(route),
  "no personalization strategy in search route"
);

check(
  "market_intelligence_telemetry",
  route.includes("marketIntelligence") && route.includes("applyControlledMarketIntelligence"),
  "meta.marketIntelligence wired in search route"
);

check(
  "market_default_off_in_example",
  /MARKET_INTELLIGENCE_ENABLED=false/.test(example) || /#\s*MARKET_INTELLIGENCE_ENABLED=false/.test(example),
  "MARKET_INTELLIGENCE_ENABLED documented OFF in .env.example"
);

check(
  "no_personalization_market",
  !/userProfile|personalizationMarket|embeddingMarket|autonomousMarket/.test(route),
  "no personalization market in search route"
);

check(
  "behavioral_commerce_telemetry",
  route.includes("behavioralCommerce") && route.includes("applyControlledBehavioralCommerce"),
  "meta.behavioralCommerce wired in search route"
);

check(
  "behavioral_default_off_in_example",
  /BEHAVIORAL_COMMERCE_ENABLED=false/.test(example) || /#\s*BEHAVIORAL_COMMERCE_ENABLED=false/.test(example),
  "BEHAVIORAL_COMMERCE_ENABLED documented OFF in .env.example"
);

check(
  "no_personalization_behavioral",
  !/userProfile|personalizationBehavioral|embeddingBehavioral|autonomousBehavioral/.test(route),
  "no personalization behavioral in search route"
);

check(
  "cognition_engine_telemetry",
  route.includes("cognitionEngine") && route.includes("applyControlledCognitionEngine"),
  "meta.cognitionEngine wired in search route"
);

check(
  "cognition_default_off_in_example",
  /COGNITION_ENGINE_ENABLED=false/.test(example) || /#\s*COGNITION_ENGINE_ENABLED=false/.test(example),
  "COGNITION_ENGINE_ENABLED documented OFF in .env.example"
);

check(
  "no_personalization_cognition",
  !/userProfile|personalizationCognition|embeddingCognition|autonomousCognition/.test(route),
  "no personalization cognition in search route"
);

check(
  "intent_cognition_telemetry",
  route.includes("intentCognition") && route.includes("applyControlledIntentCognition"),
  "meta.intentCognition wired in search route"
);

check(
  "intent_cognition_default_off_in_example",
  /INTENT_COGNITION_ENABLED=false/.test(example) || /#\s*INTENT_COGNITION_ENABLED=false/.test(example),
  "INTENT_COGNITION_ENABLED documented OFF in .env.example"
);

check(
  "no_personalization_intent_cognition",
  !/personalizationMemory|userTasteProfile|embeddingIntent|autonomousIntent/.test(route),
  "no personalization intent cognition in search route"
);

check(
  "multi_objective_commerce_telemetry",
  route.includes("multiObjectiveCommerce") && route.includes("applyControlledMultiObjectiveCommerce"),
  "meta.multiObjectiveCommerce wired in search route"
);

check(
  "multi_objective_default_off_in_example",
  /MULTI_OBJECTIVE_COMMERCE_ENABLED=false/.test(example) || /#\s*MULTI_OBJECTIVE_COMMERCE_ENABLED=false/.test(example),
  "MULTI_OBJECTIVE_COMMERCE_ENABLED documented OFF in .env.example"
);

check(
  "no_personalization_multi_objective",
  !/personalizationObjective|userObjectiveProfile|embeddingObjective|autonomousObjective/.test(route),
  "no personalization multi-objective in search route"
);

check(
  "adaptive_strategic_ranking_telemetry",
  route.includes("adaptiveStrategicRanking") && route.includes("applyControlledAdaptiveStrategicRanking"),
  "meta.adaptiveStrategicRanking wired in search route"
);

check(
  "adaptive_strategic_ranking_default_off_in_example",
  /ADAPTIVE_STRATEGIC_RANKING_ENABLED=false/.test(example) || /#\s*ADAPTIVE_STRATEGIC_RANKING_ENABLED=false/.test(example),
  "ADAPTIVE_STRATEGIC_RANKING_ENABLED documented OFF in .env.example"
);

check(
  "no_personalization_strategic_ranking",
  !/personalizationRanking|userRankingProfile|embeddingRanking|autonomousRanking/.test(route),
  "no personalization strategic ranking in search route"
);

check(
  "memoryless_commerce_learning_telemetry",
  route.includes("memorylessCommerceLearning") && route.includes("applyControlledMemorylessCommerceLearning"),
  "meta.memorylessCommerceLearning wired in search route"
);

check(
  "memoryless_learning_default_off_in_example",
  /MEMORYLESS_COMMERCE_LEARNING_ENABLED=false/.test(example) || /#\s*MEMORYLESS_COMMERCE_LEARNING_ENABLED=false/.test(example),
  "MEMORYLESS_COMMERCE_LEARNING_ENABLED documented OFF in .env.example"
);

check(
  "no_user_memory_in_memoryless_learning",
  !/userProfile|personalizationMemory|userHistoryStore|embeddingLearning/.test(route),
  "no user memory patterns in memoryless learning route"
);

check(
  "market_reality_intelligence_telemetry",
  route.includes("marketRealityIntelligence") && route.includes("applyControlledMarketRealityIntelligence"),
  "meta.marketRealityIntelligence wired in search route"
);

check(
  "market_reality_default_off_in_example",
  /MARKET_REALITY_INTELLIGENCE_ENABLED=false/.test(example) || /#\s*MARKET_REALITY_INTELLIGENCE_ENABLED=false/.test(example),
  "MARKET_REALITY_INTELLIGENCE_ENABLED documented OFF in .env.example"
);

check(
  "no_personalization_market_reality",
  !/userProfile|personalizationMemory|embeddingReality|autonomousMarketReality/.test(route),
  "no personalization market reality in search route"
);

check(
  "commerce_decision_intelligence_telemetry",
  route.includes("commerceDecisionIntelligence") && route.includes("applyControlledCommerceDecisionIntelligence"),
  "meta.commerceDecisionIntelligence wired in search route"
);

check(
  "commerce_decision_default_off_in_example",
  /COMMERCE_DECISION_INTELLIGENCE_ENABLED=false/.test(example) || /#\s*COMMERCE_DECISION_INTELLIGENCE_ENABLED=false/.test(example),
  "COMMERCE_DECISION_INTELLIGENCE_ENABLED documented OFF in .env.example"
);

check(
  "no_personalization_commerce_decision",
  !/userProfile|personalizationMemory|embeddingDecision|autonomousCommerceDecision/.test(route),
  "no personalization commerce decision in search route"
);

check(
  "autonomous_commerce_reasoning_graph_telemetry",
  route.includes("autonomousCommerceReasoningGraph") && route.includes("applyControlledAutonomousCommerceReasoningGraph"),
  "meta.autonomousCommerceReasoningGraph wired in search route"
);

check(
  "reasoning_graph_default_off_in_example",
  /AUTONOMOUS_COMMERCE_REASONING_GRAPH_ENABLED=false/.test(example) || /#\s*AUTONOMOUS_COMMERCE_REASONING_GRAPH_ENABLED=false/.test(example),
  "AUTONOMOUS_COMMERCE_REASONING_GRAPH_ENABLED documented OFF in .env.example"
);

check(
  "no_autonomous_agents_in_reasoning_graph",
  !/autonomousAgent|autonomousCommerceAgent|embeddingReasoningGraph/.test(route),
  "no autonomous agent patterns in reasoning graph route"
);

check(
  "unified_cognitive_governance_telemetry",
  route.includes("unifiedCognitiveGovernance") && route.includes("applyControlledUnifiedCognitiveGovernance"),
  "meta.unifiedCognitiveGovernance wired in search route"
);

check(
  "cognitive_governance_default_off_in_example",
  /COGNITIVE_GOVERNANCE_ENABLED=false/.test(example) || /#\s*COGNITIVE_GOVERNANCE_ENABLED=false/.test(example),
  "COGNITIVE_GOVERNANCE_ENABLED documented OFF in .env.example"
);

check(
  "no_autonomous_agents_in_cognitive_governance",
  !/autonomousAgent|autonomousGovernanceAgent|embeddingGovernance|memoryStorage/.test(route),
  "no autonomous agent or memory storage patterns in cognitive governance route"
);

check(
  "economic_world_simulation_telemetry",
  route.includes("economicWorldSimulation") && route.includes("applyControlledEconomicWorldSimulation"),
  "meta.economicWorldSimulation wired in search route"
);

check(
  "economic_simulation_default_off_in_example",
  /ECONOMIC_WORLD_SIMULATION_ENABLED=false/.test(example) || /#\s*ECONOMIC_WORLD_SIMULATION_ENABLED=false/.test(example),
  "ECONOMIC_WORLD_SIMULATION_ENABLED documented OFF in .env.example"
);

check(
  "no_autonomous_agents_in_economic_simulation",
  !/autonomousAgent|autonomousSimulationAgent|embeddingSimulation|memoryStorage/.test(route),
  "no autonomous agent or memory storage patterns in economic simulation route"
);

check(
  "no_hardcoded_prod_apply_true",
  !/INTENT_INTELLIGENCE_PROD_APPLY\s*=\s*["']true["']/.test(route),
  "no hardcoded production apply in route"
);

if (failed) process.exit(1);
console.log("\nIntent production CI guard: PASS");
