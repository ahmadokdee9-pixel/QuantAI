import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { logDevWarn } from "@/lib/log/devLog";
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
  try {
    let parsed: z.infer<typeof FeedbackSchema>;
    try {
      parsed = FeedbackSchema.parse(await req.json());
    } catch {
      return jsonErr(400, "Invalid feedback payload");
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
        logDevWarn("feedback", error.message);
        return jsonOk({
          ok: true,
          stored: false,
          note: "Received. Storage table may be missing — feedback was not persisted.",
        });
      }
      return jsonOk({ ok: true, stored: true });
    }

    return jsonOk({
      ok: true,
      stored: false,
      note: "Received locally. Connect Supabase and create table quantai_feedback to archive.",
    });
  } catch {
    return jsonErr(500, "Could not process feedback.");
  }
}
