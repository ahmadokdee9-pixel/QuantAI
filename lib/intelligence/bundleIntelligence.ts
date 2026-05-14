/**
 * Lightweight bundle / ecosystem hints from a single tray (no new SKUs).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { ShopperPersonaProfile } from "./shopperPersona";

export type BundleSuggestion = {
  anchorLink: string;
  companionLink: string;
  reason: string;
};

type Rule = { q: RegExp; anchor: RegExp; buddy: RegExp; reason: string };

const RULES: Rule[] = [
  {
    q: /iphone|ipad|airpod|magsafe/i,
    anchor: /iphone|ipad/i,
    buddy: /case|cover|charger|cable|magsafe|screen protector/i,
    reason: "Ecosystem bundle: case or charging-adjacent SKU pairs naturally with the phone language in this tray.",
  },
  {
    q: /laptop|macbook|thinkpad|ultrabook/i,
    anchor: /laptop|macbook|thinkpad|notebook/i,
    buddy: /mouse|dock|hub|bag|sleeve|keyboard/i,
    reason: "Productivity bundle: bags, docks, and pointer gear often complete the same desk story as the laptop row.",
  },
  {
    q: /desk|monitor|setup|office chair|standing desk/i,
    anchor: /monitor|display|desk|chair/i,
    buddy: /lamp|arm|mount|mat|hub|keyboard|speaker/i,
    reason: "Workspace bundle: mounts and desk peripherals cluster with display/chair language in this snapshot.",
  },
  {
    q: /vacuum|dyson|cleaner/i,
    anchor: /vacuum|cleaner/i,
    buddy: /filter|brush|dock|accessory/i,
    reason: "Appliance bundle: consumables and accessory parts often sit adjacent to the main cleaner listing.",
  },
  {
    q: /headphone|earbud|airpod/i,
    anchor: /headphone|earbud|airpod/i,
    buddy: /case|charger|stand|dac|cable/i,
    reason: "Audio bundle: carry/stand/charge accessories frequently co-purchase with headphone-class titles.",
  },
];

export function buildBundleSuggestions(
  products: QuantProduct[],
  query: string,
  profile: ShopperPersonaProfile
): BundleSuggestion[] {
  if (products.length < 2) return [];
  const out: BundleSuggestion[] = [];
  const qHit = RULES.filter((r) => r.q.test(query));
  const rules = qHit.length ? qHit : RULES.slice(0, 3);

  for (const rule of rules) {
    const anchors = products.filter((p) => rule.anchor.test(p.title));
    const buddies = products.filter((p) => rule.buddy.test(p.title) && !rule.anchor.test(p.title));
    for (const a of anchors.slice(0, 2)) {
      for (const b of buddies.slice(0, 3)) {
        if (a.link === b.link) continue;
        if (profile.dominant.includes("premium_buyer") && a.price + b.price > 6000) continue;
        out.push({ anchorLink: a.link, companionLink: b.link, reason: rule.reason });
        if (out.length >= 4) return dedupe(out);
      }
    }
  }
  return dedupe(out).slice(0, 3);
}

function dedupe(rows: BundleSuggestion[]): BundleSuggestion[] {
  const seen = new Set<string>();
  const r: BundleSuggestion[] = [];
  for (const x of rows) {
    const k = `${x.anchorLink}|${x.companionLink}`;
    if (seen.has(k)) continue;
    seen.add(k);
    r.push(x);
  }
  return r;
}
