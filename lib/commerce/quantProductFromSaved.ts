import type { QuantProduct } from "@/lib/shoppingScore";

export type SavedProductAPIRow = {
  title: string | null;
  price: number | null;
  image: string | null;
  link: string;
  ai_score?: number | null;
};

function stableNumericIdFromLink(link: string): number {
  let h = 0;
  for (let i = 0; i < link.length; i++) {
    h = Math.imul(31, h) + link.charCodeAt(i);
  }
  const n = Math.abs(h) % 2147483646;
  return n === 0 ? 1 : n;
}

function storeLabelFromLink(link: string): string {
  try {
    const u = new URL(link);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "Listing";
  }
}

/** Reconstructs a minimal `QuantProduct` from persisted saved-product rows for tray state. */
export function quantProductFromSavedRow(row: SavedProductAPIRow): QuantProduct {
  const price = typeof row.price === "number" && Number.isFinite(row.price) ? row.price : 0;
  const title = row.title?.trim() || "Saved listing";
  const image = row.image ?? "";
  const qiRaw = row.ai_score;
  const qi =
    qiRaw != null && Number.isFinite(Number(qiRaw)) ? Math.min(100, Math.max(0, Number(qiRaw))) : undefined;
  const dec = price > 0 && price % 1 !== 0 ? 2 : 0;
  return {
    id: stableNumericIdFromLink(row.link),
    title,
    store: storeLabelFromLink(row.link),
    price,
    displayPrice: price > 0 ? `€${price.toFixed(dec)}` : "—",
    rating: 0,
    link: row.link,
    image,
    reviewsCount: null,
    shipping: null,
    availability: null,
    oldPrice: null,
    priceTrend: "stable",
    extensions: [],
    qiComposite: qi,
  };
}
