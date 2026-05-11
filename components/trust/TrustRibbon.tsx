"use client";

import { Lock, Shield } from "lucide-react";

type Props = {
  className?: string;
};

/** Compact trust + AI disclaimer for footers and modals. */
export default function TrustRibbon({ className = "" }: Props) {
  return (
    <div
      className={`w-full min-w-0 max-w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 backdrop-blur-xl sm:px-6 ${className}`}
    >
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
        <div className="min-w-0 w-full flex-1 basis-full sm:basis-0 sm:min-w-[min(100%,28rem)]">
          <p className="cockpit-body flex items-start gap-2 text-[12px] leading-relaxed text-slate-400">
            <Shield className="mt-0.5 size-4 shrink-0 text-cyan-400/55" strokeWidth={1.5} aria-hidden />
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
              <span className="font-semibold text-slate-300">QuantAI is decision support—not a guarantee.</span>{" "}
              Rankings blend price position, reviews, and retailer trust for the listings in this tray only. Confidence
              drops when data is sparse or stores are uneven; treat scores as orientation, then confirm every material
              fact at checkout.
            </span>
          </p>
        </div>
        <div className="min-w-0 w-full flex-1 basis-full sm:basis-0 sm:min-w-[min(100%,22rem)]">
          <p className="cockpit-body flex items-start gap-2 text-[12px] leading-relaxed text-slate-500">
            <Lock className="mt-0.5 size-4 shrink-0 text-violet-400/50" strokeWidth={1.5} aria-hidden />
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
              Signed-in sessions unlock fair-rate search and sync for saves, history, and billing. We keep retention
              tight to what runs the product—no ads profile, no resale of your queries.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
