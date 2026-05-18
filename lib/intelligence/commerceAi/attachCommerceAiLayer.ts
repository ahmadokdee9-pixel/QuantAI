/**
 * Pluggable commerce analysis entry — today OpenAI batch + heuristics; swap `runOpenAiCommerceBatch` later for multi-model.
 */
import type { ProductCommerceAI, SearchCommerceAIMeta } from "@/lib/intelligence/commerceAnalysisTypes";
import {
  commerceAiCacheKey,
  getCommerceAiCache,
  setCommerceAiCache,
} from "@/lib/intelligence/commerceAi/commerceAiCache";
import {
  heuristicCommerceForProduct,
  heuristicFieldComparisonSummary,
} from "@/lib/intelligence/commerceAi/heuristicCommerce";
import { resolveCommerceAiEngine } from "@/lib/intelligence/commerceAi/commerceAiEngine";
import { runOpenAiCommerceBatch } from "@/lib/intelligence/commerceAi/openaiCommerceBatch";
import type { QuantProduct } from "@/lib/shoppingScore";

const AI_TOP_N = 8;

function fingerprints(products: QuantProduct[]): string[] {
  return products.map((p) => `${p.id}:${(p.link ?? "").slice(0, 64)}:${p.price}`);
}

export async function attachCommerceAiLayer(
  products: QuantProduct[],
  query: string
): Promise<{ products: QuantProduct[]; commerceMeta: SearchCommerceAIMeta }> {
  if (!products.length) {
    return {
      products,
      commerceMeta: {
        fieldComparisonSummary: "",
        source: "heuristic",
        cached: false,
        modelId: "none",
      },
    };
  }

  const key = commerceAiCacheKey(query, fingerprints(products));
  const cached = getCommerceAiCache(key);
  if (cached) {
    const merged = products.map((p) => ({
      ...p,
      qiCommerce: cached.byProductId.get(p.id) ?? heuristicCommerceForProduct(p, query, products),
    }));
    return {
      products: merged,
      commerceMeta: {
        fieldComparisonSummary: cached.fieldComparisonSummary,
        source: "cache",
        cached: true,
        modelId: cached.modelId,
      },
    };
  }

  const ordered = [...products].sort((a, b) => (a.qiRank ?? 99) - (b.qiRank ?? 99));
  const forAi = ordered.slice(0, AI_TOP_N);

  const engine = resolveCommerceAiEngine();
  const ai =
    engine === "openai-responses"
      ? await runOpenAiCommerceBatch(query, forAi, AI_TOP_N)
      : null;

  const byId = new Map<number, ProductCommerceAI>();
  let fieldSummary = heuristicFieldComparisonSummary(products, query);
  let source: SearchCommerceAIMeta["source"] = "heuristic";
  let modelId = "heuristic-v1";

  if (ai && ai.byId.size > 0) {
    source = "openai";
    modelId = ai.modelId;
    fieldSummary = ai.fieldComparisonSummary;
    for (const [id, row] of ai.byId) {
      byId.set(id, row);
    }
  }

  const merged: QuantProduct[] = products.map((p) => {
    const h = heuristicCommerceForProduct(p, query, products);
    const fromAi = byId.get(p.id);
    if (!fromAi) {
      return { ...p, qiCommerce: h };
    }
    const qiCommerce: ProductCommerceAI = {
      ...h,
      ...fromAi,
      confidenceExplanation: fromAi.confidenceExplanation ?? h.confidenceExplanation,
      signalGaps: fromAi.signalGaps?.length ? fromAi.signalGaps : h.signalGaps,
      needsManualVerification: fromAi.needsManualVerification ?? h.needsManualVerification,
      retailerRiskScore: fromAi.retailerRiskScore ?? h.retailerRiskScore,
      retailerRiskNote: fromAi.retailerRiskNote ?? h.retailerRiskNote,
      pricePercentile: fromAi.pricePercentile ?? h.pricePercentile,
      priceFieldNote: fromAi.priceFieldNote ?? h.priceFieldNote,
      priceAnomaly: fromAi.priceAnomaly ?? h.priceAnomaly,
      categoryLens: fromAi.categoryLens?.length ? fromAi.categoryLens : h.categoryLens,
      inferredPersonas: fromAi.inferredPersonas?.length ? fromAi.inferredPersonas : h.inferredPersonas,
    };
    return { ...p, qiCommerce };
  });

  const batchForCache = new Map<number, ProductCommerceAI>();
  for (const p of merged) {
    if (p.qiCommerce) batchForCache.set(p.id, p.qiCommerce);
  }
  setCommerceAiCache(key, {
    byProductId: batchForCache,
    fieldComparisonSummary: fieldSummary,
    modelId,
  });

  return {
    products: merged,
    commerceMeta: {
      fieldComparisonSummary: fieldSummary,
      source,
      cached: false,
      modelId,
    },
  };
}
