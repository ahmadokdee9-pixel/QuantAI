"use client";

import { Gauge, Scale, Sparkles } from "lucide-react";

const blocks = [
  {
    title: "Signal construction",
    body: "Live listings are normalized into one field. Pricing, trust priors, and quality cues are fused into a single decision surface.",
    icon: Sparkles,
  },
  {
    title: "Confidence boundaries",
    body: "Confidence compresses uncertainty. Sparse coverage, unstable pricing, or weak merchant history immediately suppress signal authority.",
    icon: Gauge,
  },
  {
    title: "Merchant governance",
    body: "Retail trust is a calibrated prior from storefront behavior and marketplace structure. It is weighted before commitment posture is surfaced.",
    icon: Scale,
  },
] as const;

export default function QuantAITransparencySection() {
  return (
    <section
      id="quantai-trust"
      className="qa-dna-zone qa-dna-zone--tight qa-institutional-doctrine qa-lower-rebuild-card scroll-mt-28"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-700/80">
          Intelligence governance
        </p>
        <h2 className="cockpit-display mt-3 text-2xl text-slate-900 sm:text-3xl">
          How QuantAI calibrates signal authority
        </h2>
        <p className="cockpit-body mt-3 text-sm text-slate-700">
          Governance modules expose how posture is formed, where uncertainty enters, and how trust is weighted.
        </p>
      </div>
      <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
        {blocks.map((b) => {
          const Icon = b.icon;
          return (
            <article
              key={b.title}
              className="qa-institutional-doctrine-card overflow-hidden rounded-2xl border border-violet-200/80 bg-white/85 p-5 shadow-[0_18px_44px_-32px_rgba(108,92,255,0.3)] backdrop-blur-md"
            >
              <span className="flex size-9 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700">
                <Icon className="size-4" strokeWidth={1.5} aria-hidden />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">{b.title}</h3>
              <p className="cockpit-body mt-3 text-sm leading-relaxed text-slate-700">{b.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
