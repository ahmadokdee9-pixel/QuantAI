import OpenAI from "openai";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { extractResponsesApiText } from "@/lib/openai-response-text";
import { parseJsonObject } from "@/lib/openai/safeJson";
import { logDevError } from "@/lib/log/devLog";
import { aiChatRatelimit, enforceLimit } from "@/lib/rate-limit";

function openAiClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  return apiKey ? new OpenAI({ apiKey }) : null;
}

const ChatStructuredSchema = z.object({
  reply: z.string(),
  highlights: z.array(z.string()).max(5).optional(),
  caution: z.string().optional(),
  productSummary: z.string().max(400).optional(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return jsonErr(401, "Sign in to use the AI assistant.", { reply: "" });
    }

    const limited = await enforceLimit(aiChatRatelimit, userId);
    if (!limited.ok) {
      return jsonErr(
        429,
        "Too many AI requests. Try again later.",
        { reply: "", retryAfter: limited.retryAfter },
        { headers: { "Retry-After": String(limited.retryAfter) } }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return jsonErr(503, "AI assistant is not configured.", { reply: "" });
    }

    const { question, products } = await req.json();

    const response = await openAiClient()!.responses.create({
      model: "gpt-4.1-mini",
      input: `You are QuantAI, a disciplined shopping analyst. Be concise and practical.

User question:
${String(question ?? "")}

Products (JSON, includes qiComposite/qiReason when available):
${JSON.stringify(products ?? [], null, 2)}

Respond with JSON ONLY (no markdown) using this shape:
{"reply":"2-4 sentences","highlights":["optional bullet","max 5"],"caution":"one short risk line if relevant","productSummary":"one dense sentence summarizing the best-fit listing"}

Rules: never invent prices; if data is missing, say so. Prefer listings with higher qiComposite when present; otherwise weigh price, rating, reviews, retailer trust.`,
    });

    const raw = extractResponsesApiText(response);
    const parsed = raw ? parseJsonObject(raw, ChatStructuredSchema) : null;

    if (parsed?.reply?.trim()) {
      return jsonOk({
        reply: parsed.reply.trim(),
        highlights: parsed.highlights ?? [],
        caution: parsed.caution ?? "",
        productSummary: parsed.productSummary ?? "",
      });
    }

    const reply =
      raw?.trim() ||
      "QuantAI could not produce a structured reply for this request.";

    return jsonOk({ reply, highlights: [] as string[], caution: "", productSummary: "" });
  } catch (error) {
    logDevError("ai-chat", error);
    return jsonErr(500, "QuantAI could not analyze this request.", {
      reply: "",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
