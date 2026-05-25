/**
 * Phase 15 — Autonomous strategy kernel.
 */

import type { AutonomousCommerceStrategyInput, StrategyAxisId } from "../types";
import {
  EMPTY_COMMERCE_SESSION_MEMORY,
  type CommerceSessionMemoryV1,
} from "@/lib/intelligence/commerceSessionMemory";
import { balanceTrustValueRisk } from "../balance/trustValueRiskBalancing";
import { minimizeCommerceRegret } from "../regret/regretMinimizationEngine";
import { orchestrateStrategicTiming } from "../timing/strategicTimingOrchestrator";
import { planReplacementTiming } from "../timing/replacementTimingStrategy";
import { planUpgradePath } from "../timing/upgradePathStrategy";
import { buildAffordabilityStrategy } from "../affordability/affordabilityAwareStrategy";
import { weightEconomicClimateStrategy } from "../economic/economicClimateStrategyWeighting";
import { arbitrateMerchantTrust } from "../merchant/merchantTrustArbitration";
import { buildVolatilityStrategy } from "../volatility/volatilityAwareDecisionStrategy";
import { buildLifecycleStrategy } from "../lifecycle/lifecycleAwareBuyingStrategy";
import { reasonPremiumVsValue } from "../premium/premiumVsValueReasoning";
import { adaptRegionalStrategy } from "../regional/regionalStrategyAdaptation";
import { balanceCommercePressure } from "../pressure/commercePressureBalancing";
import { optimizeValueLayer } from "../value/valueOptimizationLayer";
import { arbitrateTrustRisk } from "../arbitration/trustRiskArbitrationEngine";
import {
  fuseDeterministicStrategySignals,
  computeFusedStrategyScore,
  applyTrustToStrategySignals,
} from "../fusion/deterministicStrategyFusionEngine";
import { buildCommerceStrategyGraph } from "../graph/commerceStrategyGraph";
import { buildReplaySafeStrategyMemory } from "../memory/replaySafeStrategyMemory";
import {
  selectPrimaryStrategy,
  scoreStrategyConfidence,
} from "../strategist/boundedCommerceStrategist";
import { arbitrateStrategyGovernance } from "../governance/strategyArbitration";
import { buildShadowStrategyCandidates } from "../candidates/shadowStrategyCandidates";
import { computeBoundedStrategyInfluence } from "../influence/boundedStrategyInfluence";
import { buildStrategyExplainability } from "../explain/strategyExplainability";

export type AutonomousStrategyKernelResult = Omit<
  import("../types").AutonomousCommerceStrategyResult,
  "products" | "meta" | "replayFingerprint"
> & {
  strategyConfidence01: number;
  governanceAllowed: boolean;
  primaryStrategy: string;
};

export function runAutonomousStrategyKernel(
  input: AutonomousCommerceStrategyInput,
  sessionMemory: CommerceSessionMemoryV1,
  maxInfluence01: number
): AutonomousStrategyKernelResult {
  const trustValueRisk = balanceTrustValueRisk({
    trust: input.trust,
    commerceIdentity: input.commerceIdentity,
  });
  const timing = orchestrateStrategicTiming(input.predictiveIntent);
  const replacement = planReplacementTiming(input.predictiveIntent);
  const upgrade = planUpgradePath(input.predictiveIntent);
  const affordability = buildAffordabilityStrategy(input.commerceOs);
  const economicWeight = weightEconomicClimateStrategy(input.commerceOs);
  const merchantArbitration = arbitrateMerchantTrust({
    products: input.products,
    trust: input.trust,
  });
  const volatility = buildVolatilityStrategy(input.liveSignals);
  const lifecycle = buildLifecycleStrategy({
    evolution: input.evolution,
    commerceIdentity: input.commerceIdentity,
  });
  const premiumValue = reasonPremiumVsValue(input.commerceIdentity);
  const regional = adaptRegionalStrategy(input.commerceIdentity);
  const pressure = balanceCommercePressure(input.liveSignals);

  const valueOptimized = optimizeValueLayer({
    value01: trustValueRisk.value01,
    affordabilityFit01: affordability.fit01,
    premiumBias01: premiumValue.premiumBias01,
  });
  void valueOptimized;

  const regret = minimizeCommerceRegret({
    risk01: trustValueRisk.risk01,
    volatilityStrategy01: volatility.strategy01,
    trust01: trustValueRisk.trust01,
  });

  void arbitrateTrustRisk({
    trust01: trustValueRisk.trust01,
    risk01: trustValueRisk.risk01,
    balance01: trustValueRisk.balance01,
  });

  const rawAxes: { axisId: StrategyAxisId; strength01: number }[] = [
    { axisId: "trust_value_risk", strength01: trustValueRisk.balance01 },
    { axisId: "timing", strength01: timing.timingScore01 },
    { axisId: "replacement", strength01: replacement.score01 },
    { axisId: "upgrade", strength01: upgrade.score01 },
    { axisId: "affordability", strength01: affordability.fit01 },
    { axisId: "economic", strength01: economicWeight.weight01 },
    { axisId: "merchant", strength01: merchantArbitration.score01 },
    { axisId: "volatility", strength01: volatility.strategy01 },
    { axisId: "lifecycle", strength01: lifecycle.strategy01 },
    { axisId: "premium_value", strength01: premiumValue.premiumBias01 },
    { axisId: "regional", strength01: regional.adaptation01 },
    { axisId: "pressure", strength01: pressure.balance01 },
    {
      axisId: "confidence",
      strength01: input.predictiveIntent?.meta.predictionConfidence01 ?? 0.3,
    },
  ];

  let fusedSignals = fuseDeterministicStrategySignals(rawAxes);
  fusedSignals = applyTrustToStrategySignals(fusedSignals, trustValueRisk.trust01);
  const fusedScore = computeFusedStrategyScore(fusedSignals);

  const strategyGraph = buildCommerceStrategyGraph(
    rawAxes.map((a) => ({ axis: a.axisId, score01: a.strength01 }))
  );

  const primaryStrategy = selectPrimaryStrategy(fusedSignals);
  void buildReplaySafeStrategyMemory({ query: input.query, primaryStrategy });
  void sessionMemory;

  const governanceProbe = arbitrateStrategyGovernance(input, 0, regret.regret01);
  const strategyConfidence01 = scoreStrategyConfidence({
    fusedScore01: fusedScore,
    balance01: trustValueRisk.balance01,
    regretMinimized: regret.minimized,
    governanceAllowed: governanceProbe.allowed,
  });
  const governance = arbitrateStrategyGovernance(
    input,
    strategyConfidence01,
    regret.regret01
  );

  const shadowCandidates = buildShadowStrategyCandidates({
    signals: fusedSignals,
    governance,
    maxInfluence01,
  });
  void computeBoundedStrategyInfluence(fusedSignals, maxInfluence01, governance.allowed);

  const traceExamples = fusedSignals.map((s) => `${s.axisId}:${s.trustAdjusted01}`);
  const explain = buildStrategyExplainability({
    primaryStrategy,
    timingLabel: timing.label,
    trustVerdict: merchantArbitration.verdict,
    regretMinimized: regret.minimized,
    governance,
    fusedCount: fusedSignals.length,
    traceExamples,
  });

  return {
    trustValueRisk,
    timing,
    replacement,
    upgrade,
    affordability,
    economicWeight,
    merchantArbitration,
    volatility,
    lifecycle,
    premiumValue,
    regional,
    regret,
    pressure,
    fusedSignals,
    strategyGraph,
    shadowCandidates,
    explain,
    strategyConfidence01,
    governanceAllowed: governance.allowed,
    primaryStrategy,
  };
}

export { EMPTY_COMMERCE_SESSION_MEMORY };
