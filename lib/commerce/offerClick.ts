import type { QuantProduct } from "@/lib/shoppingScore";

/** True when href is a safe http(s) URL for an outbound product click. */
export function isValidHttpOfferUrl(href: string): boolean {
  const t = href.trim();
  if (!t.startsWith("http://") && !t.startsWith("https://")) return false;
  try {
    const u = new URL(t);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Prefer routed merchant URL when valid; never drop back to `#` if `link` is usable. */
export function resolveOfferClickUrl(p: Pick<QuantProduct, "link" | "offerOutboundUrl">): string {
  if (p.offerOutboundUrl && isValidHttpOfferUrl(p.offerOutboundUrl)) return p.offerOutboundUrl;
  return p.link;
}
