import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const FeedbackSchema = z.object({
  category: z.enum([
    "wrong_recommendation",
    "bad_product_match",
    "pricing_issue",
    "missing_store",
    "feature_request",
    "general",
  ]),
  message: z.string().trim().min(8).max(8000),
  context: z.string().trim().max(2000).optional(),
});

/**
 * Persists to Supabase table `quantai_feedback` when configured; otherwise acknowledges for UX.
 */
export async function POST(req: Request) {
  let parsed: z.infer<typeof FeedbackSchema>;
  try {
    parsed = FeedbackSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid feedback payload" }, { status: 400 });
  }

  const { userId } = await auth();

  const row = {
    user_id: userId ?? null,
    category: parsed.category,
    message: parsed.message,
    context: parsed.context ?? null,
    created_at: new Date().toISOString(),
  };

  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.from("quantai_feedback").insert(row);
    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[QuantAI feedback]", error.message);
      }
      return NextResponse.json({
        ok: true,
        stored: false,
        note: "Received. Storage table may be missing — feedback was not persisted.",
      });
    }
    return NextResponse.json({ ok: true, stored: true });
  }

  return NextResponse.json({
    ok: true,
    stored: false,
    note: "Received locally. Connect Supabase and create table quantai_feedback to archive.",
  });
}
