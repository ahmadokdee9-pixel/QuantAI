/**
 * Production beta stabilization env/helpers — no Next.js imports (testable in Node).
 */

import { readIdentityFoundationFlags } from "@/lib/intelligence/identity/flags";
import { readTrustEngineFlags } from "@/lib/intelligence/trust/flags";
import { readCommerceMemoryFlags } from "@/lib/intelligence/memory/flags";
import { readRecommendationCognitionFlags } from "@/lib/intelligence/recommendationCognition/flags";
import { readAutonomousCommerceOsFlags } from "@/lib/intelligence/autonomousCommerce/flags";
import { readControlledActivationFlags } from "@/lib/governance/controlledActivation/flags";
import { readCommerceEvolutionFlags } from "@/lib/intelligence/commerceEvolution/flags";
import { readCommerceBrainFlags } from "@/lib/intelligence/commerceBrain/flags";
import { readLiveCommerceSignalsFlags } from "@/lib/intelligence/liveAdaptiveCommerceSignals/flags";
import { readAutonomousCommerceIdentityFlags } from "@/lib/intelligence/autonomousCommerceIdentity/flags";
import { readPredictiveCommerceIntentFlags } from "@/lib/intelligence/predictiveCommerceIntent/flags";
import { readAutonomousCommerceStrategyFlags } from "@/lib/intelligence/autonomousCommerceStrategy/flags";
import { readUniversalCommerceIntelligenceFlags } from "@/lib/intelligence/universalCommerceIntelligence/flags";
import { readEmotionalCommerceIntelligenceFlags } from "@/lib/intelligence/emotionalCommerceIntelligence/flags";
import { readAutonomousCommerceEvolutionFlags } from "@/lib/intelligence/autonomousCommerceEvolution/flags";

function parseBool(raw: string | undefined): boolean {
  if (raw == null || raw.trim() === "") return false;
  const v = raw.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

/** True when beta stabilization mode is explicitly on (default on in production). */
export function isBetaStabilizationEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.QUANTAI_BETA_STABILIZATION;
  if (raw == null || raw.trim() === "") {
    return env.NODE_ENV === "production";
  }
  return parseBool(raw);
}

function phaseEnabled(read: (e?: NodeJS.ProcessEnv) => { enabled: boolean }): boolean {
  return read(process.env).enabled;
}

/** All post-stack shadow intelligence layers disabled — safe to skip meta chain. */
export function isProductionShadowStackDisabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (!isBetaStabilizationEnabled(env)) return false;
  return (
    !phaseEnabled(readIdentityFoundationFlags) &&
    !phaseEnabled(readTrustEngineFlags) &&
    !phaseEnabled(readCommerceMemoryFlags) &&
    !phaseEnabled(readRecommendationCognitionFlags) &&
    !phaseEnabled(readAutonomousCommerceOsFlags) &&
    !phaseEnabled(readControlledActivationFlags) &&
    !phaseEnabled(readCommerceEvolutionFlags) &&
    !phaseEnabled(readCommerceBrainFlags) &&
    !phaseEnabled(readLiveCommerceSignalsFlags) &&
    !phaseEnabled(readAutonomousCommerceIdentityFlags) &&
    !phaseEnabled(readPredictiveCommerceIntentFlags) &&
    !phaseEnabled(readAutonomousCommerceStrategyFlags) &&
    !phaseEnabled(readUniversalCommerceIntelligenceFlags) &&
    !phaseEnabled(readEmotionalCommerceIntelligenceFlags) &&
    !phaseEnabled(readAutonomousCommerceEvolutionFlags)
  );
}

export function useHeuristicCommerceAiOnly(env: NodeJS.ProcessEnv = process.env): boolean {
  return isBetaStabilizationEnabled(env) && parseBool(env.QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI ?? "true");
}

export function guestCacheRevalidateSeconds(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.SEARCH_GUEST_CACHE_SECONDS ?? "300");
  return Number.isFinite(raw) ? Math.min(900, Math.max(60, Math.round(raw))) : 300;
}

export function authCacheRevalidateSeconds(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.SEARCH_AUTH_CACHE_SECONDS ?? "120");
  return Number.isFinite(raw) ? Math.min(600, Math.max(30, Math.round(raw))) : 120;
}

export function serpApiTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
  const betaDefault = isBetaStabilizationEnabled(env) ? "9000" : "12000";
  const raw = Number(env.SEARCH_SERPAPI_TIMEOUT_MS ?? betaDefault);
  return Number.isFinite(raw) ? Math.min(20000, Math.max(5000, Math.round(raw))) : Number(betaDefault);
}

export function serpApiMaxRetries(env: NodeJS.ProcessEnv = process.env): number {
  if (!isBetaStabilizationEnabled(env)) return 2;
  const raw = Number(env.SEARCH_SERPAPI_RETRIES ?? "1");
  return Number.isFinite(raw) ? Math.min(2, Math.max(0, Math.round(raw))) : 1;
}

export function searchFallbackQueryCap(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.QUANTAI_SEARCH_MAX_FALLBACK_QUERIES ?? "1");
  return Number.isFinite(raw) ? Math.min(4, Math.max(0, Math.round(raw))) : 1;
}

export function searchPrimaryMinProducts(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.QUANTAI_SEARCH_PRIMARY_MIN_PRODUCTS ?? "6");
  return Number.isFinite(raw) ? Math.min(12, Math.max(4, Math.round(raw))) : 6;
}

/** Apply conservative discovery env defaults when stabilization on (no-op if explicitly set). */
export function applyBetaDiscoveryDefaults(env: NodeJS.ProcessEnv = process.env): void {
  if (!isBetaStabilizationEnabled(env)) return;
  if (!env.MAX_DISCOVERY_QUERIES) env.MAX_DISCOVERY_QUERIES = "2";
  if (!env.DISCOVERY_TIMEOUT_MS) env.DISCOVERY_TIMEOUT_MS = "3000";
  if (!env.MAX_DISCOVERY_ROWS) env.MAX_DISCOVERY_ROWS = "24";
  if (!env.QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI) env.QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI = "true";
  if (!env.QUANTAI_SEARCH_MAX_FALLBACK_QUERIES) env.QUANTAI_SEARCH_MAX_FALLBACK_QUERIES = "1";
  if (!env.QUANTAI_SEARCH_PRIMARY_MIN_PRODUCTS) env.QUANTAI_SEARCH_PRIMARY_MIN_PRODUCTS = "6";
  if (!env.SEARCH_REQUEST_TIMEOUT_MS) env.SEARCH_REQUEST_TIMEOUT_MS = "10000";
  if (!env.SEARCH_SERPAPI_TIMEOUT_MS) env.SEARCH_SERPAPI_TIMEOUT_MS = "9000";
  if (!env.QUANTAI_SEARCH_STALE_PREFER_MS) env.QUANTAI_SEARCH_STALE_PREFER_MS = "3500";
}

/** When live pipeline exceeds this ms and a stale tray exists, serve stale first (guest recovery). */
export function searchStalePreferMs(env: NodeJS.ProcessEnv = process.env): number {
  if (!isBetaStabilizationEnabled(env)) return 0;
  const raw = Number(env.QUANTAI_SEARCH_STALE_PREFER_MS ?? "3500");
  return Number.isFinite(raw) ? Math.min(8000, Math.max(0, Math.round(raw))) : 3500;
}

/** Prefer stale/cached tray when live SerpAPI enrichment is slow — ranking preserved on stale snapshot. */
export async function racePipelineWithStalePrefer(
  liveLoader: () => Promise<SearchPipelineTray>,
  staleTray: SearchPipelineTray | null | undefined
): Promise<{ tray: SearchPipelineTray; servedStale: boolean }> {
  const preferMs = searchStalePreferMs();
  const stale = staleTray?.products.length ? staleTray : null;
  if (preferMs <= 0 || !stale) {
    return { tray: await liveLoader(), servedStale: false };
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (tray: SearchPipelineTray, servedStale: boolean) => {
      if (settled) return;
      settled = true;
      resolve({ tray, servedStale });
    };
    const timer = setTimeout(() => finish(stale, true), preferMs);
    liveLoader()
      .then((tray) => {
        clearTimeout(timer);
        finish(tray, false);
      })
      .catch((err) => {
        clearTimeout(timer);
        if (!settled) reject(err);
      });
  });
}

export type SearchPipelineTray = {
  products: import("@/lib/shoppingScore").QuantProduct[];
  dealClusters: import("@/lib/deals/types").DealClusterDTO[];
  searchIntelligence: import("@/lib/intelligence/searchDecisionTypes").SearchIntelligenceDTO | null;
  commerceMeta: import("@/lib/intelligence/commerceAnalysisTypes").SearchCommerceAIMeta;
  liveDiscovery: import("@/lib/intelligence/liveCommerceDiscovery").LiveCommerceDiscoveryMeta;
  canonicalQuery: import("@/lib/search/canonicalQuery").CanonicalQueryContract;
};

const inflightPipelines = new Map<string, Promise<SearchPipelineTray>>();

export async function loadPipelineWithInflightDedupe(
  cacheKey: string,
  loader: () => Promise<SearchPipelineTray>
): Promise<SearchPipelineTray> {
  const existing = inflightPipelines.get(cacheKey);
  if (existing) return existing;
  const promise = loader().finally(() => {
    inflightPipelines.delete(cacheKey);
  });
  inflightPipelines.set(cacheKey, promise);
  return promise;
}

