import OpenAI from "openai";
import { z } from "zod";
import type { ProductCommerceAI } from "@/lib/intelligence/commerceAnalysisTypes";
import { logDevError } from "@/lib/log/devLog";
import { extractResponsesApiText } from "@/lib/openai-response-text";
import { parseJsonObject } from "@/lib/openai/safeJson";
import { getStoreTrustScore } from "@/lib/retailTrust";
import type { QuantProduct } from "@/lib/shoppingScore";

const RiskSchema = z.object({
  code: z.string().max(40),
  severity: z.enum(["low", "medium", "high"]),
  label: z.string().max(200),
});

const ProductRowSchema = z.object({
  id: z.number(),
  buyingVerdict: z.string().max(260),
  pros: z.array(z.string()).max(4).default([]),
  cons: z.array(z.string()).max(4).default([]),
  risks: z.array(RiskSchema).max(5).default([]),
  valueForMoney: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  deliveryIntel: z.union([z.string().max(180), z.null()]).optional(),
  returnsIntel: z.union([z.string().max(180), z.null()]).optional(),
  trustWeightedNote: z.union([z.string().max(200), z.null()]).optional(),
  semanticVsQuery: z.union([z.string().max(180), z.null()]).optional(),
  comparedToFieldNote: z.union([z.string().max(180), z.null()]).optional(),
});

const BatchSchema = z.object({
  products: z.array(ProductRowSchema),
  fieldComparisonSummary: z.string().max(420).optional(),
});

function compactProduct(p: QuantProduct) {
  return {
    id: p.id,
    t: p.title.slice(0, 120),
    s: p.store.slice(0, 48),
    p: p.price,
    r: p.rating,
    n: p.reviewsCount,
    sh: (p.shipping ?? "").slice(0, 80),
    av: (p.availability ?? "").slice(0, 60),
    tr: p.priceTrend,
    trust: getStoreTrustScore(p.store),
    qc: Math.round(p.qiComposite ?? 0),
    ex: (p.extensions ?? []).slice(0, 3),
  };
}

/**
 * One batched Responses call for up to `maxItems` listings — compact JSON out.
 * Returns null on any failure (caller uses heuristics).
 */
export async function runOpenAiCommerceBatch(
  query: string,
  products: QuantProduct[],
  maxItems: number
): Promise<{
  byId: Map<number, ProductCommerceAI>;
  fieldComparisonSummary: string;
  modelId: string;
} | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || products.length === 0) return null;

  const client = new OpenAI({ apiKey });
  const model =
    process.env.QUANTAI_COMMERCE_AI_MODEL?.trim() || "gpt-4.1-mini";
  const slice = products.slice(0, Math.min(maxItems, 14));
  const rows = slice.map(compactProduct);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 14_000);

  try {
    const response = await client.responses.create(
      {
        model,
        input: `You are QuantAI commerce analysis. Output ONE JSON object only (no markdown).

User query: ${query.slice(0, 200)}

Listings (abbreviated):
${JSON.stringify(rows)}

Return JSON shape:
{"fieldComparisonSummary":"1-2 sentences comparing these listings vs the query and each other (price/trust/reviews).",
"products":[
  {"id":number,"buyingVerdict":"max 220 chars: buy/caution/avoid style",
   "pros":["max4 short bullets"],"cons":["max4 short bullets"],
   "risks":[{"code":"SNAKE","severity":"low|medium|high","label":"short"}],
   "valueForMoney":0-100,"confidence":0-100 model certainty,
   "deliveryIntel":"string or null","returnsIntel":"string or null if unknown",
   "trustWeightedNote":"one line using trust field","semanticVsQuery":"match to query intent",
   "comparedToFieldNote":"one line vs other rows in array"}
]}

Rules: never invent exact return windows; use null if unknown. Never invent prices. Use trust field as prior not fact. Keep risks ≤5 total per row. JSON only.`,
      },
      { signal: controller.signal }
    );

    const raw = extractResponsesApiText(response);
    const parsed = raw ? parseJsonObject(raw, BatchSchema) : null;
    if (!parsed?.products?.length) return null;

    const byId = new Map<number, ProductCommerceAI>();
    for (const row of parsed.products) {
      byId.set(row.id, {
        buyingVerdict: row.buyingVerdict.trim(),
        pros: row.pros.map((x) => x.slice(0, 200)),
        cons: row.cons.map((x) => x.slice(0, 200)),
        risks: row.risks.map((r) => ({
          code: r.code,
          severity: r.severity,
          label: r.label.slice(0, 200),
        })),
        valueForMoney: Math.round(row.valueForMoney),
        confidence: Math.round(row.confidence),
        deliveryIntel: row.deliveryIntel ?? null,
        returnsIntel: row.returnsIntel ?? null,
        trustWeightedNote: row.trustWeightedNote ?? null,
        semanticVsQuery: row.semanticVsQuery ?? null,
        comparedToFieldNote: row.comparedToFieldNote ?? null,
        modelId: model,
        source: "openai",
      });
    }

    const fieldComparisonSummary =
      (parsed.fieldComparisonSummary ?? "").trim() ||
      "Compared listings on price, trust prior, and review depth visible in the feed.";

    return { byId, fieldComparisonSummary, modelId: model };
  } catch (e) {
    logDevError("commerce-ai-batch", e);
    return null;
  } finally {
    clearTimeout(t);
  }
}
