import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";

export type SnapshotMode =
  | "default"
  | "best_long_term"
  | "safest_retailer"
  | "student_value"
  | "performance_per_euro"
  | "risk_warning"
  | "most_overpriced";

export function pickProductForSnapshotMode(mode: SnapshotMode, list: QuantProduct[]): QuantProduct | null {
  if (!list.length) return null;
  const L = list;
  switch (mode) {
    case "safest_retailer":
      return [...L].sort((a, b) => getStoreTrustScore(b.store) - getStoreTrustScore(a.store))[0] ?? null;
    case "risk_warning": {
      const byRisk = [...L].sort((a, b) => {
        const ra = a.qiCommerce?.retailerRiskScore ?? 40;
        const rb = b.qiCommerce?.retailerRiskScore ?? 40;
        return rb - ra;
      });
      return (
        byRisk[0] ??
        [...L].sort((a, b) => getStoreTrustScore(a.store) - getStoreTrustScore(b.store))[0] ??
        null
      );
    }
    case "most_overpriced": {
      const sortedP = [...L.map((p) => p.price)].filter((x) => x > 0).sort((a, b) => a - b);
      const med = sortedP[Math.floor(sortedP.length / 2)] ?? 1;
      return (
        [...L]
          .filter((p) => p.price > 0)
          .sort((a, b) => b.price / med - a.price / med)[0] ?? L[0]!
      );
    }
    case "performance_per_euro": {
      return (
        [...L]
          .filter((p) => p.price > 0)
          .sort((a, b) => getFinalComposite(b, L) / b.price - getFinalComposite(a, L) / a.price)[0] ?? L[0]!
      );
    }
    case "student_value": {
      return (
        [...L]
          .filter((p) => p.price > 0 && getStoreTrustScore(p.store) >= 58)
          .sort((a, b) => getFinalComposite(b, L) / b.price - getFinalComposite(a, L) / a.price)[0] ??
        [...L].sort((a, b) => getFinalComposite(b, L) - getFinalComposite(a, L))[0]!
      );
    }
    case "best_long_term":
    default:
      return [...L].sort((a, b) => getFinalComposite(b, L) - getFinalComposite(a, L))[0] ?? null;
  }
}

export function snapshotModeLabel(mode: SnapshotMode): string {
  switch (mode) {
    case "best_long_term":
      return "Best long-term value";
    case "safest_retailer":
      return "Safest retailer";
    case "student_value":
      return "Best for students";
    case "performance_per_euro":
      return "Performance per €";
    case "risk_warning":
      return "Risk spotlight";
    case "most_overpriced":
      return "Premium outlier";
    default:
      return "Top pick";
  }
}

export function buildViralSnapshotCaption(
  mode: SnapshotMode,
  p: QuantProduct,
  list: QuantProduct[]
): string {
  const qi = getFinalComposite(p, list);
  const trust = getStoreTrustScore(p.store);
  const stars = ratingValue(p.rating);
  const conf = p.qiCommerce?.confidence;
  const confEx = p.qiCommerce?.confidenceExplanation?.slice(0, 160);
  const risk = p.qiCommerce?.retailerRiskScore;
  const line1 = `${snapshotModeLabel(mode)} · ${p.title.slice(0, 72)}${p.title.length > 72 ? "…" : ""}`;
  const line2 = `QI ${qi} · Trust ${trust}/100 · ${stars > 0 ? `${stars.toFixed(1)}★` : "rating n/a"} · €${p.price}`;
  const line3 = [
    conf != null ? `Model confidence ${conf}/100${confEx ? ` — ${confEx}` : ""}` : null,
    risk != null ? `Retailer-risk heuristic ${risk}/100` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return [
    "QuantAI · AI Snapshot",
    line1,
    line2,
    line3,
    "",
    "Shared from QuantAI — decision support, not financial advice. Verify at checkout.",
  ]
    .filter((x) => x !== "")
    .join("\n");
}
