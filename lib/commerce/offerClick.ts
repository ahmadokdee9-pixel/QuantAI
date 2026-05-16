import type { QuantProduct } from "@/lib/shoppingScore";
import { resolveBestOutboundUrl } from "@/lib/search/directMerchantRouter";
import { isGoogleShoppingInterstitial, isGoogleUrl } from "@/lib/search/googleShoppingUrls";

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

function looksUnsafeProtocol(href: string): boolean {
  return /^\s*(javascript|data|vbscript):/i.test(href);
}

/**
 * Prefer a direct merchant URL when valid and non-Google-interstitial; otherwise first-party
 * `link` if usable; otherwise merchant-site search (never a bare `#` when avoidable).
 */
export function resolveOfferClickUrl(
  p: Pick<QuantProduct, "link" | "offerOutboundUrl" | "store" | "title">
): string {
  const pickUsable = (u: string | undefined): string | null => {
    if (!u || !isValidHttpOfferUrl(u) || looksUnsafeProtocol(u)) return null;
    if (!isGoogleUrl(u)) return u;
    if (isGoogleShoppingInterstitial(u)) return null;
    return u;
  };

  const outbound = pickUsable(p.offerOutboundUrl);
  if (outbound) return outbound;

  const link = pickUsable(p.link);
  if (link) return link;

  const mr = resolveBestOutboundUrl({
    link: typeof p.link === "string" && p.link.startsWith("http") ? p.link : "#",
    store: p.store,
    title: p.title,
    geoGl: "nl",
  });
  if (mr.href.startsWith("http") && mr.kind === "merchant_search") return mr.href;

  if (p.offerOutboundUrl && isValidHttpOfferUrl(p.offerOutboundUrl) && !looksUnsafeProtocol(p.offerOutboundUrl)) {
    return p.offerOutboundUrl;
  }
  if (p.link && isValidHttpOfferUrl(p.link) && !looksUnsafeProtocol(p.link)) return p.link;
  return "#";
}
