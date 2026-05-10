export type ShoppingProduct = {
  id: number;
  title: string;
  store: string;
  price: number;
  displayPrice: string;
  rating: number | string;
  link: string;
  image: string;
};

export async function fetchShoppingProducts(
  q: string
): Promise<{ ok: true; products: ShoppingProduct[] } | { ok: false; error: string; status: number }> {
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
  const products: ShoppingProduct[] = raw.slice(0, 12).map((item: unknown, index: number) => {
    const row = item as Record<string, unknown>;
    return {
      id: index + 1,
      title: String(row.title || "Unknown product"),
      store: String(row.source || "Unknown store"),
      price: Number(row.extracted_price) || 0,
      displayPrice: String(row.price || ""),
      rating: (row.rating as number | string) ?? "N/A",
      link: String(row.link || row.product_link || "#"),
      image: String(row.thumbnail || ""),
    };
  });

  return { ok: true, products };
}
