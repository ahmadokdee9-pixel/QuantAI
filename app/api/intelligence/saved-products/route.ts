import { auth } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { isBenignStorageSchemaError } from "@/lib/supabase/benignStorageError";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";

export type SavedProductRow = {
  id?: string;
  product_id?: string | null;
  title: string | null;
  price: number | null;
  image: string | null;
  link: string;
  ai_score?: number | null;
  created_at?: string;
};

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return jsonErr(401, "Unauthorized");
  }
  if (!supabaseAdmin) {
    return jsonOk({ items: [] as SavedProductRow[], configured: supabaseAdminConfigured });
  }

  const { data, error } = await supabaseAdmin
    .from("saved_products")
    .select("id, product_id, title, price, image, link, ai_score, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    const extras =
      !isBenignStorageSchemaError(error.message) && process.env.NODE_ENV === "development"
        ? { storageError: error.message }
        : {};
    return jsonOk({
      items: [] as SavedProductRow[],
      configured: true,
      ...extras,
    });
  }
  return jsonOk({ items: (data ?? []) as SavedProductRow[], configured: true });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return jsonErr(401, "Unauthorized");
  }
  if (!supabaseAdmin) {
    return jsonErr(503, "Database is not configured.");
  }

  try {
    const { searchParams } = new URL(req.url);
    const link = searchParams.get("link")?.trim();
    if (!link) {
      return jsonErr(400, "Missing link");
    }
    const { error } = await supabaseAdmin.from("saved_products").delete().eq("user_id", userId).eq("link", link);
    if (error) {
      return jsonErr(500, error.message);
    }
    return jsonOk({ ok: true });
  } catch {
    return jsonErr(400, "Invalid request");
  }
}
