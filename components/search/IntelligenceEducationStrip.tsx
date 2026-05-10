"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Brain, LineChart, Shield, Sparkles, Wallet } from "lucide-react";

const CARDS = [
  {
    icon: Sparkles,
    title: "How QuantAI scores",
    body: "Every QI composite blends price fit, rating signal, review depth, retailer trust signal, delivery language, popularity, price-to-quality balance, and discount quality—category-aware, never a single slider.",
  },
  {
    icon: Brain,
    title: "Why Decision Confidence matters",
    body: "Confidence is how aligned those sub-signals are. When one dimension drags while others soar, purchase clarity drops—even if the headline score looks fine.",
  },
  {
    icon: Shield,
    title: "Trust signals, explained",
    body: "We pattern-match storefront names to tiers of checkout friction and buyer protection history you would recognize—then calibrate conservatively for unknown sellers.",
  },
  {
    icon: Wallet,
    title: "Why price alone fails",
    body: "Cheap listings with weak trust or thin reviews often cost more in time, returns, and regret. QuantAI weights price-to-quality balance so value survives contact with reality.",
  },
  {
    icon: LineChart,
    title: "How we reduce bad buys",
    body: "Side-by-side compare, QuantAI Verdict copy, and this intelligence deck exist to replace tab chaos with a disciplined decision workflow before you ever hit checkout.",
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
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        Decision literacy
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {CARDS.map((card, i) => (
          <div
            key={card.title}
            className="flex min-h-[140px] flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-black/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          >
            <card.icon className="size-4 text-cyan-300/75" strokeWidth={1.5} aria-hidden />
            <h3 className="mt-2 text-[12px] font-semibold tracking-tight text-white/95">{card.title}</h3>
            <p className="mt-1.5 flex-1 text-[11px] font-normal leading-relaxed text-slate-500">{card.body}</p>
            <span className="mt-2 text-[10px] font-medium tabular-nums text-slate-600">{String(i + 1).padStart(2, "0")}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
