"use client";

import { Lock, Shield } from "lucide-react";

type Props = {
  className?: string;
  variant?: "ribbon" | "institutional";
};

const INSTITUTIONAL_STATEMENTS = [
  {
    label: "Operating posture",
    statement: "QuantAI is an intelligence layer, not a transactional guarantee.",
    detail:
      "Signal posture blends pricing position, review quality, and retailer trust within the observed tray.",
  },
  {
    label: "Confidence boundary",
    statement: "Confidence compresses when coverage is sparse or merchants diverge.",
    detail: "Validate all material terms at checkout before commitment.",
  },
  {
    label: "Session governance",
    statement: "Authenticated sessions unlock full-rate search and secure persistence.",
    detail: "Saves, history, and billing operate under authenticated clearance only.",
  },
  {
    label: "Data constraint",
    statement: "Retention is constrained to system operation only.",
    detail: "No ad-profile resale and no query brokerage.",
  },
] as const;

/** Compact trust + AI disclaimer for footers and modals. */
export default function TrustRibbon({ className = "", variant = "ribbon" }: Props) {
  if (variant === "institutional") {
    return (
      <aside
        className={`qa-ref-intel-notice ${className}`.trim()}
        aria-label="Institutional intelligence notice"
      >
        <header className="qa-ref-intel-notice__head">
          <p className="qa-ref-intel-notice__kicker">Intelligence governance</p>
          <h2 className="qa-ref-intel-notice__title">Institutional notice</h2>
        </header>

        <div className="qa-ref-intel-notice__grid">
          {INSTITUTIONAL_STATEMENTS.map((item) => (
            <article key={item.label} className="qa-ref-intel-notice__item">
              <p className="qa-ref-intel-notice__label">{item.label}</p>
              <p className="qa-ref-intel-notice__statement">{item.statement}</p>
              <p className="qa-ref-intel-notice__detail">{item.detail}</p>
            </article>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <div
      className={`qa-ui-surface w-full min-w-0 max-w-full px-4 py-4 sm:px-6 ${className}`}
    >
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
        <div className="min-w-0 w-full flex-1 basis-full sm:basis-0 sm:min-w-[min(100%,28rem)]">
          <p className="cockpit-body flex items-start gap-2 text-[12px] leading-relaxed text-slate-400">
            <Shield className="mt-0.5 size-4 shrink-0 text-cyan-400/55" strokeWidth={1.5} aria-hidden />
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
              <span className="font-semibold text-slate-300">
                QuantAI is an intelligence layer, not a transactional guarantee.
              </span>{" "}
              Signal posture blends pricing position, review quality, and retailer trust within the observed tray.
              Confidence compresses when coverage is sparse or merchants diverge; validate all material terms at
              checkout.
            </span>
          </p>
        </div>
        <div className="min-w-0 w-full flex-1 basis-full sm:basis-0 sm:min-w-[min(100%,22rem)]">
          <p className="cockpit-body flex items-start gap-2 text-[12px] leading-relaxed text-slate-500">
            <Lock className="mt-0.5 size-4 shrink-0 text-violet-400/50" strokeWidth={1.5} aria-hidden />
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
              Authenticated sessions unlock full-rate search and secure persistence for saves, history, and billing.
              Retention is constrained to system operation only—no ad-profile resale and no query brokerage.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
