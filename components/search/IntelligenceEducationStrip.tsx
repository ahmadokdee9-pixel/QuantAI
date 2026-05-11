"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Brain, LineChart, Shield, Sparkles, Wallet } from "lucide-react";

const CARDS = [
  {
    icon: Sparkles,
    title: "The QI composite",
    body: "A fused index: price position in your tray, rating strength, review depth, retailer trust, delivery cues, demand proxies, and discount sanity—weighted by category so no single dial dominates.",
  },
  {
    icon: Brain,
    title: "Confidence, not bravado",
    body: "When sub-signals disagree, uncertainty rises. A glossy headline score with a weak trust tail is flagged—clarity should feel calm, not loud.",
  },
  {
    icon: Shield,
    title: "Store risk, transparently",
    body: "Recognized retailers lift confidence; unknown storefronts are scored conservatively. We bias toward buyer protection you can reason about, not hidden vendor scores.",
  },
  {
    icon: Wallet,
    title: "Price without blind spots",
    body: "The cheapest row is not always the intelligent row. We penalize thin social proof and fragile fulfillment language so “value” survives the moment you click through.",
  },
  {
    icon: LineChart,
    title: "A cockpit, not a carousel",
    body: "Compare lab, verdict copy, and this strip replace infinite tabs with a disciplined path: observe the tray, stress-test finalists, then checkout with receipts for your logic.",
  },
] as const;

export default function IntelligenceEducationStrip() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mb-10"
    >
      <p className="cockpit-overline mb-3 text-slate-500">Signal literacy</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {CARDS.map((card, i) => (
          <div
            key={card.title}
            className="cockpit-card-lift flex min-h-[148px] flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-black/38 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_50px_-40px_rgba(0,0,0,0.75)] hover:border-cyan-400/15"
          >
            <card.icon className="size-4 text-cyan-300/80" strokeWidth={1.5} aria-hidden />
            <h3 className="mt-2.5 text-[12px] font-semibold tracking-tight text-white/95">{card.title}</h3>
            <p className="cockpit-body mt-2 flex-1 text-[11px] text-slate-500">{card.body}</p>
            <span className="mt-3 text-[10px] font-semibold tabular-nums tracking-wider text-slate-600">
              {String(i + 1).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
