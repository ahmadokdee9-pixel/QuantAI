/** Feed- and query-only persona hints for copy tone (not user profiling). */

export type BuyerPersonaTag =
  | "budget_buyer"
  | "premium_buyer"
  | "gamer"
  | "student"
  | "office_setup"
  | "creator_pro"
  | "general";

export function inferBuyerPersonasFromQuery(query: string): BuyerPersonaTag[] {
  const q = query.toLowerCase();
  const out = new Set<BuyerPersonaTag>();

  if (/\b(cheap|budget|under|below|affordable|value|deal)\b/i.test(q)) out.add("budget_buyer");
  if (/\b(premium|pro\b|workstation|flagship|best\b|top\b|ultimate)\b/i.test(q)) out.add("premium_buyer");
  if (/game|gaming|fps|hz|gpu|console|ps5|xbox|steam/i.test(q)) out.add("gamer");
  if (/student|uni|college|school|chromebook/i.test(q)) out.add("student");
  if (/office|wfh|business|ergonomic|monitor arm|docking/i.test(q)) out.add("office_setup");
  if (/creator|photo|video|render|color|davinci|premiere|lightroom/i.test(q)) out.add("creator_pro");
  if (out.size === 0) out.add("general");

  return [...out].slice(0, 4);
}

export function personaGuidanceLine(personas: BuyerPersonaTag[]): string {
  const p = personas[0] ?? "general";
  switch (p) {
    case "budget_buyer":
      return "Budget lens: prioritize price-to-trust and review depth over headline discounts.";
    case "premium_buyer":
      return "Premium lens: small composite gaps may buy warranty, service, and spec headroom.";
    case "gamer":
      return "Gaming lens: validate refresh, thermals, and return policy—marketing loves inflated “gaming” labels.";
    case "student":
      return "Student lens: weight portability, durability, and repairability over peak performance.";
    case "office_setup":
      return "Office lens: ergonomics, noise, and multi-monitor compatibility often beat marginal CPU gains.";
    case "creator_pro":
      return "Creator lens: verify color accuracy claims and return policy for panel lottery.";
    default:
      return "Generalist lens: balance trust, reviews, and price before optimizing niche specs.";
  }
}
