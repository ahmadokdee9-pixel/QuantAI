"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  icon?: ReactNode;
  moduleLabel?: string;
  readiness?: string;
  context?: readonly string[];
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  variant?: "standalone" | "embedded";
};

export default function CockpitEmptyState({
  title,
  description,
  icon,
  moduleLabel,
  readiness,
  context,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  variant = "standalone",
}: Props) {
  return (
    <div
      className={`qa-ref-ws-empty${variant === "embedded" ? " qa-ref-ws-empty--embedded" : ""}`.trim()}
      role="status"
    >
      {moduleLabel ? <p className="qa-ref-ws-empty__module">{moduleLabel}</p> : null}
      {icon ? <div className="qa-ref-ws-empty__icon">{icon}</div> : null}
      <h3 className="qa-ref-ws-empty__title">{title}</h3>
      {readiness ? (
        <p className="qa-ref-ws-empty__readiness">
          <span className="qa-ref-ws-empty__status-dot" aria-hidden />
          {readiness}
        </p>
      ) : null}
      <p className="qa-ref-ws-empty__desc">{description}</p>
      {context && context.length > 0 ? (
        <ul className="qa-ref-ws-empty__context" aria-label="Module operational context">
          {context.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <div className="qa-ref-ws-empty__actions">
        <Link href={primaryHref} className="qi-access-cta inline-flex min-h-11 items-center justify-center px-6">
          {primaryLabel}
        </Link>
        {secondaryLabel && secondaryHref ? (
          <Link
            href={secondaryHref}
            className="qi-access-cta qi-access-cta--ghost inline-flex min-h-11 items-center justify-center px-6"
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
