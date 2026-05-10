/** Map shipping copy to 0–1 delivery speed / friction signal. */
export function scoreDeliverySpeed(shipping: string | null): number {
  if (!shipping || !shipping.trim()) return 0.62;
  const s = shipping.toLowerCase();
  if (/same\s*day|today|within\s*1\s*h|1\s*h\s*delivery/i.test(s)) return 1;
  if (/tomorrow|next\s*day|24\s*h|1\s*[- ]?day|overnight/i.test(s)) return 0.95;
  if (/2\s*[- ]?day|48\s*h|two\s*day/i.test(s)) return 0.88;
  if (/free.*(fast|quick|prime)|prime|express/i.test(s)) return 0.9;
  if (/\bfree\b/i.test(s)) return 0.78;
  if (/pickup|collect/i.test(s)) return 0.85;
  if (/international|worldwide|ships from/i.test(s)) return 0.52;
  if (/week|business\s*day|5\s*[- ]?7|7\s*[- ]?10/i.test(s)) return 0.45;
  return 0.68;
}
