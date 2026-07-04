import {
  computePriceTrend,
  type QuantProduct,
} from "@/lib/shoppingScore";
import {
  isLowConfidenceListing,
  isSpammyListingTitle,
  isShadyGenericMarketplaceRow,
  listingSignalsRefurbished,
  normalizeMarketplaceTitle,
  userQuerySeeksUsedOrRefurb,
} from "@/lib/commerce/listingQuality";
import { combinedTitleSimilarity } from "@/lib/deals/normalizeTitle";
import { buildUpstreamShoppingQuery } from "@/lib/search/shoppingQueryV3";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import { getStoreTrustScore } from "@/lib/retailTrust";
import { fetchWithRetry } from "@/lib/commerce/fetchWithRetry";
import { resolveBestOutboundUrl } from "@/lib/search/directMerchantRouter";
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

function glForMarket(canonicalQuery?: CanonicalQueryContract): string {
  const envGl = (process.env.SERPAPI_SHOPPING_GL ?? "").trim().toLowerCase();
  if (envGl) return envGl.slice(0, 4);
  const country = canonicalQuery?.market.country;
  switch (country) {
    case "US":
      return "us";
    case "UK":
      return "gb";
    case "DE":
      return "de";
    case "FR":
      return "fr";
    case "BE":
      return "be";
    case "ES":
      return "es";
    case "IT":
      return "it";
    case "EU":
    case "GLOBAL":
      return "us";
    case "NL":
    default:
      return "nl";
  }
}

function dedupeShoppingFeedOverlap(rows: QuantProduct[]): QuantProduct[] {
  if (rows.length < 2) return rows;
  const out: QuantProduct[] = [];
  for (const p of rows) {
    let isDup = false;
    for (const o of out) {
      const sim = combinedTitleSimilarity(p.title, o.title);
      if (sim < 0.88) continue;
      if (p.price <= 0 || o.price <= 0) {
        if (p.store.toLowerCase() === o.store.toLowerCase() && sim >= 0.92) {
          isDup = true;
          break;
        }
        continue;
      }
      const rel = Math.abs(p.price - o.price) / Math.max(p.price, o.price);
      if (rel < 0.032) {
        if (p.store.toLowerCase() !== o.store.toLowerCase()) continue;
        isDup = true;
        break;
      }
    }
    if (!isDup) out.push(p);
  }
  return out;
}

export async function fetchShoppingProducts(
  q: string,
  canonicalQuery?: CanonicalQueryContract
): Promise<{ ok: true; products: ShoppingProduct[] } | { ok: false; error: string; status: number }> {
  try {
    const trimmed = q.trim();
    if (!trimmed) {
      return { ok: false, error: "Missing query", status: 400 };
    }

    if (!process.env.SERPAPI_KEY) {
      return { ok: false, error: "Search is temporarily unavailable", status: 503 };
    }

    const upstreamQ = canonicalQuery?.upstreamQuery || buildUpstreamShoppingQuery(trimmed);

    const gl = glForMarket(canonicalQuery);
    const num = Math.min(100, Math.max(40, Number.parseInt(process.env.SERPAPI_SHOPPING_NUM ?? "80", 10) || 80));
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(
      upstreamQ
    )}&gl=${encodeURIComponent(gl)}&hl=en&num=${num}&api_key=${process.env.SERPAPI_KEY}`;

    const timeoutMs = (() => {
      const raw = Number(process.env.SEARCH_SERPAPI_TIMEOUT_MS ?? "12000");
      return Number.isFinite(raw) ? Math.min(20000, Math.max(5000, Math.round(raw))) : 12000;
    })();
    const retries = (() => {
      const raw = Number(process.env.SEARCH_SERPAPI_RETRIES ?? "1");
      return Number.isFinite(raw) ? Math.min(2, Math.max(0, Math.round(raw))) : 1;
    })();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetchWithRetry(
        url,
        { cache: "no-store", signal: controller.signal },
        { retries, baseDelayMs: 400, signal: controller.signal, label: "serpapi_shopping" }
      );
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
    const mapped = raw.slice(0, 100).map((item: unknown, index: number) => {
      const row = item as Record<string, unknown>;
      const price = Number(row.extracted_price) || 0;
      const oldRaw =
        row.extracted_old_price ?? row.old_price_extracted ?? row.old_price;
      const oldPrice = extractNumberFromPrice(oldRaw);
      const extensions = parseExtensions(row);
      const store = String(row.source || row.store || "Unknown store");
      const baseLink = resolveShoppingListingLink(row);
      const routed = resolveBestOutboundUrl({
        link: baseLink,
        store,
        title: String(row.title || ""),
        geoGl: gl,
      });

      const rawTitle = String(row.title || "Unknown product");
      const title = normalizeMarketplaceTitle(rawTitle);

      return {
        id: index + 1,
        title,
        store,
        price,
        displayPrice: String(row.price || ""),
        rating: (row.rating as number | string) ?? "N/A",
        link: baseLink,
        offerOutboundUrl: routed.href.startsWith("http") ? routed.href : baseLink,
        outboundRouteKind: routed.kind,
        image: String(row.thumbnail || ""),
        reviewsCount: parseReviews(row),
        shipping: parseShipping(row),
        availability: parseAvailability(row, extensions),
        oldPrice,
        priceTrend: computePriceTrend(price, oldPrice),
        extensions,
      };
    });

    const filtered = mapped.filter((p) => {
      const title = p.title.toLowerCase();
      if (title === "unknown product" || title.length < 3) return false;
      if (isSpammyListingTitle(p.title)) return false;
      if (isLowConfidenceListing(p.title, p.store)) return false;
      if (isShadyGenericMarketplaceRow(p)) return false;
      if (!userQuerySeeksUsedOrRefurb(trimmed) && listingSignalsRefurbished(p)) {
        const trust = getStoreTrustScore(p.store);
        const rev = p.reviewsCount ?? 0;
        if (trust < 78 || rev < 12) return false;
      }
      if (p.store.toLowerCase() === "unknown store") return false;
      if (p.price <= 0 && !String(p.displayPrice || "").trim()) return false;
      if (p.link === "#" || p.link.length < 8) return false;
      const click = p.offerOutboundUrl ?? p.link;
      if (click === "#" || click.length < 8) return false;
      return true;
    });

    const deduped = dedupeShoppingFeedOverlap(filtered).slice(0, 60);

    const products: ShoppingProduct[] = deduped.map((p, i) => ({ ...p, id: i + 1 }));

    return { ok: true, products };
  } catch {
    return { ok: false, error: "Search provider request failed", status: 500 };
  }
}
