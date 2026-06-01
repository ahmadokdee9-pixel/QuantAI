"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CommandSidebar from "@/components/layout/CommandSidebar";
import LandingNav from "@/components/landing/LandingNav";
import EnterpriseFooter from "@/components/layout/EnterpriseFooter";
import IntelligenceMetricCards from "@/components/home/IntelligenceMetricCards";
import GlobalCommerceIntelligenceNetwork from "@/components/home/GlobalCommerceIntelligenceNetwork";
import RetailerMarquee from "@/components/home/RetailerMarquee";
import TrustRibbon from "@/components/trust/TrustRibbon";

const FLOW_STEPS = [
  {
    title: "Search the market",
    body: "Enter any product. QuantAI scans live listings across trusted retailers and marketplaces.",
  },
  {
    title: "Read live intelligence metrics",
    body: "Sources scanned, trusted sellers, price band, and market posture update in real time.",
  },
  {
    title: "Review the market summary",
    body: "Average price, best value seller, highest trust seller, and a single buying recommendation.",
  },
  {
    title: "Compare top recommendations",
    body: "Highest-confidence picks surface first with verdict, seller, trust, and confidence.",
  },
  {
    title: "Act on the decision summary",
    body: "Every listing carries BUY READY, WAIT, COMPARE, or AVOID with a clear reason.",
  },
] as const;

const VERDICTS = [
  { label: "BUY READY", detail: "Trust and value align — checkout path looks sound." },
  { label: "WAIT", detail: "Price or timing favors patience over immediate purchase." },
  { label: "COMPARE", detail: "Multiple competitive offers — compare before committing." },
  { label: "AVOID", detail: "Seller trust or listing quality falls below threshold." },
] as const;

export default function HowItWorksContent() {
  return (
    <main className="qa-ref-os qa-ref-os--phase7 qa-ref-os--decision-system relative min-h-screen overflow-x-hidden">
      <CommandSidebar />

      <div className="qa-ref-shell">
        <LandingNav />

        <div className="qa-ref-workspace">
          <section className="qa-ref-hero">
            <div className="qa-ref-hero__content">
              <p className="qa-ref-kicker">Intelligence experience</p>
              <h1 className="qa-ref-display">
                How QuantAI
                <span className="qa-ref-display__accent"> reads a purchase.</span>
              </h1>
              <p className="qa-ref-lead">
                Price, trust, timing, and product quality — synthesized into one decision before checkout.
              </p>
              <IntelligenceMetricCards />
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/" className="qa-ref-btn qa-ref-btn--primary">
                  Run a live scan
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link href="/pricing" className="qa-ref-btn qa-ref-btn--ghost">
                  View intelligence plans
                </Link>
              </div>
            </div>
          </section>

          <section className="qa-ref-section">
            <div className="qa-ref-card">
              <p className="qa-ref-kicker">Decision flow</p>
              <h2 className="qa-ref-h2 mt-2">From search to buying recommendation</h2>
              <ol className="qa-ref-how-flow mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {FLOW_STEPS.map((step, index) => (
                  <li key={step.title} className="qa-ref-how-flow__step">
                    <span className="qa-ref-how-flow__index">{String(index + 1).padStart(2, "0")}</span>
                    <h3 className="qa-ref-how-flow__title">{step.title}</h3>
                    <p className="qa-ref-how-flow__body">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="qa-ref-section qa-ref-section--tight">
            <div className="qa-ref-card">
              <p className="qa-ref-kicker">Verdict system</p>
              <h2 className="qa-ref-h2 mt-2">One primary recommendation per listing</h2>
              <div className="qa-ref-how-verdicts mt-6 grid gap-3 sm:grid-cols-2">
                {VERDICTS.map((v) => (
                  <div
                    key={v.label}
                    className={`qa-ref-how-verdicts__item qa-ref-how-verdicts__item--${v.label.replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    <p className="qa-ref-how-verdicts__label">{v.label}</p>
                    <p className="qa-ref-how-verdicts__detail">{v.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="qa-ref-section qa-ref-section--gcin">
            <GlobalCommerceIntelligenceNetwork />
          </section>

          <section className="qa-ref-section qa-ref-section--tight">
            <RetailerMarquee />
          </section>

          <section className="qa-ref-section qa-ref-section--tight">
            <TrustRibbon />
          </section>

          <EnterpriseFooter />
        </div>
      </div>
    </main>
  );
}
