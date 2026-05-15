/**
 * Pick the best outbound URL for a Google Shopping row.
 * Prefers merchant hosts; keeps Google Shopping only as a last resort.
 */

import { isGoogleShoppingInterstitial, unwrapGoogleToNonGoogle } from "@/lib/search/googleShoppingUrls";

function isGoogleHost(hostname: string): boolean {
  return /^(www\.)?google\./i.test(hostname);
}

/** Order matters: first non-Google wins in `resolveShoppingListingLink`. */
function collectCandidateUrls(row: Record<string, unknown>): string[] {
  const orderedKeys: (keyof typeof row)[] = [
    "merchant_link",
    "retailer_link",
    "source_link",
    "direct_link",
    "product_link",
    "link",
    "store_link",
  ];

  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v !== "string") return;
    const t = v.trim();
    if (t.startsWith("http://") || t.startsWith("https://")) out.push(t);
  };

  for (const k of orderedKeys) {
    push(row[k]);
  }

  const offers = row.offers;
  if (Array.isArray(offers)) {
    for (const o of offers) {
      if (o && typeof o === "object") {
        const r = o as Record<string, unknown>;
        push(r.merchant_link);
        push(r.retailer_link);
        push(r.source_link);
        push(r.direct_link);
        push(r.link);
        push(r.url);
      }
    }
  }

  const seen = new Set<string>();
  return out.filter((u) => {
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });
}

export { isGoogleShoppingInterstitial, isGoogleUrl, unwrapGoogleToNonGoogle } from "@/lib/search/googleShoppingUrls";

export function resolveShoppingListingLink(row: Record<string, unknown>): string {
  const candidates = collectCandidateUrls(row);
  if (candidates.length === 0) return "#";

  for (const href of candidates) {
    try {
      const u = new URL(href);
      if (!isGoogleHost(u.hostname)) return href;
    } catch {
      continue;
    }
  }

  for (const href of candidates) {
    const unwrapped = unwrapGoogleToNonGoogle(href) ?? href;
    try {
      if (!isGoogleHost(new URL(unwrapped).hostname)) return unwrapped;
    } catch {
      if (!isGoogleShoppingInterstitial(unwrapped)) return unwrapped;
    }
  }

  for (const href of candidates) {
    if (!isGoogleShoppingInterstitial(href)) return href;
  }

  return candidates[0] ?? "#";
}
