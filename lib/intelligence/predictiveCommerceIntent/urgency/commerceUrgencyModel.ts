/**
 * Phase 14 — Commerce urgency modeling.
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function modelCommerceUrgency(query: string): {
  urgency01: number;
  tier: "low" | "moderate" | "high";
} {
  const q = query.toLowerCase();
  let urgency01 = 0.2;
  if (/\b(urgent|today|now|asap|limited)\b/.test(q)) urgency01 += 0.5;
  if (/\b(soon|this week)\b/.test(q)) urgency01 += 0.25;
  urgency01 = round4(Math.min(1, urgency01));
  const tier: "low" | "moderate" | "high" =
    urgency01 > 0.55 ? "high" : urgency01 > 0.3 ? "moderate" : "low";
  return { urgency01, tier };
}
