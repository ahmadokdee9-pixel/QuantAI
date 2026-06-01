"use client";

import CommerceCoveragePanel from "@/components/home/CommerceCoveragePanel";
import type { QuantProduct } from "@/lib/shoppingScore";

type Props = {
  products?: QuantProduct[];
};

export default function SellerCoverageStrip({ products = [] }: Props) {
  const live = products.length >= 3;
  return (
    <CommerceCoveragePanel
      variant={live ? "scan" : "network"}
      products={products}
      className="qa-ref-coverage--scan-tray"
    />
  );
}
