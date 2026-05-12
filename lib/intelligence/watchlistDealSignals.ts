/** Heuristic watchlist signals — uses only stored JSON + target price (no fake history). */

export type WatchlistRowInput = {
  product?: Record<string, unknown> | null;
  target_price?: number | null;
};

export function buildWatchlistEvolutionSignals(row: WatchlistRowInput): string[] {
  const out: string[] = [];
  const p = row.product;
  if (!p || typeof p !== "object") return out;

  const price = typeof p.price === "number" && Number.isFinite(p.price) ? p.price : null;
  const tp = row.target_price;
  if (tp != null && Number.isFinite(tp) && price != null) {
    const gap = price - tp;
    if (gap > 0) {
      out.push(
        `Still above your target by ~${Math.abs(Math.round(gap))} — keep the watch or tighten search filters.`
      );
    } else {
      out.push("Listed at or under your target — reopen the offer before shipping or promos change.");
    }
  }

  const b = p.watchBaseline;
  if (b && typeof b === "object" && price != null) {
    const cap = typeof (b as { listingPrice?: unknown }).listingPrice === "number" ? (b as { listingPrice: number }).listingPrice : null;
    const trust0 =
      typeof (b as { trustPrior?: unknown }).trustPrior === "number" ? (b as { trustPrior: number }).trustPrior : null;
    if (cap != null && cap > 0) {
      const drift = (price - cap) / cap;
      if (drift <= -0.03) {
        out.push("Deal improvement signal: captured price was higher — discount or repricing may have improved.");
      }
      if (drift >= 0.04) {
        out.push("Price drift vs capture: listing moved up — promo expiry, bundle change, or different SKU possible.");
      }
    }
    const qi0 =
      typeof (b as { qiComposite?: unknown }).qiComposite === "number"
        ? (b as { qiComposite: number }).qiComposite
        : null;
    const qi1 = typeof p.qiComposite === "number" ? p.qiComposite : null;
    if (qi0 != null && qi1 != null && qi1 >= qi0 + 6) {
      out.push("Confidence increased vs snapshot: composite in stored payload rose — rerun search for live tray context.");
    }
    if (qi0 != null && qi1 != null && qi1 <= qi0 - 8) {
      out.push("Composite softened vs snapshot — tray dynamics may have shifted; verify before trusting the old read.");
    }
    if (trust0 != null && trust0 < 58) {
      out.push("At capture, trust prior was weak — prioritize seller verification on every revisit.");
    }
  }

  if (out.length === 0) {
    out.push("Baseline signals only — QuantAI will enrich this row when live search context is available again.");
  }

  return out.slice(0, 4);
}
