/**
 * Google Shopping URL detection & redirect unwrapping (shared by fetch + merchant router).
 */

const GOOGLE_HOST = /^(www\.)?google\./i;

function isGoogleHost(hostname: string): boolean {
  return GOOGLE_HOST.test(hostname);
}

/** True when URL hostname is a Google property (Shopping redirect, search, etc.). */
export function isGoogleUrl(href: string): boolean {
  try {
    return isGoogleHost(new URL(href.trim()).hostname);
  } catch {
    return false;
  }
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

/** Walk Google redirect/query parameters to reveal an encoded merchant URL, if any. */
export function unwrapGoogleToNonGoogle(href: string): string | null {
  let cur = href.trim();
  for (let i = 0; i < 6; i++) {
    let host: string;
    try {
      host = new URL(cur).hostname;
    } catch {
      return null;
    }
    if (!isGoogleHost(host)) return cur;
    const next = unwrapGoogleRedirectParams(cur);
    if (!next || next === cur) return null;
    cur = next;
  }
  try {
    return isGoogleHost(new URL(cur).hostname) ? null : cur;
  } catch {
    return null;
  }
}
