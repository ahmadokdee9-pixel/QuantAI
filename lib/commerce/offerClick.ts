import type { QuantProduct } from "@/lib/shoppingScore";
import { resolveBestOutboundUrl } from "@/lib/search/directMerchantRouter";
import { isGoogleShoppingInterstitial, isGoogleUrl } from "@/lib/search/googleShoppingUrls";

/** True when href is a safe http(s) URL for an outbound product click. */
export function isValidHttpOfferUrl(href: string): boolean {
  const t = href.trim();
  if (t.startsWith("/api/outbound?")) return true;
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
  p: Pick<QuantProduct, "link" | "offerOutboundUrl" | "store" | "title" | "outboundRouteKind" | "qiBuyingDecision">
): string {
  const pickUsable = (u: string | undefined): string | null => {
    if (!u || !isValidHttpOfferUrl(u) || looksUnsafeProtocol(u)) return null;
    if (!isGoogleUrl(u)) return u;
    if (isGoogleShoppingInterstitial(u)) return null;
    return u;
  };

  const withTracking = (url: string): string => {
    const params = new URLSearchParams({
      to: url,
      merchant: p.store,
      title: p.title.slice(0, 180),
    });
    if (p.outboundRouteKind) params.set("route", p.outboundRouteKind);
    if (p.qiBuyingDecision?.action) params.set("decision", p.qiBuyingDecision.action);
    return `/api/outbound?${params.toString()}`;
  };

  const outbound = pickUsable(p.offerOutboundUrl);
  if (outbound) return withTracking(outbound);

  const link = pickUsable(p.link);
  if (link) return withTracking(link);

  const mr = resolveBestOutboundUrl({
    link: typeof p.link === "string" && p.link.startsWith("http") ? p.link : "#",
    store: p.store,
    title: p.title,
    geoGl: "nl",
  });
  if (mr.href.startsWith("http") && mr.kind === "merchant_search") return withTracking(mr.href);

  if (p.offerOutboundUrl && isValidHttpOfferUrl(p.offerOutboundUrl) && !looksUnsafeProtocol(p.offerOutboundUrl)) {
    return withTracking(p.offerOutboundUrl);
  }
  if (p.link && isValidHttpOfferUrl(p.link) && !looksUnsafeProtocol(p.link)) return withTracking(p.link);
  return "#";
}
