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
  buyingVerdict: z.string().max(380),
  pros: z.array(z.string()).max(4).default([]),
  cons: z.array(z.string()).max(4).default([]),
  risks: z.array(RiskSchema).max(5).default([]),
  valueForMoney: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  confidenceExplanation: z.string().max(280).optional(),
  signalGaps: z.array(z.string().max(140)).max(4).optional(),
  needsManualVerification: z.boolean().optional(),
  retailerRiskScore: z.number().min(0).max(100).optional(),
  retailerRiskNote: z.string().max(220).optional(),
  pricePercentile: z.number().min(0).max(100).optional(),
  priceFieldNote: z.string().max(220).optional(),
  priceAnomaly: z.enum(["none", "deep_discount", "premium_outlier", "suspicious_low"]).optional(),
  categoryLens: z.array(z.string().max(180)).max(4).optional(),
  inferredPersonas: z.array(z.string().max(28)).max(5).optional(),
  deliveryIntel: z.union([z.string().max(180), z.null()]).optional(),
  returnsIntel: z.union([z.string().max(180), z.null()]).optional(),
  trustWeightedNote: z.union([z.string().max(200), z.null()]).optional(),
  semanticVsQuery: z.union([z.string().max(180), z.null()]).optional(),
  comparedToFieldNote: z.union([z.string().max(180), z.null()]).optional(),
});

const BatchSchema = z.object({
  products: z.array(ProductRowSchema),
  fieldComparisonSummary: z.string().max(520).optional(),
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
    cat: p.qiCategory ?? "general",
    disc: p.qiSignals?.discountQuality ?? null,
    pp: p.qiSignals?.pricePerformance ?? null,
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
  const model = process.env.QUANTAI_COMMERCE_AI_MODEL?.trim() || "gpt-4.1-mini";
  const slice = products.slice(0, Math.min(maxItems, 14));
  const rows = slice.map(compactProduct);

  const controller = new AbortController();
  const timeoutMs = Math.min(8_000, Math.max(1_500, Number(process.env.QUANTAI_COMMERCE_AI_TIMEOUT_MS) || 3_500));
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await client.responses.create(
      {
        model,
        input: `You are QuantAI senior commerce analyst. Output ONE JSON object only (no markdown).

User query: ${query.slice(0, 200)}

Listings (abbreviated, feed-only — never invent specs, prices, or policies not implied):
${JSON.stringify(rows)}

Return JSON:
{"fieldComparisonSummary":"3-4 sentences: tray price spread, trust/review story, discount risk, category nuance vs query.",
"products":[
  {"id":number,
   "buyingVerdict":"2-4 sentences. Sound like Bloomberg for shopping: cite price vs peers in THIS tray (not global history), retailer trust prior, review volume confidence, delivery/returns uncertainty, long-term value vs discount risk, fake-urgency in availability text if present. Avoid hype; acknowledge uncertainty.",
   "pros":["max4"],"cons":["max4"],
   "risks":[{"code":"SNAKE","severity":"low|medium|high","label":"short"}],
   "valueForMoney":0-100,"confidence":0-100,
   "confidenceExplanation":"why this confidence level given sparse/conflicting signals",
   "signalGaps":["max4 short items: what is missing in feed"],
   "needsManualVerification":boolean,
   "retailerRiskScore":0-100 higher=riskier based on trust+discount+review inconsistency heuristics,
   "retailerRiskNote":"one line why risky or calm",
   "pricePercentile":0-100 within this tray price distribution,
   "priceFieldNote":"one line vs peers in tray",
   "priceAnomaly":"none|deep_discount|premium_outlier|suspicious_low",
   "categoryLens":["max4 checklist lines tailored to electronics/home/etc from title keywords—no fabricated RAM/CPU numbers"],
   "inferredPersonas":["budget_buyer|premium_buyer|gamer|student|office_setup|creator_pro|general pick subset"],
   "deliveryIntel":"string or null","returnsIntel":"string or null if unknown",
   "trustWeightedNote":"one line","semanticVsQuery":"intent match","comparedToFieldNote":"vs peers"}
]}

Rules: never invent exact return windows; null if unknown. Never invent prices beyond input. Use trust as prior not legal fact. JSON only. Keep risks ≤5 per row.`,
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
        confidenceExplanation: row.confidenceExplanation?.trim(),
        signalGaps: row.signalGaps?.map((x) => x.slice(0, 140)),
        needsManualVerification: row.needsManualVerification,
        retailerRiskScore: row.retailerRiskScore != null ? Math.round(row.retailerRiskScore) : undefined,
        retailerRiskNote: row.retailerRiskNote?.trim(),
        pricePercentile: row.pricePercentile != null ? Math.round(row.pricePercentile) : undefined,
        priceFieldNote: row.priceFieldNote?.trim(),
        priceAnomaly: row.priceAnomaly,
        categoryLens: row.categoryLens?.map((x) => x.slice(0, 180)),
        inferredPersonas: row.inferredPersonas?.map((x) => x.slice(0, 28)),
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
      "Compared listings on price position in-tray, retailer trust priors, review depth, and discount story visible in the feed.";

    return { byId, fieldComparisonSummary, modelId: model };
  } catch (e) {
    logDevError("commerce-ai-batch", e);
    return null;
  } finally {
    clearTimeout(t);
  }
}
