import { getStoreTrustScore } from "@/lib/retailTrust";
import type { QuantProduct } from "@/lib/shoppingScore";
import { ratingValue } from "@/lib/shoppingScore";

export type RetailerRiskIntel = {
  /** 0 = safest prior in-tray context, 100 = highest concern heuristics can infer from feed-only signals. */
  riskScore: number;
  note: string;
  flags: string[];
};

export function buildRetailerRiskIntel(p: QuantProduct, list: QuantProduct[]): RetailerRiskIntel {
  const trust = getStoreTrustScore(p.store);
  const rating = ratingValue(p.rating);
  const sig = p.qiSignals;
  const flags: string[] = [];
  let risk = 22;

  if (trust < 48) {
    risk += 28;
    flags.push("Storefront prior is thin or unfamiliar in our trust index.");
  } else if (trust < 62) {
    risk += 14;
    flags.push("Retailer trust is mid-pack—verify seller and buyer protection.");
  }

  if ((p.reviewsCount ?? 0) < 8 && rating > 0) {
    risk += 12;
    flags.push("Very few public reviews—rating confidence is limited.");
  } else if ((p.reviewsCount ?? 0) > 120 && rating >= 4.3) {
    risk -= 8;
    flags.push("Higher review volume supports rating stability.");
  }

  if (rating > 0 && rating < 4.0) {
    risk += 18;
    flags.push("Visible star rating is weak versus typical picks.");
  }

  if ((sig?.discountQuality ?? 50) < 38 && p.priceTrend === "down") {
    risk += 14;
    flags.push("Discount signal looks aggressive vs list context—confirm real street price.");
  }

  const maxR = Math.max(1, ...list.map((x) => x.reviewsCount ?? 0));
  if ((p.reviewsCount ?? 0) > 0 && maxR > 100 && (p.reviewsCount ?? 0) < maxR * 0.05) {
    risk += 6;
    flags.push("Review depth lags the most-reviewed peer in this tray.");
  }

  const av = (p.availability ?? "").toLowerCase();
  if (/last|only|left|few|hurry|limited/i.test(av)) {
    risk += 6;
    flags.push("Listing language hints urgency—treat as marketing, not stock truth.");
  }

  risk = Math.max(5, Math.min(94, Math.round(risk)));
  const note =
    flags.length > 0
      ? flags.slice(0, 2).join(" ")
      : "No strong retailer-risk flags in the feed slice—still verify identity at checkout.";

  return { riskScore: risk, note: note.slice(0, 240), flags: flags.slice(0, 4) };
}
