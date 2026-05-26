"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { apiErrorText, isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";
import type { CopilotStructuredResponse } from "@/lib/copilot/structuredResponse";
import { useCopilotSession } from "@/components/copilot/CopilotContext";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  structured?: CopilotStructuredResponse;
  source?: string;
};

const CHIPS: { label: string; prompt: string }[] = [
  { label: "Is this discount real?", prompt: "Using only my current tray, which headline discounts look authentic versus inflated anchors or suspiciously low asks? Be explicit about heuristics and what to verify." },
  { label: "Buy now or wait?", prompt: "For my current search results, should I buy now or wait for better pricing? Use QuantAI timing reads (tray volatility, fair-band, trust) — no fabricated price history." },
  { label: "Best store discount?", prompt: "Which store in my tray has the best discount after QuantAI trust weighting and suspiciousDiscountRisk—not just the largest percent off? Use fields on each product brief." },
  { label: "Trusted deals only", prompt: "Show only trusted deals from my tray: filter using hasDiscount, shelfLabels, storeTrust, suspiciousDiscountRisk, and discountConfidence; explain each keep or drop." },
  { label: "Low-risk discount", prompt: "Find the best discount with low risk in my tray: rank using suspiciousDiscountRisk, discountConfidence, retailerIntelligenceScore, and worthBuyingNow." },
  { label: "Stronger discounts", prompt: "Where are the strongest real discounts in my tray after authenticity and trust adjustments—not just the biggest % off?" },
  { label: "Why risky?", prompt: "If any row looks like a risky discount, explain exactly which signals triggered that label and what I should verify before checkout." },
  { label: "Best buy", prompt: "Which one should I buy and why? Pick the best buy from my current tray." },
  { label: "Cheapest safe option", prompt: "What is the cheapest safe option here for my budget?" },
  { label: "Long-term value", prompt: "Compare these products for long-term value." },
  { label: "Avoid risks", prompt: "What should I avoid in this result set?" },
  { label: "Compare selected", prompt: "Compare the products I have in my compare tray for overall fit." },
  { label: "Explain score", prompt: "Explain how QuantAI scores these listings and what matters most." },
];

const FOLLOW_UP_CHIPS: { label: string; prompt: string }[] = [
  { label: "Why this product?", prompt: "For the top-ranked listing in my tray, explain why it is there: which signals lifted it and what I should still verify manually." },
  { label: "Why cheaper?", prompt: "Why is the cheapest listing cheaper than the others? Explain using discountExplanation, suspiciousDiscountRisk, liveRankExplanation, and retailerTrustNote from QuantAI." },
  { label: "Find cheaper", prompt: "Find cheaper alternatives in my current tray that still look sane on trust and reviews, and explain the tradeoffs vs the top pick." },
  { label: "Compare top 3", prompt: "Compare the top 3 listings by composite score as a pre-checkout brief: winner, safer choice, better value, and the riskiest option if any." },
  { label: "Safest retailer", prompt: "Which retailer in my tray has the strongest trust prior and what does that mean in practice at checkout—not marketing fluff." },
  { label: "Best long-term value", prompt: "Which option is best for long-term value in this tray, weighing reviews, trust, delivery language, and price realism." },
  { label: "Verify before buying", prompt: "What should I verify on the seller page before buying any pick from this tray? Be specific and conservative." },
  { label: "Hidden fees?", prompt: "What fees or caveats should I watch for in these listings?" },
  { label: "Delivery risk", prompt: "Which pick has the safest delivery / return story in this tray?" },
  { label: "Price vs trust", prompt: "How do price and store trust trade off in my top results?" },
];

const DEEPER_CHIPS: { label: string; prompt: string }[] = [
  {
    label: "Retailer risk",
    prompt:
      "Why might retailer risk be elevated on any row in my current tray? Explain the heuristics transparently and what I should verify manually.",
  },
  {
    label: "Confidence score",
    prompt:
      "Explain how to read QuantAI confidence on these listings—what increases it, what caps it, and where the model is uncertain.",
  },
  {
    label: "Safer alternatives",
    prompt: "List safer retailer alternatives in my tray for the same intent, even if they cost a bit more.",
  },
  {
    label: "Reasoning depth",
    prompt:
      "Expand the reasoning behind the top-ranked pick versus the second-ranked pick using only fields you can see in my tray.",
  },
];

function OptionBlock({
  title,
  opt,
}: {
  title: string;
  opt: { title: string; link: string; reason: string } | null;
}) {
  if (!opt) return null;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300/80">{title}</p>
      <p className="mt-1 text-sm font-medium text-white/90 line-clamp-2">{opt.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{opt.reason}</p>
    </div>
  );
}

function TypingRow({ active, reduce }: { active: boolean; reduce: boolean | null }) {
  if (!active) return null;
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2" aria-live="polite">
      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Copilot</span>
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-cyan-400/75"
            animate={reduce ? { opacity: 0.9 } : { opacity: [0.25, 1, 0.25] }}
            transition={
              reduce
                ? { duration: 0 }
                : { repeat: Infinity, duration: 0.9, delay: i * 0.12, ease: "easeInOut" }
            }
          />
        ))}
      </div>
    </div>
  );
}

export default function CopilotDrawer() {
  const reduce = useReducedMotion();
  const { session } = useCopilotSession();

  const contextualChips = useMemo(() => {
    const out: { label: string; prompt: string }[] = [];
    const prods = session.products;
    if (prods.length === 0) return out;

    const minTrust = Math.min(...prods.map((p) => p.storeTrust ?? 70));
    const sorted = [...prods].sort((a, b) => (b.qiComposite ?? 0) - (a.qiComposite ?? 0));
    const maxQi = sorted[0]?.qiComposite ?? 0;
    const secondQi = sorted[1]?.qiComposite ?? 0;
    const top = sorted[0];

    out.push({
      label: "Show safer retailers",
      prompt:
        "Which listings come from the safest retailers in my current tray and why? Rank by trust, not just price.",
    });
    if (minTrust < 65) {
      out.push({
        label: "Only trusted stores",
        prompt: "Which options should I drop because store trust is too weak for a cautious buyer?",
      });
    }
    out.push({
      label: "Best long-term option",
      prompt: "What is the best long-term value pick in this tray considering trust, reviews, and price realism?",
    });
    out.push({
      label: "Best value under budget",
      prompt: "Which pick balances price and risk best without chasing sketchy discounts?",
    });
    if (session.compareTrayLinks.length < 2 && prods.length >= 2) {
      out.push({
        label: "Compare top 3",
        prompt: "If I compared the top 3 listings by composite score, what tradeoffs would you highlight?",
      });
    }
    const suspicious = prods.filter((p) => p.priceAnomaly === "suspicious_low" || p.priceAnomaly === "deep_discount");
    if (suspicious.length > 0) {
      out.push({
        label: "Price realism check",
        prompt:
          "Some rows look like deep discounts or suspiciously low prices relative to the tray—walk me through how to validate them before checkout.",
      });
    }
    if (top) {
      out.push({
        label: "Why ranked first?",
        prompt: `Why is "${top.title.slice(0, 80)}" ranked first in my current tray? Explain the main signals transparently.`,
      });
    }
    if (maxQi - secondQi < 6 && prods.length > 1) {
      out.push({
        label: "Tie-break advice",
        prompt: "Top listings are close in composite—what should break ties for a cautious buyer?",
      });
    }
    return out.slice(0, 6);
  }, [session.products, session.compareTrayLinks]);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
  }, [msgs, open, busy]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      const userMsg: Msg = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      setMsgs((m) => [...m, userMsg]);
      setInput("");

      const tail = msgs
        .slice(-8)
        .map((x) => ({ role: x.role, content: x.content }));

      try {
        const res = await fetch("/api/copilot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            message: trimmed,
            session,
            conversationTail: tail,
          }),
        });

        type Root = {
          structured?: CopilotStructuredResponse;
          source?: string;
          retryAfter?: number;
        };
        const parsed = await readApiJson<Root>(res);
        const data = parsed.data;
        let structured =
          data?.structured ??
          (parsed.data &&
          typeof parsed.data === "object" &&
          "structured" in parsed.data &&
          (parsed.data as Root).structured
            ? (parsed.data as Root).structured
            : undefined);
        let source = data?.source ?? "heuristic";

        if (isApiFailure(parsed) && structured) {
          source = "heuristic";
        }

        if (!structured) {
          structured = {
            finalRecommendation: apiErrorText(parsed, "Copilot could not load a structured answer."),
            bestOption: null,
            avoidOption: null,
            budgetPick: null,
            premiumPick: null,
            riskWarnings: [],
            comparisonSummary: "",
            nextAction: res.status === 429 ? `Try again in ~${(parsed.data as Root)?.retryAfter ?? 60}s.` : "Retry in a moment.",
          };
        }

        const narrative = [
          structured.finalRecommendation,
          structured.comparisonSummary && `— ${structured.comparisonSummary}`,
        ]
          .filter(Boolean)
          .join("\n\n");

        setMsgs((m) => [
          ...m,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: narrative,
            structured,
            source,
          },
        ]);
      } catch {
        setMsgs((m) => [
          ...m,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: "Network error — check your connection and try again.",
          },
        ]);
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [msgs, session]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto fixed bottom-[max(5.5rem,env(safe-area-inset-bottom,0px)+4rem)] left-[max(0.75rem,env(safe-area-inset-left,0px))] z-[92] flex size-14 items-center justify-center rounded-2xl border border-cyan-400/35 bg-gradient-to-br from-cyan-500/25 to-violet-600/25 text-cyan-50 shadow-[0_16px_48px_-12px_rgba(34,211,238,0.35)] backdrop-blur-md transition hover:brightness-110 active:scale-[0.98] lg:bottom-28"
        aria-label="Open QuantAI copilot"
      >
        <Sparkles className="size-6" strokeWidth={1.5} aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[96] flex justify-end"
            initial={{ opacity: reduce ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reduce ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
          >
            <button
              type="button"
              className="qa-modal-scrim"
              aria-label="Close copilot"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="copilot-title"
              initial={{ x: reduce ? 0 : 320, opacity: reduce ? 1 : 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: reduce ? 0 : 320, opacity: reduce ? 1 : 0 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 380, damping: 34 }
              }
              className="relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden border-l border-white/[0.08] bg-[#060b18]/96 shadow-[-24px_0_80px_-20px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-5 text-cyan-300/90" strokeWidth={1.5} aria-hidden />
                  <div>
                    <p id="copilot-title" className="text-sm font-semibold text-white">
                      QuantAI Copilot
                    </p>
                    <p className="text-[10px] text-slate-500">Tray-aware · compares · saved context</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Close"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>

              <div className="flex max-h-[28%] min-h-0 flex-col gap-1.5 border-b border-white/[0.05] px-3 py-2">
                {contextualChips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {contextualChips.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        disabled={busy}
                        onClick={() => void send(c.prompt)}
                        className="rounded-full border border-cyan-400/22 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-medium text-cyan-100/95 transition hover:border-cyan-400/35 hover:bg-cyan-500/15 disabled:opacity-50"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {CHIPS.map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      disabled={busy}
                      onClick={() => void send(c.prompt)}
                      className="rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-slate-300 transition hover:border-cyan-400/25 hover:text-white disabled:opacity-50"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3">
                {msgs.length === 0 && (
                  <p className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-3 text-xs leading-relaxed text-slate-400">
                    Ask about your current search tray, saved items, compare picks, or plan limits. Answers use QuantAI
                    data first; gaps are called out explicitly.
                  </p>
                )}
                {msgs.map((m) => (
                  <motion.div
                    key={m.id}
                    layout
                    initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    className={
                      m.role === "user"
                        ? "ml-6 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-50/95"
                        : "space-y-2"
                    }
                  >
                    {m.role === "user" ? (
                      m.content
                    ) : (
                      <>
                        <p className="text-sm leading-relaxed text-slate-200/95 whitespace-pre-wrap">{m.content}</p>
                        {m.structured && (
                          <div className="space-y-2 rounded-2xl border border-white/[0.07] bg-black/30 p-3">
                            <OptionBlock title="Best option" opt={m.structured.bestOption} />
                            <OptionBlock title="Avoid" opt={m.structured.avoidOption} />
                            <div className="grid gap-2 sm:grid-cols-2">
                              <OptionBlock title="Budget pick" opt={m.structured.budgetPick} />
                              <OptionBlock title="Premium pick" opt={m.structured.premiumPick} />
                            </div>
                            {m.structured.riskWarnings.length > 0 && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
                                  Risks
                                </p>
                                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-amber-100/90">
                                  {m.structured.riskWarnings.map((r, i) => (
                                    <li key={i}>{r}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Next</p>
                            <p className="text-xs text-slate-300">{m.structured.nextAction}</p>
                            {m.source && (
                              <p className="text-[10px] text-slate-600">Source · {m.source}</p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                ))}
                <TypingRow active={busy} reduce={reduce} />
                {!busy && msgs.length > 0 && msgs[msgs.length - 1]?.role === "assistant" && (
                  <div className="flex flex-col gap-1.5 border-t border-white/[0.04] pt-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Ask deeper</span>
                    <div className="flex flex-wrap gap-1.5">
                      {DEEPER_CHIPS.map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          disabled={busy}
                          onClick={() => void send(c.prompt)}
                          className="rounded-full border border-cyan-400/15 bg-cyan-500/[0.06] px-2.5 py-1 text-[10px] font-medium text-cyan-100/90 transition hover:border-cyan-400/30 disabled:opacity-50"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Follow-ups</span>
                    <div className="flex flex-wrap gap-1.5">
                      {FOLLOW_UP_CHIPS.map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          disabled={busy}
                          onClick={() => void send(c.prompt)}
                          className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-slate-400 transition hover:border-cyan-400/20 hover:text-slate-200 disabled:opacity-50"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <div className="border-t border-white/[0.06] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), void send(input))}
                    placeholder="Ask QuantAI…"
                    className="min-h-[44px] flex-1 rounded-xl border border-white/[0.1] bg-black/35 px-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-400/30"
                    disabled={busy}
                  />
                  <button
                    type="button"
                    disabled={busy || !input.trim()}
                    onClick={() => void send(input)}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 transition enabled:hover:brightness-105 disabled:opacity-45"
                    aria-label="Send"
                  >
                    <Send className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
