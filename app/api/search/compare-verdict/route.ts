import OpenAI from "openai";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { heuristicCompareVerdict } from "@/lib/intelligence/compareVerdict";
import type { QuantProduct } from "@/lib/shoppingScore";
import { extractResponsesApiText } from "@/lib/openai-response-text";
import { parseJsonObject } from "@/lib/openai/safeJson";
import { compareVerdictRatelimit, enforceLimit } from "@/lib/rate-limit";

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
      return NextResponse.json({ error: "Sign in to request a compare verdict." }, { status: 401 });
    }

    const limited = await enforceLimit(compareVerdictRatelimit, userId);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many compare requests. Try again later.", retryAfter: limited.retryAfter },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
      );
    }

    const body = (await req.json()) as { products?: QuantProduct[] };
    const products = Array.isArray(body.products) ? body.products.slice(0, 3) : [];

    if (products.length === 0) {
      return NextResponse.json({ error: "Send 1–3 products to compare." }, { status: 400 });
    }

    const fallback = heuristicCompareVerdict(products);

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ verdict: fallback, source: "heuristic" });
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
      return NextResponse.json({ verdict: parsed, source: "openai" });
    }

    return NextResponse.json({ verdict: fallback, source: "heuristic" });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not generate compare verdict." },
      { status: 500 }
    );
  }
}
