import OpenAI from "openai";
import type { CopilotSessionPayload } from "@/lib/copilot/sessionTypes";
import { CopilotStructuredSchema, type CopilotStructuredResponse } from "@/lib/copilot/structuredResponse";
import { logDevError } from "@/lib/log/devLog";
import { extractResponsesApiText } from "@/lib/openai-response-text";
import { parseJsonObject } from "@/lib/openai/safeJson";

function truncateSession(s: CopilotSessionPayload): CopilotSessionPayload {
  return {
    ...s,
    products: s.products.slice(0, 12),
    savedSummaries: s.savedSummaries.slice(0, 15),
    watchlistSummaries: s.watchlistSummaries.slice(0, 15),
    recentCompareHistory: s.recentCompareHistory.slice(0, 4),
    memoryHints: s.memoryHints.slice(0, 6),
  };
}

export async function runOpenAiCopilot(
  userMessage: string,
  session: CopilotSessionPayload,
  modelOverride?: string
): Promise<CopilotStructuredResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model =
    modelOverride?.trim() ||
    process.env.QUANTAI_COPILOT_MODEL?.trim() ||
    "gpt-4.1-mini";

  const client = new OpenAI({ apiKey });
  const compact = truncateSession(session);
  const tail = JSON.stringify(compact).slice(0, 12_000);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18_000);

  try {
    const response = await client.responses.create(
      {
        model,
        input: `You are QuantAI Copilot — a senior commerce analyst (not a storefront chatbot). Voice: calm, precise, high-trust, premium, concise. Prefer QuantAI vocabulary: tray, composite (QI), discount hygiene, anchor risk, deal heat, buy timing confidence, rare opportunity (only when session data supports it), retailer trust prior, peer median. Never invent prices, discounts, or policies. Avoid hypey ecommerce clichés ("amazing deal", "hurry now", "shop the sale"). Use ONLY the JSON session data below plus the user message. If data is missing for a field, set optional picks to null and say so in finalRecommendation or comparisonSummary. Output ONE JSON object only (no markdown), matching exactly:

{"finalRecommendation":"string","bestOption":null or {"title","link","reason"},"avoidOption":null or {...},"budgetPick":null or {...},"premiumPick":null or {...},"riskWarnings":["max 8 short strings"],"comparisonSummary":"string","nextAction":"string"}

User message:
${userMessage.slice(0, 1800)}

Session (truncated):
${tail}

Rules: links must come from session.products / saved / watchlist only. Keep strings concise for mobile.`,
      },
      { signal: controller.signal }
    );

    const raw = extractResponsesApiText(response);
    const parsed = raw ? parseJsonObject(raw, CopilotStructuredSchema) : null;
    return parsed ?? null;
  } catch (e) {
    logDevError("copilot-openai", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
