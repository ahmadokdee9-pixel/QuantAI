import type { FakeDiscountRisk } from "@/lib/deals/types";
import type { QuantProduct } from "@/lib/shoppingScore";
import { ratingValue } from "@/lib/shoppingScore";
import type { ProductCategorySlug } from "./types";

/** Commercial lane shapes how aggressively we flag “wait” vs “value.” */
export type CategoryCommercialLane = "budget" | "mid" | "premium" | "emotional";

export type CategoryPricingEconomics = {
  lane: CategoryCommercialLane;
  /** Added to 1.12 when testing “pricey vs fair median” (premium tolerates higher asks). */
  priceyFairHeadroom: number;
  /** Price must be below `fair * cheapVsFairRatio` to read as already-cheap vs tray median. */
  cheapVsFairRatio: number;
  /** 0–1: nudge deal confidence / psychology toward sentiment-led categories. */
  emotionalValueBias: number;
};

export function getCategoryPricingEconomics(category: ProductCategorySlug): CategoryPricingEconomics {
  switch (category) {
    case "beauty":
      return { lane: "emotional", priceyFairHeadroom: 0.09, cheapVsFairRatio: 0.9, emotionalValueBias: 0.78 };
    case "fashion":
      return { lane: "emotional", priceyFairHeadroom: 0.08, cheapVsFairRatio: 0.9, emotionalValueBias: 0.72 };
    case "electronics":
      return { lane: "mid", priceyFairHeadroom: 0.02, cheapVsFairRatio: 0.88, emotionalValueBias: 0.22 };
    case "toys":
      return { lane: "budget", priceyFairHeadroom: 0.03, cheapVsFairRatio: 0.92, emotionalValueBias: 0.32 };
    case "sports":
      return { lane: "budget", priceyFairHeadroom: 0.04, cheapVsFairRatio: 0.91, emotionalValueBias: 0.28 };
    case "home":
      return { lane: "mid", priceyFairHeadroom: 0.05, cheapVsFairRatio: 0.89, emotionalValueBias: 0.38 };
    default:
      return { lane: "mid", priceyFairHeadroom: 0.035, cheapVsFairRatio: 0.88, emotionalValueBias: 0.34 };
  }
}

/**
 * Tray-relative “already in a good lane” — blocks lazy “wait” reads on legitimately cheap rows.
 * Not a price guarantee; uses only listing + peer snapshot signals.
 */
export function isStrongValueTerritory(
  p: QuantProduct,
  fair: number,
  peerMed: number,
  trust: number,
  comp: number,
  fake: FakeDiscountRisk,
  overpricedVsTray: boolean,
  underpricedAnomaly: boolean,
  category: ProductCategorySlug
): boolean {
  if (underpricedAnomaly || overpricedVsTray) return false;
  if (fake === "high") return false;
  const price = p.price;
  if (price <= 0) return false;

  const econ = getCategoryPricingEconomics(category);
  const vfm = p.qiCommerce?.valueForMoney ?? 0;
  const pp = p.qiSignals?.pricePerformance ?? comp;
  const stars = ratingValue(p.rating);

  const atOrBelowFair = fair > 0 && price <= fair * (econ.lane === "budget" ? 0.99 : 0.97);
  const belowPeers = peerMed > 0 && price <= peerMed * (econ.lane === "emotional" ? 0.97 : 0.95);
  const floorOk = trust >= (econ.lane === "budget" ? 56 : 60);
  const compOk = comp >= (econ.lane === "budget" ? 50 : 54);

  if (floorOk && compOk && atOrBelowFair && fake === "low") return true;
  if (floorOk && compOk && belowPeers && fake === "low") return true;
  if (fake === "low" && vfm >= 70 && trust >= 60 && comp >= 52) return true;
  if (fake === "low" && pp >= 74 && trust >= 62 && comp >= 54) return true;
  if (econ.lane === "emotional" && stars >= 4.35 && fair > 0 && price <= fair * 1.02 && trust >= 64 && comp >= 56 && fake === "low") {
    return true;
  }
  return false;
}

export function dealConfidenceCategoryNudge(
  category: ProductCategorySlug,
  stars: number,
  trust: number
): number {
  const econ = getCategoryPricingEconomics(category);
  if (econ.lane !== "emotional") return 0;
  const star01 = Math.min(1, Math.max(0, (stars - 3.5) / 1.5));
  const trust01 = trust / 100;
  return Math.round(econ.emotionalValueBias * 5 * (0.55 * star01 + 0.45 * trust01));
}
