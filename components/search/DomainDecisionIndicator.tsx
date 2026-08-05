"use client";

import type { DecisionDomain } from "@/lib/universalDecision/types";
import { useState } from "react";

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
  const [correctOpen, setCorrectOpen] = useState(false);
  if (!domain && !clarifyingQuestion) return null;

  const highConfidence = confidence != null && confidence >= 75;
  const showChips =
    Boolean(clarifyingQuestion) || !highConfidence || correctOpen || !domain;

  return (
    <div className="qa-domain-indicator" role="status" aria-live="polite">
      {domain ? (
        <div className="qa-domain-indicator__row">
          <span className="qa-domain-indicator__domain">{LABELS[domain] || domain}</span>
          {confidence != null ? (
            <span className="qa-domain-indicator__conf">{Math.round(confidence)}%</span>
          ) : null}
          {!clarifyingQuestion ? (
            <>
              <span className="qa-domain-indicator__sep" aria-hidden>
                ·
              </span>
              <button
                type="button"
                className="qa-domain-indicator__correct-label"
                aria-expanded={highConfidence ? correctOpen : true}
                onClick={() => {
                  if (highConfidence) setCorrectOpen((v) => !v);
                }}
              >
                {highConfidence && correctOpen ? "Hide" : "Wrong domain?"}
              </button>
            </>
          ) : null}
          {showChips ? (
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
          ) : null}
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
