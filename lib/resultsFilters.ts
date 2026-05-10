import { getStoreTrustScore, ratingValue, type QuantProduct } from "@/lib/shoppingScore";

export type ResultsFiltersState = {
  minPrice: string;
  maxPrice: string;
  brand: string;
  minRating: string;
  minTrust: string;
};

export function defaultResultsFilters(): ResultsFiltersState {
  return {
    minPrice: "",
    maxPrice: "",
    brand: "",
    minRating: "",
    minTrust: "",
  };
}

export function applyResultsFilters(
  products: QuantProduct[],
  f: ResultsFiltersState
): QuantProduct[] {
  let list = [...products];

  const lo = Number(f.minPrice);
  if (Number.isFinite(lo) && lo > 0) {
    list = list.filter((p) => p.price >= lo);
  }

  const hi = Number(f.maxPrice);
  if (Number.isFinite(hi) && hi > 0) {
    list = list.filter((p) => p.price <= hi);
  }

  const brand = f.brand.trim().toLowerCase();
  if (brand) {
    list = list.filter((p) => p.title.toLowerCase().includes(brand));
  }

  const minR = Number(f.minRating);
  if (Number.isFinite(minR) && minR > 0) {
    list = list.filter((p) => ratingValue(p.rating) >= minR);
  }

  const minT = Number(f.minTrust);
  if (Number.isFinite(minT) && minT > 0) {
    list = list.filter((p) => getStoreTrustScore(p.store) >= minT);
  }

  return list;
}

export function countActiveFilters(f: ResultsFiltersState): number {
  let n = 0;
  if (f.minPrice.trim()) n++;
  if (f.maxPrice.trim()) n++;
  if (f.brand.trim()) n++;
  if (f.minRating.trim()) n++;
  if (f.minTrust.trim()) n++;
  return n;
}
