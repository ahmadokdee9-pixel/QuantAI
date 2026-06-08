/**
 * Phase 41 — Universal Query Intelligence.
 * Arabic, English, typos, vague intent, emotional queries.
 */

import { detectCategoryFromQuery } from "@/lib/intelligence/globalCategoryIntelligenceEngine";
import { detectShopperIntentMode } from "@/lib/intelligence/shopperIntentModeEngine";
import type { CategoryProfileKey } from "@/lib/intelligence/categoryProfileRegistry";

export type UniversalQueryIntelligence = {
  version: 1;
  language: "en" | "ar" | "mixed" | "unknown";
  categoryKey: CategoryProfileKey;
  buyerIntent: string;
  budgetLevel: "budget" | "value" | "premium" | "unknown";
  qualityExpectation: "basic" | "good" | "premium";
  urgency: "low" | "medium" | "high";
  styleSignals: string[];
  mustHaveAttributes: string[];
  queryConfidence: number;
  understandingLine: string;
};

const ARABIC_RE = /[\u0600-\u06FF]/;

/** Infer universal query understanding from any search text. */
export function buildUniversalQueryIntelligence(searchQuery: string): UniversalQueryIntelligence {
  const q = searchQuery.trim();
  const lower = q.toLowerCase();
  const hasArabic = ARABIC_RE.test(q);
  const language: UniversalQueryIntelligence["language"] = hasArabic && /[a-z]/i.test(q) ? "mixed" : hasArabic ? "ar" : q ? "en" : "unknown";

  const categoryKey = detectCategoryFromQuery(
    hasArabic
      ? `${lower} ${/كنبة|كنب|أريكة|صوفا|ركن/i.test(q) ? "sofa corner" : ""} ${/رخيص|ارخص|أرخص/i.test(q) ? "cheap budget" : ""} ${/جوال|آيفون|iphone/i.test(q) ? "iphone phone" : ""} ${/لابتوب|لaptop/i.test(q) ? "laptop" : ""}`
      : lower
  );

  const shopper = detectShopperIntentMode(lower);

  let budgetLevel: UniversalQueryIntelligence["budgetLevel"] = "value";
  if (/cheap|budget|affordable|under \d|€\d{2,3}\b|رخيص|ارخص|أرخص/i.test(lower)) budgetLevel = "budget";
  else if (/premium|luxury|best|top|flagship|pro max|راقي|فاخر/i.test(lower)) budgetLevel = "premium";

  let qualityExpectation: UniversalQueryIntelligence["qualityExpectation"] = "good";
  if (/budget|cheap|basic|entry|رخيص/i.test(lower)) qualityExpectation = "basic";
  else if (/premium|luxury|best|professional|pro|فاخر|جودة/i.test(lower)) qualityExpectation = "premium";

  let urgency: UniversalQueryIntelligence["urgency"] = "medium";
  if (/today|now|urgent|asap|fast|quick|فور/i.test(lower)) urgency = "high";
  else if (/wait|later|compare|when|متى/i.test(lower)) urgency = "low";

  const styleSignals: string[] = [];
  if (/modern|scandi|minimal|contemporary|عصري/i.test(lower)) styleSignals.push("modern");
  if (/classic|traditional|كلاسيك/i.test(lower)) styleSignals.push("classic");
  if (/corner|sectional|زاوية|ركن/i.test(lower)) styleSignals.push("corner");

  const mustHaveAttributes: string[] = [];
  if (/programming|developer|coding|engineer/i.test(lower)) mustHaveAttributes.push("performance", "ram", "battery");
  if (/camera|photo|selfie/i.test(lower)) mustHaveAttributes.push("camera", "storage");
  if (/free delivery|shipping/i.test(lower)) mustHaveAttributes.push("delivery");
  if (/warranty|return/i.test(lower)) mustHaveAttributes.push("warranty");

  const queryConfidence = clamp(Math.round(52 + styleSignals.length * 6 + mustHaveAttributes.length * 5 + (q.length > 4 ? 8 : 0)), 0, 95);

  return {
    version: 1,
    language,
    categoryKey,
    buyerIntent: shopper.primaryMode,
    budgetLevel,
    qualityExpectation,
    urgency,
    styleSignals,
    mustHaveAttributes,
    queryConfidence,
    understandingLine: `Query understood as ${categoryKey} search — ${shopper.primaryMode}, ${budgetLevel} budget, ${qualityExpectation} quality expectation.`,
  };
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}
