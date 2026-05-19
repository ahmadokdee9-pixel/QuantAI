import type { ApiReadResult } from "./readJson";

export type SearchApiEnvelope<TProduct = unknown> = {
  success?: boolean;
  data?: {
    products?: TProduct[];
    dealClusters?: unknown[];
    searchIntelligence?: unknown;
    entitlements?: unknown;
    meta?: Record<string, unknown>;
  };
  products?: TProduct[];
  message?: string;
  error?: string;
  retryAfter?: number;
  code?: string;
  entitlements?: unknown;
};

export type ParsedSearchPayload<TProduct> = {
  envelope: SearchApiEnvelope<TProduct> | null;
  payload: NonNullable<SearchApiEnvelope<TProduct>["data"]> | null;
  products: TProduct[];
};

/** Normalize POST /api/search JSON into tray products (supports nested and legacy flat shapes). */
export function parseSearchResponse<TProduct>(
  parsed: ApiReadResult<SearchApiEnvelope<TProduct>>
): ParsedSearchPayload<TProduct> {
  const envelope = parsed.data;
  if (!envelope || typeof envelope !== "object") {
    return { envelope: null, payload: null, products: [] };
  }

  const nested =
    envelope.data && typeof envelope.data === "object" ? envelope.data : null;
  const flatProducts = Array.isArray(envelope.products) ? envelope.products : null;

  if (nested && Array.isArray(nested.products)) {
    return { envelope, payload: nested, products: nested.products };
  }

  if (flatProducts) {
    const payload = {
      products: flatProducts,
      dealClusters: [],
      searchIntelligence: null,
      meta: undefined,
    } as NonNullable<SearchApiEnvelope<TProduct>["data"]>;
    return { envelope, payload, products: flatProducts };
  }

  if (nested) {
    const products = Array.isArray(nested.products) ? nested.products : [];
    return { envelope, payload: nested, products };
  }

  return { envelope, payload: null, products: [] };
}
