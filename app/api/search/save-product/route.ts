import { auth, currentUser } from "@clerk/nextjs/server";
import { countSavedProducts } from "@/lib/intelligence/persistence";
import { planDefinition } from "@/lib/subscription/plans";
import { subscriptionTierFromClerkUser } from "@/lib/subscription/resolveTier";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { logDevError } from "@/lib/log/devLog";
import { supabaseAdmin } from "../lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return jsonErr(401, "Unauthorized");
    }

    if (!supabaseAdmin) {
      return jsonErr(503, "Database is not configured.", { code: "STORAGE_UNAVAILABLE" });
    }

    const user = await currentUser();
    const tier = subscriptionTierFromClerkUser(user);
    const plan = planDefinition(tier);
    if (plan.savedProductsMax != null) {
      const n = await countSavedProducts(userId);
      if (n !== null && n >= plan.savedProductsMax) {
        return jsonErr(
          403,
          `Saved product limit (${plan.savedProductsMax}) reached. Upgrade to save more.`,
          { code: "PLAN_SAVED_LIMIT" }
        );
      }
    }

    const body = await req.json();

    const { product_id, title, price, image, link, ai_score } = body as Record<string, unknown>;

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("saved_products").upsert(
      {
        user_id: userId,
        product_id,
        title,
        price,
        image,
        link,
        ai_score,
        updated_at: now,
      },
      { onConflict: "user_id,link" }
    );

    if (error) {
      return jsonErr(500, error.message);
    }

    return jsonOk({});
  } catch (e) {
    logDevError("save-product", e);
    return jsonErr(500, "Server error");
  }
}
