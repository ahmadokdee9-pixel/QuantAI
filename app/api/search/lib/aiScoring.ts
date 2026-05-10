import { getStoreTrustScore } from "@/lib/retailTrust";

export type ScorableProduct = {
  price: number | string;
  rating?: number | string;
  store?: string;
};

export function calculateAIScore(
  product: ScorableProduct,
  products: ScorableProduct[]
) {
  let score = 50;

  const price = Number(String(product.price).replace(/[^\d.]/g, ""));

  const avgPrice =
    products.length > 0
      ? products.reduce((acc, p) => {
          return acc + Number(String(p.price).replace(/[^\d.]/g, "") || 0);
        }, 0) / products.length
      : price;

  if (price < avgPrice) {
    score += 15;
  }

  const rating = Number(product.rating || 0);

  if (rating >= 4.5) {
    score += 20;
  } else if (rating >= 4) {
    score += 10;
  }

  if (product.store && getStoreTrustScore(product.store) >= 85) {
    score += 10;
  }

  score = Math.min(score, 95);

  let label = "Good Choice";

  if (score >= 90) {
    label = "Best Value";
  } else if (score >= 80) {
    label = "Top Rated";
  } else if (score <= 60) {
    label = "Overpriced";
  }

  return {
    score,
    label,
    reason:
      score >= 90
        ? "Strong price-to-quality balance with supportive trust cues in this basket."
        : score >= 80
          ? "Solid rating signal—still run tradeoff analysis on shipping and returns."
          : "Signals are mixed; Compare mode will sharpen purchase clarity before checkout.",
  };
}
