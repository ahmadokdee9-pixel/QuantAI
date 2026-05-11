"use client";

import { Lock, Shield } from "lucide-react";

type Props = {
  className?: string;
};

/** Compact trust + AI disclaimer for footers and modals. */
export default function TrustRibbon({ className = "" }: Props) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 backdrop-blur-xl sm:px-6 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="cockpit-body flex items-start gap-2 text-[12px] text-slate-400 sm:max-w-[70%]">
          <Shield className="mt-0.5 size-4 shrink-0 text-cyan-400/55" strokeWidth={1.5} aria-hidden />
          <span>
            <span className="font-medium text-slate-300">AI decision support, not financial advice.</span> Scores
            reflect listings in your current tray—always verify price, warranty, and seller at checkout. Missing data
            lowers confidence; we surface warnings when signals are thin.
          </span>
        </p>
        <p className="cockpit-body flex items-start gap-2 text-[12px] text-slate-500 sm:shrink-0">
          <Lock className="mt-0.5 size-4 shrink-0 text-violet-400/50" strokeWidth={1.5} aria-hidden />
          <span>
            Signed-in search uses your account for fair limits. We minimize retention to what powers saves,
            history, and feedback you send.
          </span>
        </p>
      </div>
    </div>
  );
}
