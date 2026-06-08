/**
 * Phase 35 — Personal Buyer Identity Engine.
 * Canonical buyer personas with confidence for personal commerce intelligence.
 */

import {
  detectBuyerIdentity,
  type BuyerIdentityProfile,
  type BuyerIdentityTrait,
} from "@/lib/intelligence/buyerIdentityEngine";

export type PersonalBuyerIdentityLabel =
  | "Budget Buyer"
  | "Value Buyer"
  | "Family Buyer"
  | "Professional Buyer"
  | "Power User"
  | "Creator"
  | "Luxury Buyer"
  | "Minimalist Buyer"
  | "Productivity Buyer"
  | "Student Buyer"
  | "Business Buyer"
  | "Casual Buyer";

export type PersonalBuyerIdentity = {
  version: 1;
  buyerIdentity: PersonalBuyerIdentityLabel;
  buyerConfidence: number;
  profile: BuyerIdentityProfile;
  dominantTraits: BuyerIdentityTrait[];
};

const TRAIT_TO_LABEL: Partial<Record<BuyerIdentityTrait, PersonalBuyerIdentityLabel>> = {
  budget_conscious: "Budget Buyer",
  value_focused: "Value Buyer",
  family_buyer: "Family Buyer",
  business_buyer: "Business Buyer",
  power_user: "Power User",
  developer: "Power User",
  performance_focused: "Power User",
  content_creator: "Creator",
  camera_focused: "Creator",
  premium_buyer: "Luxury Buyer",
  design_focused: "Luxury Buyer",
  aesthetics_focused: "Minimalist Buyer",
  student: "Student Buyer",
  reliability_focused: "Productivity Buyer",
  balanced: "Casual Buyer",
};

type LabelRule = { label: PersonalBuyerIdentityLabel; rx: RegExp; confidence: number };

const LABEL_RULES: LabelRule[] = [
  { label: "Budget Buyer", rx: /\b(cheap|budget|affordable|goedkoop|lowest price)\b/i, confidence: 88 },
  { label: "Value Buyer", rx: /\b(best value|value for money|bang for buck|deal)\b/i, confidence: 86 },
  { label: "Family Buyer", rx: /\b(family|kids|children|pet friendly|hoekbank)\b/i, confidence: 84 },
  { label: "Professional Buyer", rx: /\b(for work|work laptop|office|professional use)\b/i, confidence: 87 },
  { label: "Power User", rx: /\b(power user|programming|developer|ai development|workstation)\b/i, confidence: 89 },
  { label: "Creator", rx: /\b(creator|camera phone|for photos|photography|content creator|vlog)\b/i, confidence: 88 },
  { label: "Luxury Buyer", rx: /\b(luxury|designer|flagship|high end|premium couch|premium sofa)\b/i, confidence: 90 },
  { label: "Minimalist Buyer", rx: /\b(minimal|minimalist|clean lines|simple design)\b/i, confidence: 85 },
  { label: "Productivity Buyer", rx: /\b(productivity|reliable|business laptop|thinkpad)\b/i, confidence: 84 },
  { label: "Student Buyer", rx: /\b(student|school|college|university|study)\b/i, confidence: 86 },
  { label: "Business Buyer", rx: /\b(business|enterprise|corporate|phone for business)\b/i, confidence: 85 },
];

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function resolveLabelFromProfile(profile: BuyerIdentityProfile): PersonalBuyerIdentityLabel {
  for (const trait of profile.dominantTraits) {
    const mapped = TRAIT_TO_LABEL[trait];
    if (mapped) return mapped;
  }
  if (profile.personalityMode === "premium") return "Luxury Buyer";
  if (profile.personalityMode === "value") return "Value Buyer";
  if (profile.personalityMode === "productivity") return "Professional Buyer";
  if (profile.personalityMode === "performance") return "Power User";
  return "Casual Buyer";
}

/** Infer canonical buyer identity + confidence from query. */
export function inferPersonalBuyerIdentity(query: string): PersonalBuyerIdentity {
  const profile = detectBuyerIdentity(query);
  const q = query.trim().toLowerCase();

  let buyerIdentity = resolveLabelFromProfile(profile);
  let buyerConfidence = profile.confidence;

  for (const rule of LABEL_RULES) {
    if (rule.rx.test(q)) {
      buyerIdentity = rule.label;
      buyerConfidence = Math.max(buyerConfidence, rule.confidence);
      break;
    }
  }

  if (/\bbest laptop\b/i.test(q) && !/\b(for|work|programming|student|value|premium|luxury)\b/i.test(q)) {
    buyerIdentity = "Casual Buyer";
    buyerConfidence = clamp(buyerConfidence, 52, 68);
  }

  return {
    version: 1,
    buyerIdentity,
    buyerConfidence: clamp(Math.round(buyerConfidence), 0, 100),
    profile,
    dominantTraits: profile.dominantTraits,
  };
}

export function personalBuyerMatches(
  identity: PersonalBuyerIdentity,
  expected: PersonalBuyerIdentityLabel[]
): boolean {
  return expected.includes(identity.buyerIdentity);
}

function listingBlob(product: import("@/lib/shoppingScore").QuantProduct, searchQuery = ""): string {
  return `${searchQuery} ${product.title}`.toLowerCase();
}

/** Product-level buyer match score 0–100 for personal commerce ranking. */
export function computePersonalBuyerProductScore(
  identity: PersonalBuyerIdentity,
  product: import("@/lib/shoppingScore").QuantProduct,
  searchQuery: string,
  trayMedianPrice: number,
  trayMinPrice?: number
): number {
  const blob = listingBlob(product, searchQuery);
  let score = identity.buyerConfidence * 0.45 + 28;

  const label = identity.buyerIdentity;
  if (label === "Budget Buyer" && product.price <= trayMedianPrice * 0.75) score += 22;
  if (label === "Budget Buyer" && /\b(budget|affordable|cheap|aspire|pavilion|fabric 2 seater)\b/i.test(blob)) score += 24;
  if (label === "Budget Buyer" && /\b(luxury|designer|leather)\b/i.test(blob)) score -= 22;
  if (label === "Budget Buyer" && trayMedianPrice > 0) {
    score += clamp(((trayMedianPrice - product.price) / trayMedianPrice) * 28, 0, 28);
  }

  if (label === "Value Buyer" && product.oldPrice != null && product.oldPrice > product.price) score += 16;
  if (label === "Value Buyer" && product.price <= trayMedianPrice * 0.9) score += 10;
  if (label === "Value Buyer" && /\b(budget|pavilion|aspire|student edition|affordable)\b/i.test(blob)) score += 26;
  if (label === "Value Buyer" && product.price <= trayMedianPrice * 0.55) score += 16;
  if (label === "Value Buyer" && /\b(m4 pro|workstation|creator edition|xps 15)\b/i.test(blob)) score -= 20;

  if (label === "Luxury Buyer" && /\b(luxury|premium|pro|ultra|designer|oled|m4 pro|leather)\b/i.test(blob)) score += 24;
  if (label === "Luxury Buyer" && /\b(m4 pro|workstation|creator edition|xps 15 oled|designer sofa)\b/i.test(blob)) score += 28;
  if (label === "Luxury Buyer" && /\b(budget|cheap|fabric 2 seater|compact apartment)\b/i.test(blob)) score -= 24;
  if (label === "Luxury Buyer" && product.price >= trayMedianPrice * 1.15) score += 8;
  if (label === "Luxury Buyer" && product.price <= trayMedianPrice * 0.55) score -= 28;
  if (label === "Luxury Buyer" && trayMedianPrice > 0 && /\b(luxury|designer|leather)\b/i.test(blob)) {
    score += clamp(((product.price - trayMedianPrice) / trayMedianPrice) * 22, 0, 22);
  }

  if (label === "Professional Buyer" && /\b(business|thinkpad|latitude|reliable|enterprise)\b/i.test(blob)) score += 20;
  if (label === "Business Buyer" && /\b(business|enterprise|reliable|thinkpad|iphone se)\b/i.test(blob)) score += 18;
  if (label === "Business Buyer" && /\b(budget android|64gb|entry-level)\b/i.test(blob)) score -= 26;

  if (label === "Power User" && /\b(32gb|64gb|workstation|m4 pro|rtx|programming|developer)\b/i.test(blob)) score += 22;
  if (label === "Creator" && /\b(camera|photography|pro camera|pixel|vlog|content)\b/i.test(blob)) score += 26;
  if (label === "Creator" && /\b(budget android|64gb|entry)\b/i.test(blob)) score -= 28;

  if (label === "Student Buyer" && /\b(student|chromebook|light|affordable|aspire|air\b)\b/i.test(blob)) score += 20;
  if (label === "Student Buyer" && product.price <= trayMedianPrice * 0.65) score += 10;

  if (label === "Family Buyer" && /\b(family|sectional|modular|fabric|durable)\b/i.test(blob)) score += 18;
  if (label === "Minimalist Buyer" && /\b(minimal|modern|clean|simple|scandinavian)\b/i.test(blob)) score += 16;

  if (label === "Casual Buyer") score += 6;

  const q = searchQuery.toLowerCase();
  if (
    (/\bcheap\b|\bbudget\b|\bgoedkoop\b/.test(q) || label === "Budget Buyer") &&
    trayMinPrice != null &&
    product.price <= trayMinPrice * 1.05
  ) {
    score += 22;
  }
  if (/\bluxury\b|\bdesigner\b/.test(q) && /\b(luxury|designer|leather)\b/i.test(blob)) {
    score += 20;
  }
  if (/\bmodern\b/.test(q) && /\b(modern|minimalist|corner)\b/i.test(blob)) {
    score += 16;
  }
  if (/\bcamera\b|\bphotos\b/.test(q) && /\b(camera|photography|pro camera|pixel)\b/i.test(blob)) {
    score += 18;
  }
  if (/\bbusiness\b/.test(q) && /\b(business|enterprise|reliable|thinkpad|iphone se)\b/i.test(blob)) {
    score += 16;
  }

  return clamp(Math.round(score), 0, 100);
}
