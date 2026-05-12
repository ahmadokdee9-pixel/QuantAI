/** Client-only lightweight signals (localStorage). No provider; safe to call from event handlers. */

const KEY = "quantai_local_signals_v1";

export type LocalSignals = {
  recentSearches: string[];
  viewedLinks: string[];
  interestTags: string[];
};

const defaultSignals = (): LocalSignals => ({
  recentSearches: [],
  viewedLinks: [],
  interestTags: [],
});

export function readLocalSignals(): LocalSignals {
  if (typeof window === "undefined") return defaultSignals();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultSignals();
    const parsed = JSON.parse(raw) as Partial<LocalSignals>;
    return {
      recentSearches: Array.isArray(parsed.recentSearches)
        ? parsed.recentSearches.filter((x): x is string => typeof x === "string")
        : [],
      viewedLinks: Array.isArray(parsed.viewedLinks)
        ? parsed.viewedLinks.filter((x): x is string => typeof x === "string")
        : [],
      interestTags: Array.isArray(parsed.interestTags)
        ? parsed.interestTags.filter((x): x is string => typeof x === "string")
        : [],
    };
  } catch {
    return defaultSignals();
  }
}

function writeLocalSignals(next: LocalSignals): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export function appendLocalRecentSearch(query: string): void {
  const q = query.trim().slice(0, 200);
  if (!q) return;
  const s = readLocalSignals();
  s.recentSearches = [q, ...s.recentSearches.filter((x) => x !== q)].slice(0, 24);
  writeLocalSignals(s);
}

export function recordViewedProductLink(link: string): void {
  const u = link.trim().slice(0, 2000);
  if (!u) return;
  const s = readLocalSignals();
  s.viewedLinks = [u, ...s.viewedLinks.filter((x) => x !== u)].slice(0, 48);
  writeLocalSignals(s);
}

export function recordInterestTag(tag: string): void {
  const t = tag.trim().slice(0, 64);
  if (!t) return;
  const s = readLocalSignals();
  s.interestTags = [t, ...s.interestTags.filter((x) => x !== t)].slice(0, 16);
  writeLocalSignals(s);
}
