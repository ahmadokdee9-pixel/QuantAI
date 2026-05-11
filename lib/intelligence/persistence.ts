import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { inferSearchCategory } from "./categoryContext";

function getAdmin() {
  return supabaseAdmin;
}

export async function recordSearchHistory(
  userId: string,
  query: string,
  resultCount: number
): Promise<void> {
  const db = getAdmin();
  if (!db) return;
  try {
    const { error } = await db.from("search_history").insert({
      user_id: userId,
      query: query.trim().slice(0, 500),
      result_count: resultCount,
    });
    if (error && process.env.NODE_ENV === "development") {
      console.warn("[QuantAI] search_history insert:", error.message);
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[QuantAI] search_history failed", e);
    }
  }
}

export async function mergeRecommendationMemory(
  userId: string,
  query: string,
  topCategory: string
): Promise<void> {
  const db = getAdmin();
  if (!db) return;
  try {
    const { data: row } = await db
      .from("user_shopping_memory")
      .select("memory")
      .eq("user_id", userId)
      .maybeSingle();

    const prev =
      row && typeof row.memory === "object" && row.memory !== null
        ? (row.memory as Record<string, unknown>)
        : {};
    const categories = typeof prev.categories === "object" && prev.categories !== null
      ? { ...(prev.categories as Record<string, number>) }
      : {};
    categories[topCategory] = (categories[topCategory] ?? 0) + 1;

    const next = {
      ...prev,
      lastQuery: query.trim().slice(0, 500),
      lastCategory: topCategory,
      categories,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await db.from("user_shopping_memory").upsert(
      {
        user_id: userId,
        memory: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error && process.env.NODE_ENV === "development") {
      console.warn("[QuantAI] user_shopping_memory upsert:", error.message);
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[QuantAI] memory merge failed", e);
    }
  }
}

export function memoryPatchFromSearch(query: string): { topCategory: string } {
  return { topCategory: inferSearchCategory(query) };
}

function utcDayStartIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Returns null if Supabase is unavailable or count fails (caller should fail-open). */
export async function countSearchesTodayUtc(userId: string): Promise<number | null> {
  const db = getAdmin();
  if (!db) return null;
  try {
    const { count, error } = await db
      .from("search_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", utcDayStartIso());
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

export async function countSavedProducts(userId: string): Promise<number | null> {
  const db = getAdmin();
  if (!db) return null;
  try {
    const { count, error } = await db
      .from("saved_products")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

export async function countWatchlistItems(userId: string): Promise<number | null> {
  const db = getAdmin();
  if (!db) return null;
  try {
    const { count, error } = await db
      .from("shopping_watchlist")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}
