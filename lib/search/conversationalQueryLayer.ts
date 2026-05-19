/**
 * Deterministic conversational cleanup: typos + light noise that would otherwise
 * fragment intent matching and upstream recall. Safe for cache keys and ranking.
 */

const TYPO_PAIRS: [RegExp, string][] = [
  [/\biphne|ipgone|iphoen|iphine\b/gi, "iphone"],
  [/\bipad\b(?!\s*mini)/gi, "ipad"],
  [/\bsamsng|sansung|samsun\b/gi, "samsung"],
  [/\bmacbok|mackbook|macbookk\b/gi, "macbook"],
  [/\bairpords|airpodss|airpodspro\b/gi, "airpods"],
  [/\bplaystaion|playstion\b/gi, "playstation"],
  [/\bmoniter\b/gi, "monitor"],
  [/\blaptp|labtop\b/gi, "laptop"],
  [/\beurpean\b/gi, "european"],
];

export function fixCommonCommerceTypos(q: string): string {
  let s = q;
  for (const [rx, rep] of TYPO_PAIRS) {
    s = s.replace(rx, rep);
  }
  return s;
}

/** Appended to query text for title/store overlap scoring only (not shown to users). */
export function relevanceLexicalExpansion(query: string): string {
  const t = query.toLowerCase();
  const bits: string[] = [];
  if (/\b(phone|iphone|galaxy|pixel|smartphone|mobile|cell)\b/i.test(t)) {
    bits.push("smartphone mobile cellular handset");
  }
  if (/\b(laptop|notebook|ultrabook|macbook|chromebook)\b/i.test(t)) {
    bits.push("notebook computer portable pc");
  }
  if (/\b(earbuds|airpods|headphones|headset|wh-1000)\b/i.test(t)) {
    bits.push("wireless audio headphones");
  }
  if (/\b(oled|qled|tv|television)\b/i.test(t)) {
    bits.push("television 4k display screen");
  }
  if (/\b(monitor|display)\b/i.test(t)) {
    bits.push("screen display panel");
  }
  if (/\b(gpu|graphics\s+card|video\s+card)\b/i.test(t)) {
    bits.push("graphics video gpu");
  }
  if (/\b(watch|smartwatch)\b/i.test(t)) {
    bits.push("wearable wrist");
  }
  if (/\b(focus|concentration|study|deep work)\b/i.test(t)) {
    bits.push("noise cancelling anc wireless over ear");
  }
  if (/\b(common projects|minimal white sneakers?)\b/i.test(t)) {
    bits.push("minimal leather sneaker achilles low");
  }
  if (/\b(vomero|pegasus|ultraboost)\b/i.test(t)) {
    bits.push("running shoe trainer nike");
  }
  if (/\b(ps5|playstation\s*5)\b/i.test(t)) {
    bits.push("gaming monitor hdmi 2.1 120hz vrr");
  }
  if (/\b(premium looking|luxury feel|cheap but luxury)\b/i.test(t)) {
    bits.push("premium designer quality aesthetic");
  }
  return bits.length ? ` ${bits.join(" ")}` : "";
}
