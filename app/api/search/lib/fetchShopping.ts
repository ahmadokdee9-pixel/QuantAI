import {
  computePriceTrend,
  type QuantProduct,
} from "@/lib/shoppingScore";
import { resolveShoppingListingLink } from "./resolveOfferUrl";

function extractNumberFromPrice(val: unknown): number | null {
  if (val == null) return null;
  const n = Number(String(val).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseReviews(row: Record<string, unknown>): number | null {
  const r = row.reviews;
  if (typeof r === "number" && Number.isFinite(r)) return Math.round(r);
  if (typeof r === "string") {
    const n = parseInt(r.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseExtensions(row: Record<string, unknown>): string[] {
  const ex = row.extensions;
  if (!Array.isArray(ex)) return [];
  return ex
    .map((x) => (typeof x === "string" ? x : String(x)))
    .filter(Boolean)
    .slice(0, 6);
}

function parseShipping(row: Record<string, unknown>): string | null {
  const d = row.delivery;
  if (typeof d === "string" && d.trim()) return d.trim();
  const snippet = row.snippet;
  if (typeof snippet === "string" && /ship|delivery|pickup|free/i.test(snippet)) {
    return snippet.trim().slice(0, 120);
  }
  return null;
}

function parseAvailability(row: Record<string, unknown>, extensions: string[]): string | null {
  if (row.second_hand === true) return "Used / second-hand";
  if (row.condition && typeof row.condition === "string") return String(row.condition);
  const first = extensions[0];
  if (first && /in stock|out of stock|preorder|used/i.test(first)) return first;
  return null;
}

export type ShoppingProduct = QuantProduct;

export async function fetchShoppingProducts(
  q: string
): Promise<{ ok: true; products: ShoppingProduct[] } | { ok: false; error: string; status: number }> {
  try {
    const trimmed = q.trim();
    if (!trimmed) {
      return { ok: false, error: "Missing query", status: 400 };
    }

    if (!process.env.SERPAPI_KEY) {
      return { ok: false, error: "Search is temporarily unavailable", status: 503 };
    }

    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(
      trimmed
    )}&gl=nl&hl=en&api_key=${process.env.SERPAPI_KEY}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    let response: Response;
    try {
      response = await fetch(url, { cache: "no-store", signal: controller.signal });
    } catch {
      return { ok: false, error: "Search request timed out", status: 504 };
    } finally {
      clearTimeout(timeout);
    }

    let data: Record<string, unknown>;
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      return { ok: false, error: "Invalid response from search provider", status: 502 };
    }

    if (!response.ok) {
      const msg =
        typeof data.error === "string"
          ? data.error
          : `Search provider error (${response.status})`;
      return { ok: false, error: msg, status: 502 };
    }

    if (data.error && typeof data.error === "string") {
      return { ok: false, error: data.error, status: 502 };
    }

    const raw = (data.shopping_results as unknown[]) || [];
    const mapped = raw.slice(0, 28).map((item: unknown, index: number) => {
      const row = item as Record<string, unknown>;
      const price = Number(row.extracted_price) || 0;
      const oldRaw =
        row.extracted_old_price ?? row.old_price_extracted ?? row.old_price;
      const oldPrice = extractNumberFromPrice(oldRaw);
      const extensions = parseExtensions(row);
      const link = resolveShoppingListingLink(row);

      return {
        id: index + 1,
        title: String(row.title || "Unknown product"),
        store: String(row.source || row.store || "Unknown store"),
        price,
        displayPrice: String(row.price || ""),
        rating: (row.rating as number | string) ?? "N/A",
        link,
        image: String(row.thumbnail || ""),
        reviewsCount: parseReviews(row),
        shipping: parseShipping(row),
        availability: parseAvailability(row, extensions),
        oldPrice,
        priceTrend: computePriceTrend(price, oldPrice),
        extensions,
      };
    });

    const products: ShoppingProduct[] = mapped
      .filter((p) => {
        const title = p.title.toLowerCase();
        if (title === "unknown product" || title.length < 3) return false;
        if (p.store.toLowerCase() === "unknown store") return false;
        if (p.price <= 0 && !String(p.displayPrice || "").trim()) return false;
        if (p.link === "#" || p.link.length < 8) return false;
        return true;
      })
      .map((p, i) => ({ ...p, id: i + 1 }));

    return { ok: true, products };
  } catch {
    return { ok: false, error: "Search provider request failed", status: 500 };
  }
}
