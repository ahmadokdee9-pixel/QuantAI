import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";

export type QualitativeRibbon = {
  label: string;
  detail: string;
} | null;

/** Tasteful qualitative labels only — no fake user counts. */
export function buildQualitativeMarketRibbon(products: QuantProduct[]): QualitativeRibbon {
  if (products.length < 4) return null;
  const stores = new Set(products.map((p) => p.store.toLowerCase().trim()));
  if (stores.size <= 2 && products.length >= 6) {
    return {
      label: "High retailer overlap",
      detail: "Most listings share a small set of storefronts — compare policies, not just headline price.",
    };
  }
  const trusts = products.map((p) => getStoreTrustScore(p.store));
  if (Math.min(...trusts) >= 68) {
    return {
      label: "High confidence cluster",
      detail: "Tray-wide trust priors are comparatively strong — ranking leans more on price-to-quality nuance.",
    };
  }
  const withCommerce = products.filter((p) => p.qiCommerce?.confidence != null && p.qiCommerce.confidence >= 72);
  if (withCommerce.length >= Math.ceil(products.length * 0.4)) {
    return {
      label: "Dense AI coverage",
      detail: "Many rows carry structured commerce signals — good moment for Compare lab and copilot follow-ups.",
    };
  }
  return {
    label: "Compare-friendly tray",
    detail: "Popular compare path: pin two finalists, run a verdict, then export a receipt-style snapshot for your notes.",
  };
}
