/**
 * Honest decision-intelligence framing — avoids implying objective truth.
 */

export const DECISION_DISCLAIMER =
  "Decision read from retailer signals in this tray — not financial advice or a guaranteed best buy.";

export const DECISION_READ_OVERLINE = "Decision read";

export function formatVerdictHeadline(chipLabel: string): string {
  const u = chipLabel.trim().toUpperCase();
  if (u.includes("STRONG BUY")) return "Strong buy posture";
  if (u.includes("BUY READY") || u === "BUY READY") return "Buy-ready posture";
  if (u.includes("SAFE BUY")) return "Safer buy posture";
  if (u.includes("WAIT")) return "Wait posture";
  if (u.includes("COMPARE")) return "Compare alternatives";
  if (u.includes("AVOID")) return "Avoid posture";
  return chipLabel.replace(/-/g, " ").trim();
}

export function confidenceFootnote(confidence: number): string {
  if (confidence >= 78) return "High alignment within this tray — verify listing details before checkout.";
  if (confidence >= 62) return "Moderate alignment — cross-check price and seller before you buy.";
  return "Lower alignment — treat as directional, not definitive.";
}
