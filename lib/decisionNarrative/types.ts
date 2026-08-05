/**
 * Decision Narrative — premium analyst prose over existing intelligence outputs.
 * Not a chatbot. Not a second ranker. Structured reasoning only.
 */

export type NarrativeBlockId =
  | "situation"
  | "current_reality"
  | "key_forces"
  | "main_opportunity"
  | "main_risk"
  | "why_waiting"
  | "why_acting"
  | "confidence"
  | "what_would_change"
  | "expected_next";

export type NarrativeBlock = {
  id: NarrativeBlockId;
  title: string;
  /** Max four concise sentences. */
  lines: string[];
};

export type DecisionNarrativeBrief = {
  version: 1;
  /** One-line reading lead for the card. */
  lead: string;
  blocks: NarrativeBlock[];
};
