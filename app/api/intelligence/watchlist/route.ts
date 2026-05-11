import { auth, currentUser } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { countWatchlistItems } from "@/lib/intelligence/persistence";
import { planDefinition } from "@/lib/subscription/plans";
import { subscriptionTierFromClerkUser } from "@/lib/subscription/resolveTier";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Foundation route for price-drop / availability alerts (persist when DB tables exist). */

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return jsonErr(401, "Unauthorized");
  }
  if (!supabaseAdmin) {
    return jsonOk({ items: [] });
  }

  const { data, error } = await supabaseAdmin
    .from("shopping_watchlist")
    .select("id, product, target_price, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return jsonOk({ items: [], storageError: error.message });
  }
  return jsonOk({ items: data ?? [] });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return jsonErr(401, "Unauthorized");
  }
  if (!supabaseAdmin) {
    return jsonErr(503, "Watchlist storage is not configured.");
  }

  const user = await currentUser();
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
}
