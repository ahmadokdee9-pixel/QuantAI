import { logDevWarn } from "@/lib/log/devLog";
import { isBenignStorageSchemaError } from "@/lib/supabase/benignStorageError";
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
    if (error && !isBenignStorageSchemaError(error.message)) {
      logDevWarn("search_history", error.message);
    }
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) {
      logDevWarn("search_history", String(e));
    }
  }
}

export async function mergeRecommendationMemory(
  userId: string,
  query: string,
  topCategory: string,
  personaLabels?: string[]
): Promise<void> {
  const db = getAdmin();
  if (!db) return;
  try {
    const { data: row, error: readErr } = await db
      .from("user_shopping_memory")
      .select("memory")
      .eq("user_id", userId)
      .maybeSingle();

    if (readErr) {
      if (isBenignStorageSchemaError(readErr.message)) return;
      logDevWarn("user_shopping_memory", readErr.message);
      return;
    }

    const prev =
      row && typeof row.memory === "object" && row.memory !== null
        ? (row.memory as Record<string, unknown>)
        : {};
    const categories = typeof prev.categories === "object" && prev.categories !== null
      ? { ...(prev.categories as Record<string, number>) }
      : {};
    categories[topCategory] = (categories[topCategory] ?? 0) + 1;

    const next: Record<string, unknown> = {
      ...prev,
      lastQuery: query.trim().slice(0, 500),
      lastCategory: topCategory,
      categories,
      updatedAt: new Date().toISOString(),
    };
    if (personaLabels && personaLabels.length) {
      const prevLabels =
        Array.isArray(prev.shopperPersonaLabels) && prev.shopperPersonaLabels.every((x) => typeof x === "string")
          ? (prev.shopperPersonaLabels as string[])
          : [];
      next.shopperPersonaLabels = [...new Set([...prevLabels, ...personaLabels])].slice(0, 8);
    }

    const { error } = await db.from("user_shopping_memory").upsert(
      {
        user_id: userId,
        memory: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error && !isBenignStorageSchemaError(error.message)) {
      logDevWarn("user_shopping_memory", error.message);
    }
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) {
      logDevWarn("user_shopping_memory", String(e));
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

/** Persists a compare verdict for dashboard history (best-effort; never throws to callers). */
export async function recordCompareSession(userId: string, payload: Record<string, unknown>): Promise<void> {
  const db = getAdmin();
  if (!db) return;
  try {
    const { error } = await db.from("compare_sessions").insert({
      user_id: userId,
      payload,
    });
    if (error && !isBenignStorageSchemaError(error.message)) {
      logDevWarn("compare_sessions", error.message);
    }
  } catch (e) {
    if (!isBenignStorageSchemaError(String(e))) {
      logDevWarn("compare_sessions", String(e));
    }
  }
}
