/**
 * Lightweight semantic expansion for commerce OS (synonym clusters, lifestyle glue).
 * Not a full embedding index — deterministic expansion for ranking + context only.
 */

const SYNONYM_CLUSTERS: readonly { keys: RegExp; add: string }[] = [
  { keys: /\b(perfume|parfum|cologne|fragrance)\b/i, add: " scent luxury beauty " },
  { keys: /\b(underwear|lingerie|bras?|boxers?)\b/i, add: " intimate apparel comfort " },
  { keys: /\b(watch|timepiece)\b/i, add: " wristwear luxury accessory " },
  { keys: /\b(headphones|earbuds|earphones)\b/i, add: " audio listening wireless anc " },
  { keys: /\b(chair|seating)\b/i, add: " ergonomic desk office " },
  { keys: /\b(monitor|display)\b/i, add: " screen desk setup creator " },
  { keys: /\b(laptop|notebook\s+pc)\b/i, add: " portable computer ultrabook " },
  { keys: /\b(gift)\b/i, add: " present occasion thoughtful " },
  { keys: /\b(cheap\s+but\s+not\s+garbage|not\s+junk)\b/i, add: " quality value durable " },
  { keys: /\b(safe\s+choice|safe\s+bet)\b/i, add: " trusted reliable low risk " },
  {
    keys: /\b(clean\s+girl|that\s+girl|old\s+money|quiet\s+luxury|smells?\s+rich|expensive\s+looking)\b/i,
    add: " aesthetic taste identity emotional commerce premium perception ",
  },
  {
    keys: /\b(luxury\s+setup|desk\s+aesthetic|room\s+aesthetic|vibe|aesthetic)\b/i,
    add: " visual identity lifestyle setup ",
  },
];

export function expandCommerceSemantics(s: string): string {
  let out = ` ${s} `;
  for (const { keys, add } of SYNONYM_CLUSTERS) {
    if (keys.test(s)) out += add;
  }
  return out.replace(/\s+/g, " ").trim();
}
