"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  icon?: ReactNode;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export default function CockpitEmptyState({
  title,
  description,
  icon,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: Props) {
  return (
    <div className="qa-empty-state qi-sys-panel qi-sys-panel--neutral mx-auto max-w-lg px-6 py-10 text-center sm:px-10">
      {icon ? (
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-cyan-400/22 bg-cyan-500/10 text-cyan-200">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold tracking-tight text-white/95">{title}</h3>
      <p className="cockpit-body mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">{description}</p>
      <div className="mt-7 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
        <Link
          href={primaryHref}
          className="qi-sys-panel-cta inline-flex min-h-11 items-center justify-center px-6"
        >
          {primaryLabel}
        </Link>
        {secondaryLabel && secondaryHref ? (
          <Link
            href={secondaryHref}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-6 text-sm font-medium text-white/85 transition hover:bg-white/[0.1]"
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
