"use client";

import type { DecisionDomain } from "@/lib/universalDecision/types";

const LABELS: Record<string, string> = {
  product: "Product",
  flight: "Flight",
  hotel: "Hotel",
  subscription: "Subscription",
};

type Props = {
  domain: DecisionDomain | null;
  confidence: number | null;
  enabledDomains: DecisionDomain[];
  clarifyingQuestion?: string | null;
  onCorrectDomain: (domain: DecisionDomain) => void;
  onConfirmClarification?: (domain: DecisionDomain) => void;
};

export default function DomainDecisionIndicator({
  domain,
  confidence,
  enabledDomains,
  clarifyingQuestion,
  onCorrectDomain,
  onConfirmClarification,
}: Props) {
  if (!domain && !clarifyingQuestion) return null;

  return (
    <div className="qa-domain-indicator" role="status" aria-live="polite">
      {domain ? (
        <div className="qa-domain-indicator__row">
          <span className="qa-domain-indicator__label">Detected</span>
          <span className="qa-domain-indicator__domain">{LABELS[domain] || domain}</span>
          {confidence != null ? (
            <span className="qa-domain-indicator__conf">{Math.round(confidence)}%</span>
          ) : null}
          <span className="qa-domain-indicator__sep" aria-hidden>
            ·
          </span>
          <span className="qa-domain-indicator__correct-label">Not right?</span>
          <div className="qa-domain-indicator__chips">
            {enabledDomains.map((d) => (
              <button
                key={d}
                type="button"
                className={`qa-domain-indicator__chip${d === domain ? " qa-domain-indicator__chip--active" : ""}`}
                onClick={() => onCorrectDomain(d)}
              >
                {LABELS[d] || d}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {clarifyingQuestion ? (
        <div className="qa-domain-indicator__clarify">
          <p className="qa-domain-indicator__clarify-q">{clarifyingQuestion}</p>
          <div className="qa-domain-indicator__chips">
            {enabledDomains.map((d) => (
              <button
                key={`clarify-${d}`}
                type="button"
                className="qa-domain-indicator__chip"
                onClick={() => (onConfirmClarification || onCorrectDomain)(d)}
              >
                {LABELS[d] || d}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
