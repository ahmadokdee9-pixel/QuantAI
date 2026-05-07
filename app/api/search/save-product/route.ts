import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
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