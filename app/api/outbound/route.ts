import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { QuantAnalyticsEvents } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/trackServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function safeTarget(raw: string | null): URL | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      host === "0.0.0.0" ||
      host === "::1"
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function clip(s: string | null, max: number): string | null {
  const t = s?.trim();
  if (!t) return null;
  return t.length <= max ? t : t.slice(0, max);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const target = safeTarget(url.searchParams.get("to"));
  if (!target) {
    return NextResponse.redirect(new URL("/", req.url), { status: 302 });
  }

  const clickId = crypto.randomUUID();
  let userId: string | null = null;
  try {
    const a = await auth();
    userId = a.userId;
  } catch {
    userId = null;
  }

  const merchant = clip(url.searchParams.get("merchant"), 120);
  const routeKind = clip(url.searchParams.get("route"), 80);
  const productTitle = clip(url.searchParams.get("title"), 220);
  const searchQuery = clip(url.searchParams.get("q"), 220);
  const decisionAction = clip(url.searchParams.get("decision"), 80);

  trackServerEvent(QuantAnalyticsEvents.OFFER_CLICK, {
    clickId,
    userId: userId ?? undefined,
    merchant: merchant ?? undefined,
    routeKind: routeKind ?? undefined,
    decisionAction: decisionAction ?? undefined,
  });

  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.from("outbound_clicks").insert({
      user_id: userId,
      click_id: clickId,
      target_url: target.toString(),
      merchant,
      route_kind: routeKind,
      product_title: productTitle,
      search_query: searchQuery,
      decision_action: decisionAction,
    });
    if (error && process.env.NODE_ENV !== "production") {
      console.warn("[api/outbound] click insert failed", error.message);
    }
  }

  target.searchParams.set("qai_click", clickId);
  return NextResponse.redirect(target, { status: 302 });
}
