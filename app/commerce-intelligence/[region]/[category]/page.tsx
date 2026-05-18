import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const REGIONS = {
  nl: "Netherlands",
  eu: "Europe",
  uk: "United Kingdom",
  us: "United States",
} as const;

const CATEGORIES = {
  electronics: "Electronics",
  furniture: "Furniture",
  beauty: "Beauty",
  gaming: "Gaming",
  luxury: "Luxury",
} as const;

type Params = {
  region: keyof typeof REGIONS;
  category: keyof typeof CATEGORIES;
};

export function generateStaticParams(): Params[] {
  return [
    { region: "nl", category: "electronics" },
    { region: "nl", category: "furniture" },
    { region: "eu", category: "beauty" },
    { region: "uk", category: "gaming" },
    { region: "us", category: "luxury" },
  ];
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const region = REGIONS[params.region];
  const category = CATEGORIES[params.category];
  if (!region || !category) return {};
  return {
    title: `${category} Intelligence in ${region}`,
    description: `QuantAI ${category.toLowerCase()} commerce intelligence for ${region}: price timing, trusted sellers, market spread, and buying decisions.`,
  };
}

export default function RegionalCategoryPage({ params }: { params: Params }) {
  const region = REGIONS[params.region];
  const category = CATEGORIES[params.category];
  if (!region || !category) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <article className="qa-premium-surface rounded-[2rem] p-7 sm:p-10">
        <Link href="/commerce-intelligence" className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
          Commerce intelligence
        </Link>
        <h1 className="cockpit-display mt-5 text-3xl text-white sm:text-5xl">
          {category} market intelligence for {region}.
        </h1>
        <p className="cockpit-body mt-5 text-base leading-relaxed text-slate-400">
          QuantAI evaluates {category.toLowerCase()} products through live market coverage, seller trust,
          same-product comparison, regional pricing, and discount timing. Search naturally to generate a fresh
          product tray for your exact budget, language, and buying intent.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {["Price quality", "Trusted sellers", "Buying timing"].map((label) => (
            <div key={label} className="rounded-2xl border border-white/[0.075] bg-black/25 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</p>
              <p className="mt-2 text-sm text-slate-300">
                AI commerce signals designed for cleaner purchase decisions.
              </p>
            </div>
          ))}
        </div>
        <Link
          href={`/?q=best ${category.toLowerCase()} in ${region.toLowerCase()}`}
          className="mt-8 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
        >
          Run live market scan
        </Link>
      </article>
    </main>
  );
}
