"use client";

import type { DecisionEvidenceItem, DecisionDomain } from "@/lib/universalDecision/types";
import { freshnessLabel } from "@/lib/universalDecision/freshness";
import type { SourceFreshness } from "@/lib/universalDecision/types";

/** Essential evidence ids shown expanded; others stay compact. */
const ESSENTIAL: Record<DecisionDomain, string[]> = {
  product: ["price_value", "seller_trust", "availability"],
  flight: ["total_fare", "stops_duration", "baggage"],
  hotel: ["stay_cost", "location", "taxes_fees"],
  subscription: ["effective_cost", "lock_in", "duplicates"],
  software: [],
  insurance: [],
  course: [],
  device: [],
  service: [],
};

type Props = {
  domain: DecisionDomain;
  evidence: DecisionEvidenceItem[];
  freshness: SourceFreshness;
  insufficientEvidence?: boolean;
};

export default function DomainEvidenceModules({
  domain,
  evidence,
  freshness,
  insufficientEvidence,
}: Props) {
  if (!evidence.length && !insufficientEvidence) return null;
  const essential = new Set(ESSENTIAL[domain] || []);

  return (
    <div className="qa-domain-evidence" aria-label="Decision evidence">
      <div className="qa-domain-evidence__fresh">
        <span
          className={`qa-domain-evidence__dot qa-domain-evidence__dot--${freshness.status}`}
          aria-hidden
        />
        <span>{freshnessLabel(freshness)}</span>
        <span className="qa-domain-evidence__provider">{freshness.provider}</span>
      </div>

      {insufficientEvidence ? (
        <p className="qa-domain-evidence__insufficient">
          Insufficient evidence for a high-confidence commitment. Facts below are partial.
        </p>
      ) : null}

      <ul className="qa-domain-evidence__list">
        {evidence.map((item) => {
          const open = essential.has(item.id);
          return (
            <li
              key={item.id}
              className={`qa-domain-evidence__item${open ? " qa-domain-evidence__item--open" : ""}`}
            >
              <div className="qa-domain-evidence__meta">
                <span className="qa-domain-evidence__label">{item.label}</span>
                <span className={`qa-domain-evidence__kind qa-domain-evidence__kind--${item.kind}`}>
                  {item.kind}
                </span>
              </div>
              <p className="qa-domain-evidence__value">{item.value}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
