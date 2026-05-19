"use client";

import { resolveInstitutionalState } from "@/lib/ui/systemStateLanguage";

type Props = {
  message: string;
  className?: string;
};

/** Compact institutional inline notice (compare verdict, drawers, etc.). */
export default function InlineSystemNotice({ message, className = "" }: Props) {
  const state = resolveInstitutionalState(message);
  if (!state) return null;

  return (
    <div className={`qi-sys-inline ${className}`} role="status">
      <span className="qi-sys-pulse-dot qi-sys-pulse-dot--sm" aria-hidden />
      <div className="min-w-0">
        <p className="qi-sys-inline-headline">{state.headline}</p>
        <p className="qi-sys-inline-supporting">{state.supporting}</p>
      </div>
    </div>
  );
}
