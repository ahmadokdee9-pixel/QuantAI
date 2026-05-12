import { getStoreTrustScore } from "@/lib/retailTrust";
import type { QuantProduct } from "@/lib/shoppingScore";
import { ratingValue } from "@/lib/shoppingScore";

export type SignalConfidence = {
  score: number;
  explanation: string;
  gaps: string[];
  needsManualVerification: boolean;
};

export function buildSignalConfidence(p: QuantProduct, list: QuantProduct[]): SignalConfidence {
  const gaps: string[] = [];
  let base = 52;
  const trust = getStoreTrustScore(p.store);
  const r = ratingValue(p.rating);
  const rc = p.reviewsCount ?? 0;
  const sig = p.qiSignals;

  if (rc >= 80) base += 18;
  else if (rc >= 25) base += 10;
  else {
    base -= 8;
    gaps.push("Review count is low in the feed—star rating is less battle-tested.");
  }

  if (trust >= 72) base += 12;
  else if (trust < 52) {
    base -= 10;
    gaps.push("Retailer trust prior is weak—seller verification is mandatory.");
  }

  if (r >= 4.4 && r > 0) base += 8;
  else if (r > 0 && r < 4.0) {
    base -= 12;
    gaps.push("Visible rating is soft versus typical confident buys.");
  }

  if ((sig?.discountQuality ?? 50) < 40) {
    base -= 6;
    gaps.push("Discount / list-price story looks noisy—confirm checkout price.");
  }

  const maxR = Math.max(1, ...list.map((x) => x.reviewsCount ?? 0));
  if (maxR > 200 && rc > 0 && rc < maxR * 0.04) {
    gaps.push("This row is under-reviewed vs the most-reviewed alternative.");
  }

  const needsManualVerification = trust < 55 || rc < 12 || (r > 0 && r < 4.1) || base < 48;

  const score = Math.max(18, Math.min(92, Math.round(base)));

  let explanation = "";
  if (score >= 76) {
    explanation =
      "Higher confidence: review depth and/or retailer prior strengthen this listing relative to typical feed noise.";
  } else if (score >= 58) {
    explanation =
      "Moderate confidence: signals are usable but one or more dimensions (reviews, trust, or discount story) need manual verification.";
  } else {
    explanation =
      "Lower confidence: incomplete or conflicting signals—treat QuantAI as orientation, not a final call.";
  }

  return {
    score,
    explanation: explanation.slice(0, 260),
    gaps: gaps.slice(0, 4),
    needsManualVerification,
  };
}
