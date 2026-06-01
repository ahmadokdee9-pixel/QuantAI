/**
 * Honest decision-intelligence framing — unified QuantAI decision language.
 */

import { confidenceAlignmentLabel, type PrimaryVerdict } from "@/lib/ui/decisionLanguage";

export const DECISION_DISCLAIMER =
  "Intelligence read from this tray — not financial advice.";

export const DECISION_READ_OVERLINE = "Decision";

export function formatVerdictHeadline(label: string): string {
  return label;
}

export function confidenceFootnote(confidence: number, verdict?: PrimaryVerdict | string): string {
  const label = verdict ?? "";
  return label ? `${confidenceAlignmentLabel(confidence)} · ${label}` : confidenceAlignmentLabel(confidence);
}
