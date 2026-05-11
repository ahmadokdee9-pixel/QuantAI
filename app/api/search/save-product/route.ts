import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { countSavedProducts } from "@/lib/intelligence/persistence";
import { planDefinition } from "@/lib/subscription/plans";
import { subscriptionTierFromClerkUser } from "@/lib/subscription/resolveTier";
import { supabaseAdmin } from "../lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database is not configured." },
        { status: 503 }
      );
    }

    const user = await currentUser();
    const tier = subscriptionTierFromClerkUser(user);
    const plan = planDefinition(tier);
    if (plan.savedProductsMax != null) {
      const n = await countSavedProducts(userId);
      if (n !== null && n >= plan.savedProductsMax) {
        return NextResponse.json(
          {
            error: `Saved product limit (${plan.savedProductsMax}) reached. Upgrade to save more.`,
            code: "PLAN_SAVED_LIMIT",
          },
          { status: 403 }
        );
      }
    }

    const body = await req.json();

    const {
      product_id,
      title,
      price,
      image,
      link,
      ai_score,
    } = body;

    const { error } = await supabaseAdmin
      .from("saved_products")
      .insert({
        user_id: userId,
        product_id,
        title,
        price,
        image,
        link,
        ai_score,
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (e) {
    console.error(e);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}