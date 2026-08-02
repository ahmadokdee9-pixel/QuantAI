"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { DecisionFeedItem } from "@/lib/decisionFeed/types";
import WhatsChangedBadges from "@/components/decisionMemory/WhatsChangedBadges";

type Props = {
  item: DecisionFeedItem;
};

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function priorityClass(priority: DecisionFeedItem["priority"]): string {
  if (priority === "critical") return "qa-feed-card--critical";
  if (priority === "important") return "qa-feed-card--important";
  return "qa-feed-card--info";
}

export default function DecisionFeedCard({ item }: Props) {
  return (
    <article
      className={`qa-feed-card ${priorityClass(item.priority)}`}
      aria-label={item.title}
    >
      <header className="qa-feed-card__head">
        <div className="qa-feed-card__meta">
          <span className={`qa-feed-priority qa-feed-priority--${item.priority}`}>
            {item.priority}
          </span>
          <span className="qa-feed-card__domain">{item.domain}</span>
          {item.watched ? <span className="qa-feed-card__watched">Watched</span> : null}
        </div>
        <time className="qa-feed-card__time" dateTime={item.timestamp}>
          {formatWhen(item.timestamp)}
        </time>
      </header>

      <h3 className="qa-feed-card__title">{item.title}</h3>
      {item.merchant ? <p className="qa-feed-card__merchant">{item.merchant}</p> : null}

      <div className="qa-feed-card__states">
        <div>
          <p className="qa-feed-card__state-label">Previous</p>
          <p className="qa-feed-card__state-value">{item.previousState}</p>
        </div>
        <span className="qa-feed-card__arrow" aria-hidden>
          →
        </span>
        <div>
          <p className="qa-feed-card__state-label">Current</p>
          <p className="qa-feed-card__state-value qa-feed-card__state-value--current">
            {item.currentState}
          </p>
        </div>
      </div>

      <p className="qa-feed-card__why">{item.whyChanged}</p>

      <WhatsChangedBadges changes={item.changes} />

      <footer className="qa-feed-card__actions">
        <Link href={item.briefHref} className="qa-ui-btn-primary qa-feed-card__cta">
          {item.actionLabel}
          <ArrowRight className="size-3.5 opacity-80" aria-hidden />
        </Link>
        {item.productLink ? (
          <a
            href={item.productLink}
            target="_blank"
            rel="noopener noreferrer"
            className="qa-ui-btn-ghost qa-feed-card__cta"
          >
            Listing
            <ExternalLink className="size-3.5 opacity-70" aria-hidden />
          </a>
        ) : null}
      </footer>
    </article>
  );
}
