"use client";

import { useCallback, useEffect, useState, startTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Radar, Sparkles, X } from "lucide-react";
import { readLocalSignals } from "@/lib/personalization/localSignals";

const LS_DONE = "quantai_onboarding_v1_done";

const FEATURES = [
  { title: "AI commerce intelligence", body: "Live listings ranked for your exact query—not generic bestsellers." },
  { title: "AI verdicts & Compare lab", body: "Stress-test finalists side-by-side with structured rationale." },
  { title: "Trust scoring", body: "Store priors and marketplace cues folded into every score." },
  { title: "Saved + watchlist", body: "Anchor what matters; your dashboard mirrors account state." },
  { title: "Copilot assistant", body: "Ask in plain language about the tray you are looking at right now." },
] as const;

const EXAMPLE_PROMPTS = [
  "Best laptop under €1200",
  "Safest iPhone deal",
  "Best value office chair",
  "Compare PS5 vs Xbox",
] as const;

const POPULAR = ["Wireless earbuds under €80", "4K monitor programming", "Robot vacuum deals"] as const;

function dispatchTrySearch(q: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("quantai:try-search", { detail: { q } }));
}

export default function OnboardingWelcome() {
  const reduce = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const done = window.localStorage.getItem(LS_DONE) === "1";
      startTransition(() => {
        setOpen(!done);
        setHydrated(true);
      });
    } catch {
      startTransition(() => {
        setOpen(true);
        setHydrated(true);
      });
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(LS_DONE, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }, []);

  const trySearch = useCallback(
    (q: string) => {
      dismiss();
      queueMicrotask(() => dispatchTrySearch(q));
    },
    [dismiss]
  );

  if (!hydrated) return null;

  const lastStepIndex = 2;
  const isLast = step >= lastStepIndex;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="qa-onboarding"
          className="fixed inset-0 z-[100] flex items-end justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6"
          initial={{ opacity: reduce ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: reduce ? 1 : 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="qa-onboard-title"
        >
          <button
            type="button"
            className="qa-modal-scrim"
            aria-label="Dismiss onboarding backdrop"
            onClick={dismiss}
          />
          <motion.div
            initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="qa-modal-panel relative z-[1] flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-cyan-400/25 to-violet-500/25">
                  <Sparkles className="size-5 text-cyan-100" strokeWidth={1.5} aria-hidden />
                </span>
                <div>
                  <p id="qa-onboard-title" className="text-sm font-semibold text-white">
                    Welcome to QuantAI
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    Step {Math.min(step, lastStepIndex) + 1} / {lastStepIndex + 1}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="qa-icon-btn p-2 text-slate-400"
                aria-label="Skip onboarding"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {step === 0 && (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-slate-300">
                    QuantAI is your <span className="font-semibold text-white">shopping copilot</span> for Google
                    Shopping-style listings: ranked results, AI verdicts in Compare lab, and a session-aware assistant.
                  </p>
                  <ul className="space-y-2.5">
                    {FEATURES.map((f) => (
                      <li
                        key={f.title}
                        className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2.5 text-xs leading-relaxed text-slate-400"
                      >
                        <span className="font-semibold text-slate-200">{f.title}</span>
                        <span className="text-slate-500"> · </span>
                        {f.body}
                      </li>
                    ))}
                  </ul>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300/80">
                      Example prompts
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {EXAMPLE_PROMPTS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => trySearch(p)}
                          className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-100/95 transition hover:bg-cyan-500/15"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Radar className="size-4 text-cyan-300" strokeWidth={1.5} aria-hidden />
                    Try these searches
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => trySearch(p)}
                        className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-left text-xs font-medium text-slate-200 transition hover:border-cyan-400/25 hover:text-white"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Popular on QuantAI</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Gaming laptop", "Noise cancelling headphones", "Air fryer deals"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => trySearch(p)}
                        className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[11px] text-slate-400 transition hover:border-white/15 hover:text-slate-200"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  {readLocalSignals().recentSearches.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">This browser</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Recent:{" "}
                        <span className="text-slate-300">
                          {readLocalSignals().recentSearches.slice(0, 3).join(" · ")}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3 text-sm leading-relaxed text-slate-400">
                  <p className="font-medium text-slate-200">You are set.</p>
                  <p>
                    Run a search from the hero box. Open the <span className="text-cyan-200/90">sparkle copilot</span>{" "}
                    anytime for questions about your current tray. QuantAI is decision support—always verify at
                    checkout.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-5 py-3">
              <button
                type="button"
                onClick={dismiss}
                className="rounded-full px-3 py-2 text-xs font-medium text-slate-500 transition hover:text-slate-300"
              >
                Skip
              </button>
              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06]"
                  >
                    Back
                  </button>
                )}
                {!isLast ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.min(lastStepIndex, s + 1))}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:brightness-105"
                  >
                    Next
                    <ArrowRight className="size-3.5" aria-hidden />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={dismiss}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:brightness-105"
                  >
                    Start searching
                    <ArrowRight className="size-3.5" aria-hidden />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
