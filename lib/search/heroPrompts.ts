/** Max smart-suggestion cards when the user opens the suggestions panel (no in-panel scroll). */
export const HERO_COMMAND_SUGGESTION_CAP = 6 as const;
/** Max recent-query chips in the main command card (no scroll). */
export const HERO_COMMAND_HISTORY_CAP = 3 as const;

/** One-tap examples — realistic purchase intents QuantAI understands. */
export const HERO_SEARCH_PROMPTS: readonly string[] = [
  "Sony WH-1000XM5 — lowest price from a trusted EU seller",
  "Standing desk under €400 — stable inventory preferred",
  "MacBook Air M3 — compare Apple vs bol.com vs MediaMarkt",
  "Dyson V15 — verify the discount is credible, not an outlier",
  "IKEA PAX wardrobe — best total cost including delivery",
  "Samsung OLED 55\" — buy-ready if under market average",
];

/** Rotating placeholders — natural shopping language. */
export const HERO_INPUT_PLACEHOLDERS: readonly string[] = [
  "What are you looking to buy today?",
  "AirPods Pro — safest seller under €220…",
  "Ergonomic office chair — trusted retailer only…",
  "Gaming monitor 1440p — real discount, not bait pricing…",
  "Dyson Airwrap — compare trusted EU sources…",
  "iPhone 16 — buy-ready verdict across retailers…",
];
