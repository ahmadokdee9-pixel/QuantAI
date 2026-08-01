"use client";

import type { LivingDecisionThread, LivingTimelineEvent } from "@/lib/livingDecision/types";
import WhatsChangedBadges from "@/components/decisionMemory/WhatsChangedBadges";

type Props = {
  thread: LivingDecisionThread | null;
  compact?: boolean;
};

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function eventClass(kind: LivingTimelineEvent["kind"]): string {
  if (kind === "decision_changed") return "qa-living-history__node--decision";
  if (
    kind === "price_changed" ||
    kind === "fare_changed" ||
    kind === "subscription_price_changed"
  ) {
    return "qa-living-history__node--price";
  }
  if (kind === "confidence_changed") return "qa-living-history__node--confidence";
  if (kind === "better_alternative") return "qa-living-history__node--alt";
  return "qa-living-history__node--default";
}

export default function DecisionHistorySection({ thread, compact = false }: Props) {
  if (!thread || thread.events.length === 0) return null;

  const events = compact ? thread.events.slice(-6) : thread.events.slice(-12);
  const recent = thread.recentChanges.slice(-4);

  return (
    <section
      className={`qa-instant-decision__block qa-instant-decision__block--full qa-living-history${compact ? " qa-living-history--compact" : ""}`}
      aria-label="Decision history"
    >
      <div className="qa-living-history__head">
        <h3 className="qa-instant-decision__block-title">Decision History</h3>
        <span className="qa-living-history__id" title="Permanent Decision ID">
          ID {thread.decisionId.slice(0, 8)}
        </span>
      </div>

      {recent.length > 0 ? <WhatsChangedBadges changes={recent} /> : null}

      <ol className="qa-living-history__timeline">
        {events.map((event, index) => (
          <li key={event.id} className={`qa-living-history__node ${eventClass(event.kind)}`}>
            {index > 0 ? <span className="qa-living-history__connector" aria-hidden /> : null}
            <div className="qa-living-history__card">
              <span className="qa-living-history__when">{formatWhen(event.at)}</span>
              <span className="qa-living-history__label">{event.label}</span>
              {event.action ? (
                <span className="qa-living-history__action">{event.action}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
