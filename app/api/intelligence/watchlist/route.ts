import { auth, currentUser } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { countWatchlistItems } from "@/lib/intelligence/persistence";
import { planDefinition } from "@/lib/subscription/plans";
import { subscriptionTierFromClerkUser } from "@/lib/subscription/resolveTier";
import { isBenignStorageSchemaError } from "@/lib/supabase/benignStorageError";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";

/** Foundation route for price-drop / availability alerts (persist when DB tables exist). */

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
    .select("id, product, target_price, created_at")
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
  return jsonOk({ items: data ?? [], configured: true });
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
      };
      if (!body.product || typeof body.product !== "object") {
        return jsonErr(400, "Missing product");
      }
      const link = typeof body.product.link === "string" ? body.product.link : "";
      if (!link) {
        return jsonErr(400, "Product link required");
      }

      const { error } = await supabaseAdmin.from("shopping_watchlist").insert({
        user_id: userId,
        product: body.product,
        target_price: body.targetPrice ?? null,
      });

      if (error) {
        if (error.code === "23505") {
          return jsonOk({ ok: true, duplicate: true });
        }
        return jsonErr(500, error.message);
      }

      return jsonOk({ ok: true });
    } catch {
      return jsonErr(400, "Invalid JSON");
    }
  } catch {
    return jsonErr(500, "Watchlist request failed.");
  }
}
