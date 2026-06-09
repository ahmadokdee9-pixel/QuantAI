"use client";

import { ShieldCheck, Sparkles, TrendingDown, TrendingUp } from "lucide-react";

type Props = {
  entityCount: number;
  hasStrongValue: boolean;
  confidence: number;
};

export default function DecisionSnapshotStrip({ entityCount, hasStrongValue, confidence }: Props) {
  return (
    <section className="qa-decision-snapshot" aria-label="Decision snapshot">
      <div className="qa-decision-snapshot-left">
        <p className="qa-decision-snapshot-overline">Decision snapshot</p>
        <p className="qa-decision-snapshot-line">
          {hasStrongValue
            ? "Strong value signals detected across seller trust signals in this search sample."
            : "Trust signals remain moderate while value spreads need closer timing."}
        </p>
      </div>
      <div className="qa-decision-snapshot-center" role="list" aria-label="Recommendation tags">
        <span role="listitem" className="qa-decision-pill qa-decision-pill--trust">
          <ShieldCheck className="size-3.5" strokeWidth={1.5} aria-hidden />
          Seller trust signal
        </span>
        <span role="listitem" className="qa-decision-pill qa-decision-pill--intel">
          <Sparkles className="size-3.5" strokeWidth={1.5} aria-hidden />
          {entityCount > 0 ? `${entityCount} entities live` : "Signals syncing"}
        </span>
        <span role="listitem" className="qa-decision-pill qa-decision-pill--value">
          {hasStrongValue ? (
            <TrendingDown className="size-3.5" strokeWidth={1.5} aria-hidden />
          ) : (
            <TrendingUp className="size-3.5" strokeWidth={1.5} aria-hidden />
          )}
          {hasStrongValue ? "Below fair band" : "Watch spread"}
        </span>
      </div>
      <div className="qa-decision-snapshot-right" aria-label="Confidence">
        <p className="qa-decision-snapshot-label">Confidence</p>
        <p className="qa-decision-snapshot-score">{confidence}%</p>
      </div>
    </section>
  );
}
