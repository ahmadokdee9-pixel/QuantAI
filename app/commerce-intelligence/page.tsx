import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Commerce Intelligence",
  description:
    "QuantAI commerce intelligence pages for product decisions, price timing, seller trust, and regional market comparison.",
};

const lanes = [
  ["NL electronics", "/commerce-intelligence/nl/electronics", "Dutch electronics pricing, retailer trust, and marketplace balance."],
  ["EU beauty", "/commerce-intelligence/eu/beauty", "Beauty, skincare, fragrance, discount quality, and trusted sellers."],
  ["UK gaming", "/commerce-intelligence/uk/gaming", "Gaming hardware and accessory comparison across UK-oriented merchants."],
  ["US luxury", "/commerce-intelligence/us/luxury", "Premium/luxury shopping signals, seller safety, and markup awareness."],
];

export default function CommerceIntelligencePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <section className="qa-premium-surface rounded-[2rem] p-7 sm:p-10">
        <p className="cockpit-overline text-cyan-200/75">QuantAI commerce intelligence</p>
        <h1 className="cockpit-display mt-4 max-w-3xl text-3xl text-white sm:text-5xl">
          Regional market reads for smarter product decisions.
        </h1>
        <p className="cockpit-body mt-5 max-w-2xl text-sm text-slate-400 sm:text-base">
          QuantAI compares live product markets through price quality, seller trust, timing risk, and regional fit.
          These pages are evergreen launch surfaces, not thin search-result archives.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {lanes.map(([label, href, body]) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl border border-white/[0.075] bg-black/25 p-5 transition hover:border-cyan-400/22 hover:bg-white/[0.045]"
            >
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
