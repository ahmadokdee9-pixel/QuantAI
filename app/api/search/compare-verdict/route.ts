import OpenAI from "openai";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { enrichVerdictWithCompareIntelligence, heuristicCompareVerdict } from "@/lib/intelligence/compareVerdict";
import type { QuantProduct } from "@/lib/shoppingScore";
import { extractResponsesApiText } from "@/lib/openai-response-text";
import { parseJsonObject } from "@/lib/openai/safeJson";
import { compareVerdictRatelimit, enforceLimit } from "@/lib/rate-limit";
import { logDevError } from "@/lib/log/devLog";
import { recordCompareSession } from "@/lib/intelligence/persistence";
import { getStoreTrustScore } from "@/lib/retailTrust";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VerdictSchema = z.object({
  winnerTitle: z.string(),
  winnerLink: z.string(),
  verdict: z.string(),
  rationale: z.array(z.string()).max(8),
  confidence: z.enum(["high", "medium", "low"]),
  tradeoffAnalysis: z.array(z.string()).max(6).optional(),
  bestForPersonas: z
    .array(
      z.object({
        persona: z.string(),
        pick: z.string(),
        reason: z.string(),
      })
    )
    .max(5)
    .optional(),
  shortTermPick: z.string().max(220).optional(),
  longTermPick: z.string().max(220).optional(),
  verificationNote: z.string().max(280).optional(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return jsonErr(401, "Sign in to request a compare verdict.");
    }

    const limited = await enforceLimit(compareVerdictRatelimit, userId);
    if (!limited.ok) {
      return jsonErr(429, "Too many compare requests. Try again later.", { retryAfter: limited.retryAfter }, {
        headers: { "Retry-After": String(limited.retryAfter) },
      });
    }

    const body = (await req.json()) as { products?: QuantProduct[]; tray?: QuantProduct[] };
    const products = Array.isArray(body.products) ? body.products.slice(0, 3) : [];
    const tray = Array.isArray(body.tray) ? body.tray.slice(0, 48) : undefined;

    if (products.length === 0) {
      return jsonErr(400, "Send 1–3 products to compare.");
    }

    const fallback = heuristicCompareVerdict(products, tray);

    if (!process.env.OPENAI_API_KEY) {
      void recordCompareSession(userId, {
        at: new Date().toISOString(),
        links: products.map((p) => p.link),
        verdict: fallback,
        source: "heuristic",
      });
      return jsonOk({ verdict: fallback, source: "heuristic" });
    }

    const compact = products.map((p) => ({
      title: p.title,
      store: p.store,
      price: p.price,
      rating: p.rating,
      reviewsCount: p.reviewsCount,
      link: p.link,
      storeTrustPrior: getStoreTrustScore(p.store),
      qiComposite: p.qiComposite ?? null,
      qiReason: p.qiReason ?? null,
      qiVerdict: p.qiVerdict ?? null,
      qiPsychology: p.qiPsychology ?? null,
      commerce: p.qiCommerce
        ? {
            buyingVerdict: p.qiCommerce.buyingVerdict,
            valueForMoney: p.qiCommerce.valueForMoney,
            confidence: p.qiCommerce.confidence,
            retailerRiskScore: p.qiCommerce.retailerRiskScore ?? null,
            priceAnomaly: p.qiCommerce.priceAnomaly ?? null,
          }
        : null,
    }));

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `You are QuantAI Compare Intelligence — senior retail analyst. Tone: concise, professional, non-promotional, decisive.

Pick one winner from the JSON (exact winnerLink from input). Output JSON ONLY (no markdown):
- winnerTitle, winnerLink (exact)
- verdict: max 2 sentences — lead with the decision, name the key tradeoff, avoid filler ("robust", "comprehensive", "great option")
- rationale: 5–7 bullets, ≤140 chars each, non-repetitive phrasing; cover: composite edge, trust vs fulfillment, discount/listing hygiene, price vs #2, third-row hedge if present, shipping/returns if inferable from fields
- confidence: high|medium|low from score separation + review depth + commerce layer presence
- tradeoffAnalysis: 3–4 short strings; each must contrast two different tensions (not parallel restatements)
- bestForPersonas: 2–3 objects {persona,pick,reason} — persona snake_case; each reason must differ in structure from the others
- shortTermPick: one crisp sentence — price-led checkout bias
- longTermPick: one crisp sentence — risk-led ownership bias
- verificationNote: one sentence — concrete manual checks only

Never invent specs or prices. Use only fields present. Tie-break: qiComposite, then trust, rating, review depth, then value-for-money if present.

Products JSON:\n${JSON.stringify(compact, null, 2)}`,
    });

    const raw = extractResponsesApiText(response);
    const parsed = raw ? parseJsonObject(raw, VerdictSchema) : null;

    if (parsed && products.some((p) => p.link === parsed.winnerLink)) {
      const verdict = enrichVerdictWithCompareIntelligence(parsed, products, tray);
      void recordCompareSession(userId, {
        at: new Date().toISOString(),
        links: products.map((p) => p.link),
        verdict,
        source: "openai",
      });
      return jsonOk({ verdict, source: "openai" });
    }

    void recordCompareSession(userId, {
      at: new Date().toISOString(),
      links: products.map((p) => p.link),
      verdict: fallback,
      source: "heuristic_fallback",
    });
    return jsonOk({ verdict: fallback, source: "heuristic" });
  } catch (e) {
    logDevError("compare-verdict", e);
    return jsonErr(500, "Could not generate compare verdict.");
  }
}
