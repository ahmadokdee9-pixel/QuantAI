"use client";

import type { DecisionChange } from "@/lib/decisionMemory/types";
import { changeBadgeLabel } from "@/lib/decisionMemory/changeDetection";

type Props = {
  changes: DecisionChange[];
  className?: string;
};

export default function WhatsChangedBadges({ changes, className = "" }: Props) {
  if (!changes.length) return null;

  return (
    <div
      className={`qa-living-badges ${className}`.trim()}
      aria-label="What changed"
    >
      <span className="qa-living-badges__kicker">What&apos;s changed</span>
      <div className="qa-living-badges__row">
        {changes.slice(0, 6).map((change, index) => (
          <span
            key={`${change.kind}_${index}`}
            className={`qa-living-badge qa-living-badge--${change.kind}`}
            title={change.label}
          >
            {changeBadgeLabel(change.kind)}
          </span>
        ))}
      </div>
    </div>
  );
}
