"use client";

import { useState } from "react";
import { ChevronDown, Gauge, Scale, Sparkles } from "lucide-react";

const blocks = [
  {
    title: "How QuantAI works",
    body: "We ingest live shopping listings for your query, normalize price and store signals, then rank with a composite that blends value, visible ratings, and retailer trust priors. Nothing is “magic”—it is structured comparison on the tray you see.",
    icon: Sparkles,
  },
  {
    title: "Confidence & limits",
    body: "Scores compress uncertainty: sparse reviews, volatile prices, or unknown storefronts lower confidence. QuantAI never sees your checkout cart or post-purchase outcomes—verify returns, warranty, and final price on the retailer site.",
    icon: Gauge,
  },
  {
    title: "Retailer trust",
    body: "Trust is a prior from storefront patterns and marketplace cues in the feed—not a legal endorsement. Unknown sellers can still list attractive prices; use Compare lab and the copilot to stress-test before you pay.",
    icon: Scale,
  },
] as const;

export default function QuantAITransparencySection() {
  const [open, setOpen] = useState(0);

  return (
    <section
      id="quantai-trust"
      className="mx-auto max-w-6xl scroll-mt-28 px-4 sm:px-6 py-16 sm:py-20 border-t border-white/[0.06]"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">Trust & clarity</p>
        <h2 className="cockpit-display mt-3 text-2xl text-white sm:text-3xl">How QuantAI thinks in public</h2>
        <p className="cockpit-body mt-3 text-sm text-slate-500">
          Transparent by design—so early users know what the signal is, and what it is not.
        </p>
      </div>
      <div className="mx-auto mt-10 max-w-3xl space-y-2">
        {blocks.map((b, i) => {
          const Icon = b.icon;
          const isOpen = open === i;
          return (
            <div
              key={b.title}
              className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="flex w-full min-h-[3.25rem] items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.04] sm:px-5"
                aria-expanded={isOpen}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-cyan-200/90">
                  <Icon className="size-4" strokeWidth={1.5} aria-hidden />
                </span>
                <span className="flex-1 text-sm font-semibold text-white/90">{b.title}</span>
                <ChevronDown
                  className={`size-4 shrink-0 text-slate-500 transition ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              {isOpen ? (
                <div className="border-t border-white/[0.06] px-4 pb-4 pt-1 sm:px-5">
                  <p className="cockpit-body text-sm leading-relaxed text-slate-400">{b.body}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
