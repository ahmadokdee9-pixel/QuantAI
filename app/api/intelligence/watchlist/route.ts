import { auth, currentUser } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { countWatchlistItems } from "@/lib/intelligence/persistence";
import { planDefinition } from "@/lib/subscription/plans";
import { subscriptionTierFromClerkUser } from "@/lib/subscription/resolveTier";
import { isBenignStorageSchemaError } from "@/lib/supabase/benignStorageError";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";

function numberFromProduct(product: Record<string, unknown>): number | null {
  const price = product.price;
  const n = typeof price === "number" ? price : typeof price === "string" ? Number(price) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function buildAlertState(product: Record<string, unknown>, targetPrice?: number | null) {
  const current = numberFromProduct(product);
  const target = typeof targetPrice === "number" && Number.isFinite(targetPrice) && targetPrice > 0 ? targetPrice : null;
  const dropPct = current && target ? Math.max(0, Math.round(((current - target) / current) * 100)) : 0;
  return {
    active: Boolean(target),
    currentPrice: current,
    targetPrice: target,
    dropPct,
    signal:
      target && current && current <= target
        ? "target_reached"
        : target
          ? "watching_drop"
          : "tracking_market",
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return jsonErr(401, "Unauthorized");
  }
  if (!supabaseAdmin) {
    return jsonOk({ items: [], configured: supabaseAdminConfigured });
  }

  const { data, error } = await supabaseAdmin
    .from("shopping_watchlist")
    .select("id, product, target_price, alert_mode, last_seen_price, last_checked_at, alert_state, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    const extras =
      !isBenignStorageSchemaError(error.message) && process.env.NODE_ENV === "development"
        ? { storageError: error.message }
        : {};
    return jsonOk({ items: [], configured: true, ...extras });
  }
  const items = (data ?? []).map((row) => ({
    ...row,
    alert_state:
      row.alert_state && typeof row.alert_state === "object"
        ? row.alert_state
        : buildAlertState((row.product ?? {}) as Record<string, unknown>, row.target_price),
  }));
  return jsonOk({ items, configured: true });
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return jsonErr(401, "Unauthorized");
    }
    if (!supabaseAdmin) {
      return jsonErr(503, "Watchlist storage is not configured.", {
        code: "STORAGE_UNAVAILABLE",
      });
    }

    let user;
    try {
      user = await currentUser();
    } catch {
      user = null;
    }
    const tier = subscriptionTierFromClerkUser(user);
    const plan = planDefinition(tier);
    if (plan.watchlistMax != null) {
      const n = await countWatchlistItems(userId);
      if (n !== null && n >= plan.watchlistMax) {
        return jsonErr(
          403,
          `Watchlist limit (${plan.watchlistMax}) reached. Upgrade for a larger watchlist.`,
          { code: "PLAN_WATCHLIST_LIMIT" }
        );
      }
    }

    try {
      const body = (await req.json()) as {
        product?: Record<string, unknown>;
        targetPrice?: number | null;
        alertMode?: string | null;
      };
      if (!body.product || typeof body.product !== "object") {
        return jsonErr(400, "Missing product");
      }
      const link = typeof body.product.link === "string" ? body.product.link : "";
      if (!link) {
        return jsonErr(400, "Product link required");
      }

      const currentPrice = numberFromProduct(body.product);
      const alertState = buildAlertState(body.product, body.targetPrice ?? null);
      const { error } = await supabaseAdmin.from("shopping_watchlist").insert({
        user_id: userId,
        product: body.product,
        target_price: body.targetPrice ?? null,
        alert_mode: body.alertMode === "discount" ? "discount" : "price_drop",
        last_seen_price: currentPrice,
        last_checked_at: new Date().toISOString(),
        alert_state: alertState,
      });

      if (error) {
        if (error.code === "23505") {
          return jsonOk({ ok: true, duplicate: true });
        }
        return jsonErr(500, error.message);
      }

      if (currentPrice != null) {
        await supabaseAdmin.from("price_snapshots").insert({
          user_id: userId,
          product_link: link,
          store: typeof body.product.store === "string" ? body.product.store : null,
          title: typeof body.product.title === "string" ? body.product.title : null,
          price: currentPrice,
          currency: "EUR",
          source: "watchlist",
        });
      }

      return jsonOk({ ok: true });
    } catch {
      return jsonErr(400, "Invalid JSON");
    }
  } catch {
    return jsonErr(500, "Watchlist request failed.");
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return jsonErr(401, "Unauthorized");
    if (!supabaseAdmin) return jsonErr(503, "Watchlist storage is not configured.", { code: "STORAGE_UNAVAILABLE" });

    const body = (await req.json()) as { id?: string; targetPrice?: number | null; alertMode?: string | null };
    if (!body.id) return jsonErr(400, "Missing watchlist id");

    const { data: row, error: readError } = await supabaseAdmin
      .from("shopping_watchlist")
      .select("product")
      .eq("user_id", userId)
      .eq("id", body.id)
      .maybeSingle();
    if (readError) return jsonErr(500, readError.message);
    if (!row) return jsonErr(404, "Watchlist item not found");

    const product = (row.product ?? {}) as Record<string, unknown>;
    const target = typeof body.targetPrice === "number" && Number.isFinite(body.targetPrice) && body.targetPrice > 0 ? body.targetPrice : null;
    const alertState = buildAlertState(product, target);
    const { error } = await supabaseAdmin
      .from("shopping_watchlist")
      .update({
        target_price: target,
        alert_mode: body.alertMode === "discount" ? "discount" : "price_drop",
        alert_state: alertState,
        last_checked_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("id", body.id);
    if (error) return jsonErr(500, error.message);
    return jsonOk({ ok: true, alertState });
  } catch {
    return jsonErr(500, "Watchlist update failed.");
  }
}
