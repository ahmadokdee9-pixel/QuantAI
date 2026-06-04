#!/usr/bin/env node
/**
 * Production stabilization guards — mirrors productionStabilizationEnv.ts (no @/ imports).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function parseBool(raw) {
  if (raw == null || String(raw).trim() === "") return false;
  const v = String(raw).trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

function isBetaStabilizationEnabled(env) {
  const raw = env.QUANTAI_BETA_STABILIZATION;
  if (raw == null || String(raw).trim() === "") return env.NODE_ENV === "production";
  return parseBool(raw);
}

function applyBetaDiscoveryDefaults(env) {
  if (!isBetaStabilizationEnabled(env)) return;
  if (!env.MAX_DISCOVERY_QUERIES) env.MAX_DISCOVERY_QUERIES = "2";
  if (!env.DISCOVERY_TIMEOUT_MS) env.DISCOVERY_TIMEOUT_MS = "4500";
  if (!env.QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI) env.QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI = "true";
}

const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");

assert.ok(route.includes("isProductionShadowStackDisabled"), "shadow skip helper wired");
assert.ok(route.includes("skipShadowStack"), "shadow stack skip flag used");
assert.ok(route.includes("createGuestPipelineCache"), "guest pipeline cache wired");
assert.ok(route.includes("loadPipelineWithInflightDedupe"), "in-flight dedupe wired");
assert.ok(route.includes("applyBetaDiscoveryDefaults"), "discovery defaults at pipeline start");
assert.ok(route.includes("searchFallbackQueryCap"), "fallback query cap wired");
assert.ok(route.includes("markRateLimited429"), "429 telemetry hook wired");
assert.ok(route.includes("getGuestStaleTray"), "stale fallback serving wired");
assert.ok(route.includes("withTimeout"), "request timeout guard wired");
assert.ok(route.includes("isCircuitOpen"), "circuit-breaker guard wired");
assert.ok(route.includes("applyPhase92TrayIntegrity"), "phase 9.2 tray integrity wired");
assert.ok(route.includes("applyPhase93TrustDiscountHardening"), "phase 9.3 trust/discount wired");
assert.ok(route.includes("buildQueryIntelligence"), "phase 12.0 query intelligence bundle wired");
assert.ok(route.includes("queryIntelligence: phase94QueryIntelligence.meta"), "phase 9.4 meta exposed");
assert.ok(route.includes("shoppingBrain"), "phase 12.0 shopping brain meta exposed");
assert.ok(route.includes("buildMultiCategoryIntelligence"), "phase 12.1 multi-category intelligence wired");
assert.ok(route.includes("multiCategory"), "phase 12.1 multiCategory meta exposed");
assert.ok(route.includes("buildTasteIntelligence"), "phase 12.2 taste intelligence wired");
assert.ok(route.includes("tasteIntelligence"), "phase 12.2 tasteIntelligence meta exposed");
assert.ok(route.includes("buildLifestyleIntelligence"), "phase 12.3 lifestyle intelligence wired");
assert.ok(route.includes("lifestyleIntelligence"), "phase 12.3 lifestyleIntelligence meta exposed");
assert.ok(route.includes("buildContextIntelligence"), "phase 12.4 context intelligence wired");
assert.ok(route.includes("contextIntelligence"), "phase 12.4 contextIntelligence meta exposed");
assert.ok(route.includes("buildIntentConfidence"), "phase 12.5 intent confidence wired");
assert.ok(route.includes("intentConfidence"), "phase 12.5 intentConfidence meta exposed");
assert.ok(route.includes("buildMemoryPreparation"), "phase 12.6 memory preparation wired");
assert.ok(route.includes("memoryPreparation"), "phase 12.6 memoryPreparation meta exposed");
assert.ok(route.includes("buildUniversalBuyerModel"), "phase 12.7 universal buyer model wired");
assert.ok(route.includes("buyerModel"), "phase 12.7 buyerModel meta exposed");
assert.ok(route.includes("buildBuyerIntentVector"), "phase 12.8 buyer intent vector wired");
assert.ok(route.includes("buyerIntentVector"), "phase 12.8 buyerIntentVector meta exposed");
assert.ok(route.includes("buildShopperPsychology"), "phase 12.9 shopper psychology wired");
assert.ok(route.includes("shopperPsychology"), "phase 12.9 shopperPsychology meta exposed");
assert.ok(route.includes("buildDecisionReadiness"), "phase 12.10 decision readiness wired");
assert.ok(route.includes("decisionReadiness"), "phase 12.10 decisionReadiness meta exposed");
assert.ok(route.includes("applyDecisionReadinessToBrief"), "phase 12.10 decisionBrief enrichment wired");
assert.ok(route.includes("buildPurchaseFriction"), "phase 12.11 purchase friction wired");
assert.ok(route.includes("purchaseFriction"), "phase 12.11 purchaseFriction meta exposed");
assert.ok(route.includes("buildConversionProbability"), "phase 12.12 conversion probability wired");
assert.ok(route.includes("conversionProbability"), "phase 12.12 conversionProbability meta exposed");
assert.ok(route.includes("buildDealSensitivity"), "phase 12.13 deal sensitivity wired");
assert.ok(route.includes("dealSensitivity"), "phase 12.13 dealSensitivity meta exposed");
assert.ok(route.includes("buildBrandAffinity"), "phase 12.14 brand affinity wired");
assert.ok(route.includes("brandAffinity"), "phase 12.14 brandAffinity meta exposed");
assert.ok(route.includes("buildProductAttributeAffinity"), "phase 12.15 product attribute affinity wired");
assert.ok(route.includes("productAttributeAffinity"), "phase 12.15 productAttributeAffinity meta exposed");
assert.ok(route.includes("buildRetailerTrust"), "phase 12.16 retailer trust wired");
assert.ok(route.includes("retailerTrust"), "phase 12.16 retailerTrust meta exposed");
assert.ok(route.includes("buildReviewCredibility"), "phase 12.17 review credibility wired");
assert.ok(route.includes("reviewCredibility"), "phase 12.17 reviewCredibility meta exposed");
assert.ok(route.includes("buildRealDiscount"), "phase 12.18 real discount wired");
assert.ok(route.includes("realDiscount"), "phase 12.18 realDiscount meta exposed");
assert.ok(route.includes("buildValueIntelligence"), "phase 12.19 value intelligence wired");
assert.ok(route.includes("valueIntelligence"), "phase 12.19 valueIntelligence meta exposed");
assert.ok(route.includes("buildRankingPreparation"), "phase 12.20 ranking preparation wired");
assert.ok(route.includes("rankingPreparation"), "phase 12.20 rankingPreparation meta exposed");
assert.ok(route.includes("aggregateRankingSignals"), "phase 13.0 ranking signals aggregator wired");
assert.ok(route.includes("rankingSignals"), "phase 13.0 rankingSignals meta exposed");
assert.ok(route.includes("buildDeterministicRanking"), "phase 13.1 deterministic ranking wired");
assert.ok(route.includes("rankingEngine"), "phase 13.1 rankingEngine meta exposed");
assert.ok(route.includes("applyProductRanking"), "phase 13.2 product ranking application wired");
assert.ok(route.includes("productRanking"), "phase 13.2 productRanking meta exposed");
assert.ok(route.includes("prepareRankingExecution"), "phase 13.3 ranking execution preparation wired");
assert.ok(route.includes("rankingExecution"), "phase 13.3 rankingExecution meta exposed");
assert.ok(route.includes("executeControlledRanking"), "phase 13.4 controlled ranking execution wired");
assert.ok(route.includes("executedRanking"), "phase 13.4 executedRanking meta exposed");

const homePage = readFileSync(join(process.cwd(), "app", "page.tsx"), "utf8");
assert.ok(homePage.includes("applyRankedResultsDisplayBridge"), "phase 13.5 ranked results display bridge wired");
assert.ok(homePage.includes("executedRanking"), "phase 13.5 consumes executedRanking meta");

assert.ok(route.includes("activateQuantAIIntelligence"), "phase 13.6 intelligence activation wired");

assert.ok(route.includes("translateQuantAIIntelligence"), "phase 13.7 intelligence translation wired");

const cardBody = readFileSync(join(process.cwd(), "components", "search", "IntelligenceCardBody.tsx"), "utf8");
assert.ok(cardBody.includes("optimizeVerdictSurface"), "phase 13.8 verdict surface optimization wired");

assert.ok(cardBody.includes("activateMarketContext"), "phase 13.9 market context activation wired");
assert.ok(cardBody.includes("coherentDecision"), "phase 14.0 decision coherence wired");
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/decisionCoherenceActivation.ts"), "utf8").includes(
    "resolveInstitutionalVerdict"
  ),
  "phase 14.0 institutional verdict authority present"
);
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/rankingRationaleActivation.ts"), "utf8").includes(
    "activateRankingRationale"
  ),
  "phase 14.1 ranking rationale activation present"
);
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/commerceCoverageActivation.ts"), "utf8").includes(
    "buildCommerceCoverageTray"
  ),
  "phase 15.0 commerce coverage activation present"
);
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/discountTruthActivation.ts"), "utf8").includes(
    "activateDiscountTruth"
  ),
  "phase 16.0 discount truth activation present"
);
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/buyWaitActivation.ts"), "utf8").includes(
    "activateBuyWait"
  ),
  "phase 17.0 buy/wait activation present"
);
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/priceTargetActivation.ts"), "utf8").includes(
    "activatePriceTarget"
  ),
  "phase 18.0 price target activation present"
);
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/alternativeAdvantageActivation.ts"), "utf8").includes(
    "activateAlternativeAdvantage"
  ),
  "phase 19.0 alternative advantage activation present"
);
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/categoryIntelligenceActivation.ts"), "utf8").includes(
    "activateCategoryIntelligence"
  ),
  "phase 20.0 category intelligence activation present"
);

assert.ok(route.includes("applyPhase95CommerceMemory"), "phase 9.5 commerce memory wired");
assert.ok(route.includes("applyVerdictIntelligence"), "phase 10.0 verdict intelligence wired");
assert.ok(route.includes("applyExplainabilityIntelligence"), "phase 10.1 explainability wired");
assert.ok(route.includes("applyAlternativeIntelligence"), "phase 10.2 alternative intelligence wired");
assert.ok(route.includes("alternativeIntelligence: alternativeIntelligence.meta"), "phase 10.2 meta exposed");
assert.ok(route.includes("applyMarketContextIntelligence"), "phase 10.3 market context wired");
assert.ok(route.includes("marketContext: marketContextIntelligence.meta"), "phase 10.3 meta exposed");
assert.ok(route.includes("applyCompetitiveIntelligence"), "phase 10.4 competitive intelligence wired");
assert.ok(route.includes("competitiveIntelligence: competitiveIntelligence.meta"), "phase 10.4 meta exposed");
assert.ok(route.includes("applyConfidenceIntelligence"), "phase 10.5 confidence intelligence wired");
assert.ok(route.includes("confidenceIntelligence: confidenceIntelligence.meta"), "phase 10.5 meta exposed");
assert.ok(route.includes("applyIntentAlignmentIntelligence"), "phase 10.6 intent alignment wired");
assert.ok(route.includes("intentAlignment: intentAlignmentIntelligence.meta"), "phase 10.6 meta exposed");
assert.ok(route.includes("applyPersonalizationIntelligence"), "phase 10.7 personalization wired");
assert.ok(route.includes("personalization: personalizationIntelligence.meta"), "phase 10.7 meta exposed");
assert.ok(route.includes("applyRetailerIntelligence"), "phase 10.8 retailer intelligence wired");
assert.ok(route.includes("retailerIntelligence: retailerIntelligence.meta"), "phase 10.8 meta exposed");
assert.ok(route.includes("applyDealIntelligence"), "phase 10.9 deal intelligence wired");
assert.ok(route.includes("dealIntelligence: dealIntelligence.meta"), "phase 10.9 meta exposed");
assert.ok(route.includes("applyCommerceFusion"), "phase 11.0 commerce fusion wired");
assert.ok(route.includes("commerceFusion: commerceFusion.meta"), "phase 11.0 meta exposed");
assert.ok(route.includes("explainability: explainability.meta"), "phase 10.1 meta exposed");
assert.ok(route.includes("verdictIntelligence: verdictIntelligence.meta"), "phase 10.0 meta exposed");
assert.ok(route.includes("phase95CommerceMemory.meta"), "phase 9.5 meta exposed");

const env = { NODE_ENV: "production" };
applyBetaDiscoveryDefaults(env);
assert.equal(env.MAX_DISCOVERY_QUERIES, "2");
assert.equal(env.QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI, "true");

console.log("production-stabilization: ok");
