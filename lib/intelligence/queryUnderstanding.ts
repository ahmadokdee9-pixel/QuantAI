/**
 * QuantAI query understanding — normalize messy human language for intent + ranking.
 */

import { fixCommonCommerceTypos } from "@/lib/search/conversationalQueryLayer";
import { latinSkeletonForMatching, normalizeEasternDigitsInString } from "@/lib/search/queryScriptNormalize";
export type QueryUnderstanding = {
  raw: string;
  /** Typo-fixed + whitespace-normalized. */
  rewritten: string;
  /** Lowercase lexical envelope for detectors (not for upstream fetch). */
  normalizedEnvelope: string;
  inferredCategories: string[];
  missingContextInferences: string[];
};

const SLANG_REPLACEMENTS: [RegExp, string][] = [
  [/\baf1s?\b/gi, "air force 1"],
  [/\bafs?\b(?=\s|$)/gi, "air force"],
  [/\bmfp\b/gi, "multifunction printer"],
  [/\bugg?s?\b/gi, "ultra graphics"],
  [/\bmbp\b/gi, "macbook pro"],
  [/\bmba\b/gi, "macbook air"],
];

/** Map common shorthand / hype tokens to clearer commerce terms. */
export function normalizeShoppingSlang(q: string): string {
  let s = q;
  for (const [rx, rep] of SLANG_REPLACEMENTS) {
    s = s.replace(rx, rep);
  }
  return s;
}

/** Collapse noise; does not change user-visible casing beyond typo fixes. */
export function rewriteMessyHumanQuery(raw: string): string {
  const fixed = fixCommonCommerceTypos(raw.trim());
  const slang = normalizeShoppingSlang(fixed);
  return slang.replace(/\s+/g, " ").trim();
}

function envelopeFrom(s: string): string {
  const digits = normalizeEasternDigitsInString(s);
  return `${digits} ${latinSkeletonForMatching(digits)}`.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Lightweight category hints when the query is lifestyle-led or vague. */
export function inferHiddenProductCategories(rewritten: string): string[] {
  const e = envelopeFrom(rewritten);
  const out: string[] = [];
  if (/\b(desk setup|desk accessories|monitor arm|keyboard tray)\b/i.test(e)) out.push("desk_workspace");
  if (/\b(clean desk|minimal desk)\b/i.test(e)) out.push("minimal_workspace");
  if (/\b(gaming laptop|student laptop|college laptop)\b/i.test(e)) out.push("portable_computer");
  if (/\b(iphone|galaxy|pixel)\b/i.test(e) && /\b(deal|discount|now)\b/i.test(e)) out.push("phone_deal_window");
  if (/\b(sneakers?|trainers?|kicks)\b/i.test(e)) out.push("footwear");
  return out;
}

/** Short inferred goals the user did not spell out explicitly (query text only). */
export function inferMissingShoppingContext(rewritten: string): string[] {
  const e = envelopeFrom(rewritten);
  const hints: string[] = [];
  if (/\bworth\s+waiting\b/i.test(e) || /\bwait(ing)?\s+for\s+discount\b/i.test(e)) {
    hints.push("timing_vs_discount");
  }
  if (/\b(safe|trusted)\s+(seller|store|pick|option)\b/i.test(e) || /\bofficial\s+store\b/i.test(e)) {
    hints.push("trust_first_gate");
  }
  if (/\b(right now|today|tonight|asap|urgent|need it)\b/i.test(e) && /\b(deal|discount|sale|price)\b/i.test(e)) {
    hints.push("urgent_deal_hunt");
  }
  if (/\b(student|uni|university|college)\b/i.test(e) && /\b(gaming|gamer|rtx)\b/i.test(e)) {
    hints.push("student_gaming_balance");
  }
  if (/\b(cheap|budget|under\s+\$|affordable)\b/i.test(e) && /\b(premium look|looks premium|luxury look|expensive look)\b/i.test(e)) {
    hints.push("premium_look_budget_ceiling");
  }
  return hints;
}

export function buildQueryUnderstanding(rawQuery: string): QueryUnderstanding {
  const raw = rawQuery.trim();
  const rewritten = raw ? rewriteMessyHumanQuery(raw) : "";
  const normalizedEnvelope = rewritten ? envelopeFrom(rewritten) : "";
  const inferredCategories = rewritten ? inferHiddenProductCategories(rewritten) : [];
  const missingContextInferences = rewritten ? inferMissingShoppingContext(rewritten) : [];
  return { raw, rewritten, normalizedEnvelope, inferredCategories, missingContextInferences };
}
