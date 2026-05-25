/**
 * Phase 17 — Emotional timing detection.
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function detectEmotionalTiming(query: string): { timingLabel: string; urgency01: number } {
  const q = query.toLowerCase();
  if (/\b(today|now|urgent|asap|tonight)\b/.test(q)) {
    return { timingLabel: "immediate_emotional_window", urgency01: 0.78 };
  }
  if (/\b(gift|birthday|anniversary|holiday)\b/.test(q)) {
    return { timingLabel: "occasion_bound", urgency01: 0.55 };
  }
  if (/\b(research|compare|later)\b/.test(q)) {
    return { timingLabel: "deliberate_delay", urgency01: 0.22 };
  }
  return { timingLabel: "exploratory_browse", urgency01: round4(0.35) };
}
