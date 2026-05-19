import Link from "next/link";
import { notFound } from "next/navigation";

const POLICIES: Record<string, { title: string; summary: string }> = {
  privacy: {
    title: "Privacy Policy",
    summary: "How QuantAI processes account, usage, and commerce intelligence signals.",
  },
  terms: {
    title: "Terms of Service",
    summary: "Terms governing access to QuantAI commerce intelligence systems.",
  },
  billing: {
    title: "Billing Policy",
    summary: "Clearance billing, renewal, and access layer changes.",
  },
  refund: {
    title: "Refund Policy",
    summary: "Refund eligibility for intelligence clearance subscriptions.",
  },
  security: {
    title: "Data & Security",
    summary: "Data handling, encryption posture, and operational safeguards.",
  },
  trust: {
    title: "Trust & Safety",
    summary: "Responsible use of commerce signals and retailer-facing outputs.",
  },
  cookies: {
    title: "Cookies",
    summary: "Session, analytics, and preference cookies used by QuantAI.",
  },
  status: {
    title: "System Status",
    summary: "Availability of search, synthesis, and intelligence pipelines.",
  },
};

type Props = { params: Promise<{ slug: string }> };

export default async function LegalPolicyPage({ params }: Props) {
  const { slug } = await params;
  const policy = POLICIES[slug];
  if (!policy) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-20 sm:px-6 sm:py-28">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/75">
        QuantAI governance
      </p>
      <h1 className="qi-editorial-display mt-3 text-3xl text-white/95">{policy.title}</h1>
      <p className="qi-silent-whisper mt-4">{policy.summary}</p>
      <p className="mt-8 text-sm leading-relaxed text-slate-500">
        Full policy documentation is being published. For immediate requests, contact{" "}
        <a href="mailto:trust@quantai.app" className="text-cyan-300/90 hover:text-cyan-200">
          trust@quantai.app
        </a>
        .
      </p>
      <Link href="/" className="mt-10 inline-block text-sm text-cyan-300/85 hover:text-cyan-200">
        ← Return to intelligence field
      </Link>
    </main>
  );
}
