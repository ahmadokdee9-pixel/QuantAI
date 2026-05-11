import { auth } from "@clerk/nextjs/server";
import { jsonOk } from "@/lib/api/jsonResponse";
import { isAllowedAnalyticsEvent, type QuantAnalyticsEvent } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/trackServer";
import { logDevWarn } from "@/lib/log/devLog";

const MAX_EVENT_LEN = 120;
const MAX_PATH_LEN = 500;

function warnDev(message: string) {
  logDevWarn("api/analytics/event", message);
}

function coerceBody(raw: unknown): {
  event: string;
  properties: Record<string, unknown>;
  path?: string;
  ts?: number;
} | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const event = typeof o.event === "string" ? o.event.trim() : "";
  if (!event || event.length > MAX_EVENT_LEN) return null;

  let properties: Record<string, unknown> = {};
  if (o.properties != null && typeof o.properties === "object" && !Array.isArray(o.properties)) {
    try {
      properties = { ...(o.properties as Record<string, unknown>) };
    } catch {
      properties = {};
    }
  }

  const path =
    typeof o.path === "string" && o.path.length <= MAX_PATH_LEN
      ? o.path
      : typeof o.path === "string"
        ? o.path.slice(0, MAX_PATH_LEN)
        : undefined;

  const ts =
    typeof o.ts === "number" && Number.isFinite(o.ts) ? o.ts : undefined;

  return { event, properties, path, ts };
}

/**
 * Ingests client analytics events. Always responds with JSON (never HTML, never redirects).
 * Unknown JSON fields are ignored. Missing sink / invalid payload returns `{ success: true, skipped: true }`.
 */
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    warnDev("POST body was not valid JSON — skipping.");
    return jsonOk({ skipped: true });
  }

  const coerced = coerceBody(raw);
  if (!coerced || !isAllowedAnalyticsEvent(coerced.event)) {
    if (process.env.NODE_ENV === "development" && coerced?.event) {
      warnDev(`Unknown or disallowed event name — skipping (${coerced.event.slice(0, 60)}).`);
    }
    return jsonOk({ skipped: true });
  }

  let userId: string | undefined;
  try {
    const a = await auth();
    userId = a.userId ?? undefined;
  } catch {
    warnDev("Clerk auth() failed — continuing without user id.");
  }

  const props: Record<string, unknown> = {
    ...coerced.properties,
    ...(userId ? { userId } : {}),
    ...(coerced.path != null ? { path: coerced.path } : {}),
    ...(coerced.ts != null ? { clientTs: coerced.ts } : {}),
  };

  const sink = process.env.QUANTAI_ANALYTICS_SINK_URL?.trim();
  if (!sink) {
    warnDev("QUANTAI_ANALYTICS_SINK_URL is not set — skipping ingest.");
    return jsonOk({ skipped: true });
  }

  try {
    trackServerEvent(coerced.event as QuantAnalyticsEvent, props);
  } catch {
    warnDev("trackServerEvent threw — skipping.");
    return jsonOk({ skipped: true });
  }

  return jsonOk({ skipped: false });
}
