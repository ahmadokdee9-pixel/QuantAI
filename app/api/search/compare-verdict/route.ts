import OpenAI from "openai";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { heuristicCompareVerdict } from "@/lib/intelligence/compareVerdict";
import type { QuantProduct } from "@/lib/shoppingScore";
import { extractResponsesApiText } from "@/lib/openai-response-text";
import { parseJsonObject } from "@/lib/openai/safeJson";
import { compareVerdictRatelimit, enforceLimit } from "@/lib/rate-limit";
import { logDevError } from "@/lib/log/devLog";
import { recordCompareSession } from "@/lib/intelligence/persistence";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VerdictSchema = z.object({
  winnerTitle: z.string(),
  winnerLink: z.string(),
  verdict: z.string(),
  rationale: z.array(z.string()).max(6),
  confidence: z.enum(["high", "medium", "low"]),
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

    const body = (await req.json()) as { products?: QuantProduct[] };
    const products = Array.isArray(body.products) ? body.products.slice(0, 3) : [];

    if (products.length === 0) {
      return jsonErr(400, "Send 1–3 products to compare.");
    }

    const fallback = heuristicCompareVerdict(products);

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
      qiComposite: p.qiComposite ?? null,
      qiReason: p.qiReason ?? null,
      qiVerdict: p.qiVerdict ?? null,
      qiPsychology: p.qiPsychology ?? null,
    }));

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `You are QuantAI compare mode—analytical, concise, non-salesy.

Pick one winner from the JSON (exact winnerLink). Output JSON ONLY (no markdown) with:
- winnerTitle, winnerLink (exact from input)
- verdict: max 2 tight sentences—WHY that row wins on balance, not hype
- rationale: 4–6 bullets, each under 140 chars, covering in order when possible:
  (1) decisive QI / trust / rating edge,
  (2) explicit tradeoff vs runner-up (price vs trust vs reviews),
  (3) hidden risk on the winner,
  (4) opportunity cost of choosing #2 instead,
  (5) optional third-row angle if useful
- confidence: high|medium|low from signal separation + data completeness

Tie-break: qiComposite if present, else trust, rating, review depth, then price-to-value. Never invent specs or prices.

Products JSON:\n${JSON.stringify(compact, null, 2)}`,
    });

    const raw = extractResponsesApiText(response);
    const parsed = raw ? parseJsonObject(raw, VerdictSchema) : null;

    if (parsed && products.some((p) => p.link === parsed.winnerLink)) {
      void recordCompareSession(userId, {
        at: new Date().toISOString(),
        links: products.map((p) => p.link),
        verdict: parsed,
        source: "openai",
      });
      return jsonOk({ verdict: parsed, source: "openai" });
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
