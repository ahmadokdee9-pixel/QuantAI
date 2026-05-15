import type { QuantProduct } from "@/lib/shoppingScore";
import { isGoogleUrl } from "@/lib/search/googleShoppingUrls";

/** Small deterministic nudge for tray ranking from outbound URL quality. */
export function outboundCompositeNudge(p: QuantProduct): number {
  let d = 0;
  const kind = p.outboundRouteKind;
  if (kind === "direct_merchant") d += 2.2;
  else if (kind === "merchant_search") d += 1.1;
  else if (kind === "google_interstitial") d -= 0.9;
  else if (kind === "google_fallback") d -= 2.5;

  if (!p.image?.trim()) d -= 0.9;
  if (p.price <= 0 && !String(p.displayPrice || "").trim()) d -= 1.4;
  if (p.title.trim().length < 12) d -= 0.6;
  const href = p.offerOutboundUrl && p.offerOutboundUrl.startsWith("http") ? p.offerOutboundUrl : p.link;
  if (href.startsWith("http") && isGoogleUrl(href)) d -= 0.5;

  return d;
}
