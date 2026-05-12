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
    <div className="rounded-[1.35rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] via-white/[0.02] to-black/35 px-6 py-10 text-center backdrop-blur-xl sm:px-10">
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
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 px-6 text-sm font-semibold text-slate-950 shadow-[0_0_28px_-6px_rgba(34,211,238,0.45)] transition hover:brightness-105"
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
