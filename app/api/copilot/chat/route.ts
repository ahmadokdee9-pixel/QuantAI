import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { buildHeuristicCopilotResponse } from "@/lib/copilot/heuristicCopilot";
import { runOpenAiCopilot } from "@/lib/copilot/openaiCopilot";
import type { CopilotSessionPayload } from "@/lib/copilot/sessionTypes";
import { defaultCopilotSession } from "@/lib/copilot/sessionTypes";
import { CopilotStructuredSchema } from "@/lib/copilot/structuredResponse";
import { copilotRatelimit, enforceLimit } from "@/lib/rate-limit";
import { enforcePlanAiDailyLimit } from "@/lib/subscription/planAiUsage";
import { logDevError } from "@/lib/log/devLog";

const TurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(2400),
});

const BodySchema = z.object({
  message: z.string().min(1).max(2000),
  session: z.unknown().optional(),
  conversationTail: z.array(TurnSchema).max(10).optional(),
});

function mergeSession(raw: unknown): CopilotSessionPayload {
  const base = defaultCopilotSession();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  const tier = typeof o.subscriptionTier === "string" ? o.subscriptionTier : base.subscriptionTier;
  const route =
    o.route === "home" || o.route === "dashboard" || o.route === "pricing" || o.route === "saved"
      ? o.route
      : base.route;
  return {
    ...base,
    route,
    subscriptionTier: tier,
    lastSearchQuery: typeof o.lastSearchQuery === "string" ? o.lastSearchQuery.slice(0, 500) : base.lastSearchQuery,
    products: Array.isArray(o.products) ? (o.products as CopilotSessionPayload["products"]).slice(0, 20) : [],
    savedSummaries: Array.isArray(o.savedSummaries)
      ? (o.savedSummaries as CopilotSessionPayload["savedSummaries"]).slice(0, 25)
      : [],
    watchlistSummaries: Array.isArray(o.watchlistSummaries)
      ? (o.watchlistSummaries as CopilotSessionPayload["watchlistSummaries"]).slice(0, 25)
      : [],
    compareTrayLinks: Array.isArray(o.compareTrayLinks)
      ? (o.compareTrayLinks as string[]).map((x) => String(x).slice(0, 2000)).slice(0, 6)
      : [],
    entitlementsLevel: typeof o.entitlementsLevel === "string" ? o.entitlementsLevel.slice(0, 80) : undefined,
    memoryHints: Array.isArray(o.memoryHints)
      ? (o.memoryHints as unknown[]).map((x) => String(x).slice(0, 200)).slice(0, 10)
      : [],
    searchIntelligenceExcerpt:
      o.searchIntelligenceExcerpt &&
      typeof o.searchIntelligenceExcerpt === "object" &&
      !Array.isArray(o.searchIntelligenceExcerpt)
        ? {
            finalHeadline:
              typeof (o.searchIntelligenceExcerpt as { finalHeadline?: unknown }).finalHeadline === "string"
                ? String((o.searchIntelligenceExcerpt as { finalHeadline: string }).finalHeadline).slice(0, 300)
                : undefined,
            finalBody:
              typeof (o.searchIntelligenceExcerpt as { finalBody?: unknown }).finalBody === "string"
                ? String((o.searchIntelligenceExcerpt as { finalBody: string }).finalBody).slice(0, 500)
                : undefined,
          }
        : null,
    recentCompareHistory: Array.isArray(o.recentCompareHistory)
      ? (o.recentCompareHistory as CopilotSessionPayload["recentCompareHistory"]).slice(0, 6)
      : [],
  };
}

function guestKey(req: Request): string {
  const xf = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xf) return `guest:${xf.slice(0, 64)}`;
  return "guest:unknown";
}

export async function POST(req: Request) {
  try {
    let body: z.infer<typeof BodySchema>;
    try {
      const json = (await req.json()) as unknown;
      body = BodySchema.parse(json);
    } catch {
      return jsonErr(400, "Invalid request body");
    }

    const { userId } = await auth();
    if (userId) {
      const planLimited = await enforcePlanAiDailyLimit(userId);
      if (!planLimited.ok) {
        return jsonErr(
          429,
          `Daily AI intelligence limit reached (${planLimited.limit}). Upgrade for more.`,
          { retryAfter: planLimited.retryAfter, code: "PLAN_AI_LIMIT" },
          { headers: { "Retry-After": String(planLimited.retryAfter) } }
        );
      }
    }
    const rateId = userId ?? guestKey(req);
    const limited = await enforceLimit(copilotRatelimit, rateId);
    if (!limited.ok) {
      const h = buildHeuristicCopilotResponse(body.message, mergeSession(body.session));
      return jsonErr(
        429,
        "Too many copilot requests.",
        {
          structured: h,
          retryAfter: limited.retryAfter,
        },
        { headers: { "Retry-After": String(limited.retryAfter) } }
      );
    }

    const session = mergeSession(body.session);
    const tail = body.conversationTail ?? [];

    let structured = await runOpenAiCopilot(
      tail.length
        ? `${tail.map((t) => `${t.role}: ${t.content}`).join("\n")}\nuser: ${body.message}`
        : body.message,
      session
    );

    let source: "openai" | "heuristic" = "heuristic";
    if (structured) {
      const check = CopilotStructuredSchema.safeParse(structured);
      if (check.success) {
        structured = check.data;
        source = "openai";
      } else {
        structured = null;
      }
    }

    if (!structured) {
      structured = buildHeuristicCopilotResponse(body.message, session);
      source = "heuristic";
    }

    return jsonOk({
      structured,
      source,
      rateLimited: false,
    });
  } catch (e) {
    logDevError("copilot-chat", e);
    return jsonErr(500, "Copilot error");
  }
}
