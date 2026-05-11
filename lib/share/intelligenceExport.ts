import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";

export function buildTraySummary(query: string, products: QuantProduct[]): string {
  const top = products.slice(0, 5);
  const lines = [
    `QuantAI · Intelligence snapshot`,
    `Query: ${query}`,
    `Listings: ${products.length}`,
    "",
    ...top.map((p, i) => {
      const q = getFinalComposite(p, products);
      const t = getStoreTrustScore(p.store);
      return `${i + 1}. ${p.title.slice(0, 80)}${p.title.length > 80 ? "…" : ""}\n   ${p.store} · QI ${q} · Trust ${t} · ${p.displayPrice || p.price}`;
    }),
    "",
    "AI decision support only—not financial advice. Verify at checkout.",
  ];
  return lines.join("\n");
}

export function buildProductSnapshot(p: QuantProduct, list: QuantProduct[]): string {
  const q = getFinalComposite(p, list);
  const t = getStoreTrustScore(p.store);
  return [
    `QuantAI · Listing card`,
    p.title,
    `${p.store} · Trust ${t} · QI ${q}`,
    p.displayPrice || String(p.price),
    p.link,
    "",
    p.qiReason?.trim() || "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildCompareExport(products: QuantProduct[]): string {
  const list = products;
  return [
    `QuantAI · Compare lab (${products.length})`,
    "",
    ...products.map((p, i) => {
      const q = getFinalComposite(p, list);
      return `${i + 1}. ${p.title}\n   ${p.store} · QI ${q} · ${ratingValue(p.rating).toFixed(1)}★ · ${p.displayPrice || p.price}\n   ${p.link}`;
    }),
    "",
    "Verify price and seller before purchase.",
  ].join("\n");
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function shareText(title: string, text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text });
      return true;
    } catch {
      return false;
    }
  }
  return copyText(text);
}
