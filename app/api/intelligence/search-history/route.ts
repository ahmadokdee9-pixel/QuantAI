import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ items: [] });
  }

  const { data, error } = await supabaseAdmin
    .from("search_history")
    .select("id, query, result_count, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    return NextResponse.json({ items: [] });
  }

  return NextResponse.json({ items: data ?? [] });
}
