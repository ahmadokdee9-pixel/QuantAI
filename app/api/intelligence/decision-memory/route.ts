import { auth } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import {
  insertDecisionMemoryEpisode,
  listDecisionMemoryForUser,
  markDecisionWatched,
  scoreHistoryForUserLink,
} from "@/lib/decisionMemory/server";
import type { DecisionAction, DecisionMemoryWriteInput } from "@/lib/decisionMemory/types";
import { supabaseAdminConfigured } from "@/lib/supabaseAdmin";

function parseAction(value: unknown): DecisionAction | null {
  if (typeof value !== "string") return null;
  const u = value.trim().toUpperCase();
  if (u === "BUY" || u === "WAIT" || u === "COMPARE" || u === "AVOID") return u;
  return null;
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return jsonErr(401, "Unauthorized");

  const { searchParams } = new URL(req.url);
  const watchedOnly = searchParams.get("watched") === "1" || searchParams.get("watched") === "true";
  const link = searchParams.get("link")?.trim() || "";
  const history = searchParams.get("history") === "1";

  if (history && link) {
    const series = await scoreHistoryForUserLink(userId, link);
    return jsonOk({ history: series, configured: supabaseAdminConfigured });
  }

  const result = await listDecisionMemoryForUser(userId, {
    watchedOnly,
    limit: watchedOnly ? 100 : 200,
  });

  // For watchlist view: collapse to latest episode per product link
  let items = result.items;
  if (watchedOnly) {
    const latest = new Map<string, (typeof items)[number]>();
    for (const item of items) {
      if (!latest.has(item.productLink)) latest.set(item.productLink, item);
    }
    items = [...latest.values()];
  }

  return jsonOk({
    items,
    configured: result.configured,
    ...(result.error ? { storageError: result.error } : {}),
  });
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return jsonErr(401, "Unauthorized");

    const body = (await req.json()) as DecisionMemoryWriteInput;
    const decision = parseAction(body.decision);
    const productLink = typeof body.productLink === "string" ? body.productLink.trim() : "";
    if (!decision || !productLink) {
      return jsonErr(400, "decision and productLink are required");
    }

    const result = await insertDecisionMemoryEpisode(userId, {
      ...body,
      decision,
      productLink,
    });

    if (result.error === "STORAGE_UNAVAILABLE") {
      return jsonErr(503, "Decision memory storage is not configured.", {
        code: "STORAGE_UNAVAILABLE",
      });
    }
    if (result.error === "SCHEMA_MISSING") {
      return jsonOk({
        ok: false,
        configured: false,
        code: "SCHEMA_MISSING",
        message: "Apply decision_memory migration to enable server persistence.",
      });
    }
    if (result.error) return jsonErr(500, result.error);
    return jsonOk({ ok: true, episode: result.episode, duplicate: Boolean(result.duplicate) });
  } catch {
    return jsonErr(400, "Invalid JSON");
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return jsonErr(401, "Unauthorized");

    const body = (await req.json()) as { productLink?: string; watched?: boolean };
    const productLink = typeof body.productLink === "string" ? body.productLink.trim() : "";
    if (!productLink) return jsonErr(400, "productLink required");
    if (body.watched !== true) return jsonErr(400, "Only watched=true is supported");

    const result = await markDecisionWatched(userId, productLink);
    if (result.error === "STORAGE_UNAVAILABLE") {
      return jsonErr(503, "Decision memory storage is not configured.", {
        code: "STORAGE_UNAVAILABLE",
      });
    }
    if (result.error === "SCHEMA_MISSING") {
      return jsonOk({ ok: false, configured: false, code: "SCHEMA_MISSING" });
    }
    if (result.error) return jsonErr(500, result.error);
    return jsonOk({ ok: true });
  } catch {
    return jsonErr(400, "Invalid JSON");
  }
}
