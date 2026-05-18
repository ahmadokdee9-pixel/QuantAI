/** Max smart-suggestion cards when the user opens the suggestions panel (no in-panel scroll). */
export const HERO_COMMAND_SUGGESTION_CAP = 6 as const;
/** Max recent-query chips in the main command card (no scroll). */
export const HERO_COMMAND_HISTORY_CAP = 3 as const;

/** One-tap examples — natural sentences QuantAI already understands. */
export const HERO_SEARCH_PROMPTS: readonly string[] = [
  "Feminine luxury perfume — trusted EU seller",
  "Minimalist desk setup — monitor + keyboard",
  "Best phone under €700",
  "Trusted gaming laptop, not heavy",
  "MacBook alternative, cheaper",
  "Safest AirPods seller",
  "OLED TV — real discount",
  "Noise-cancelling headphones — value",
];

/** Rotating placeholders — calm, minimal. */
export const HERO_INPUT_PLACEHOLDERS: readonly string[] = [
  "What are you buying — budget, trust, region…",
  "Quiet luxury watch under €400…",
  "Safest seller for AirPods Pro…",
  "Gaming laptop under €1200…",
  "Compare OLED TVs…",
  "Gift for a student — durable…",
];
