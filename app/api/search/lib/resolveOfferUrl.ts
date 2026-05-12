/**
 * Pick the best outbound URL for a Google Shopping row.
 * Prefers merchant hosts; keeps Google Shopping only as a last resort.
 */

const GOOGLE_HOST = /^(www\.)?google\./i;

function isGoogleHost(hostname: string): boolean {
  return GOOGLE_HOST.test(hostname);
}

/** True when URL is clearly a Google Shopping / interstitial surface (not a merchant checkout). */
export function isGoogleShoppingInterstitial(href: string): boolean {
  try {
    const u = new URL(href);
    if (!isGoogleHost(u.hostname)) return false;
    const s = `${u.pathname}${u.search}`.toLowerCase();
    if (s.includes("/shopping")) return true;
    if (s.includes("/product")) return true;
    if (s.includes("udm=28")) return true;
    if (s.includes("ibp=oshop")) return true;
    if (s.includes("/aclk")) return true;
    if (s.includes("/url?")) return true;
    return false;
  } catch {
    return true;
  }
}

function tryDecodeNestedUrl(raw: string): string | null {
  const t = raw.trim();
  if (!/^https?:\/\//i.test(t)) return null;
  try {
    const inner = new URL(t);
    if (!isGoogleHost(inner.hostname)) return t;
  } catch {
    return null;
  }
  return null;
}

/** Extract merchant URL from Google redirect / ad URLs when encoded. */
function unwrapGoogleRedirectParams(href: string): string | null {
  try {
    const u = new URL(href);
    const keys = ["q", "url", "adurl", "u", "destination", "continue"];
    for (const k of keys) {
      const v = u.searchParams.get(k);
      if (!v) continue;
      const decoded = decodeURIComponent(v.replace(/\+/g, " "));
      const out = tryDecodeNestedUrl(decoded);
      if (out) return out;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function collectCandidateUrls(row: Record<string, unknown>): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v !== "string") return;
    const t = v.trim();
    if (t.startsWith("http://") || t.startsWith("https://")) out.push(t);
  };

  push(row.link);
  push(row.product_link);

  const offers = row.offers;
  if (Array.isArray(offers)) {
    for (const o of offers) {
      if (o && typeof o === "object") {
        const r = o as Record<string, unknown>;
        push(r.link);
        push(r.url);
        push(r.direct_link);
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
    const unwrapped = unwrapGoogleRedirectParams(href);
    if (unwrapped) return unwrapped;
  }

  for (const href of candidates) {
    if (!isGoogleShoppingInterstitial(href)) return href;
  }

  return candidates[0] ?? "#";
}
