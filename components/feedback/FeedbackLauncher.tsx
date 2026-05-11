"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageSquarePlus, Send, X } from "lucide-react";

const CATEGORIES = [
  { id: "wrong_recommendation", label: "Wrong recommendation" },
  { id: "bad_product_match", label: "Bad product match" },
  { id: "pricing_issue", label: "Pricing issue" },
  { id: "missing_store", label: "Missing store" },
  { id: "feature_request", label: "Feature request" },
  { id: "general", label: "General feedback" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

type Props = {
  /** Compact nav pill vs full button label */
  variant?: "nav" | "floating";
  className?: string;
};

export default function FeedbackLauncher({ variant = "floating", className = "" }: Props) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<CategoryId>("general");
  const [message, setMessage] = useState("");
  const [context, setContext] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [note, setNote] = useState<string | null>(null);

  async function submit() {
    if (message.trim().length < 8) return;
    setStatus("sending");
    setNote(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          category,
          message: message.trim(),
          context: context.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; note?: string; error?: string };
      if (!res.ok) {
        setStatus("error");
        setNote(data.error || "Could not send feedback.");
        return;
      }
      setStatus("done");
      setNote(data.note ?? null);
      setMessage("");
      setContext("");
    } catch {
      setStatus("error");
      setNote("Network error. Try again in a moment.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setStatus("idle");
          setNote(null);
        }}
        className={
          variant === "nav"
            ? `rounded-full border border-white/[0.1] bg-white/[0.04] px-3.5 py-2 text-[12px] font-semibold tracking-wide text-slate-200 transition hover:border-cyan-400/25 hover:bg-cyan-500/10 hover:text-white ${className}`
            : `inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-[12px] font-semibold text-cyan-100 shadow-[0_0_24px_-8px_rgba(34,211,238,0.35)] transition hover:border-cyan-400/35 hover:bg-cyan-500/15 ${className}`
        }
      >
        <MessageSquarePlus className="size-3.5 opacity-90" aria-hidden />
        {variant === "nav" ? "Feedback" : "Send feedback"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center sm:p-6"
            initial={reduceMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm"
              aria-label="Close feedback"
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="feedback-title"
              initial={reduceMotion ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="cockpit-glass-panel relative z-10 w-full max-w-lg overflow-hidden border-cyan-400/15 p-6 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]"
            >
              <div className="pointer-events-none absolute -right-20 -top-20 size-48 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="cockpit-overline text-cyan-300/70">Signal back to the cockpit</p>
                  <h2 id="feedback-title" className="cockpit-display mt-2 text-xl text-white">
                    Refine QuantAI with your eyes on the ground
                  </h2>
                  <p className="cockpit-body mt-2 text-[13px] text-slate-400">
                    Decision support only—we read every note to calibrate trust, matching, and store coverage.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              {status === "done" ? (
                <div className="relative mt-6 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-5">
                  <p className="text-sm font-medium text-emerald-100">Thank you—your signal is logged.</p>
                  {note && <p className="mt-2 text-xs leading-relaxed text-emerald-200/80">{note}</p>}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="mt-4 w-full rounded-full bg-white py-2.5 text-sm font-semibold text-slate-900"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative mt-5">
                    <p className="cockpit-label mb-2">Category</p>
                    <div className="grid max-h-[200px] gap-1.5 overflow-y-auto pr-1 sm:max-h-none sm:grid-cols-2">
                      {CATEGORIES.map((c) => (
                        <label
                          key={c.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-medium transition ${
                            category === c.id
                              ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-50"
                              : "border-white/[0.08] bg-black/25 text-slate-400 hover:border-white/15"
                          }`}
                        >
                          <input
                            type="radio"
                            name="fb-cat"
                            className="sr-only"
                            checked={category === c.id}
                            onChange={() => setCategory(c.id)}
                          />
                          {c.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="relative mt-4">
                    <label htmlFor="fb-msg" className="cockpit-label">
                      What happened?
                    </label>
                    <textarea
                      id="fb-msg"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      placeholder="Be specific—listing URL, query, or what felt off helps us tune the model."
                      className="mt-2 w-full resize-none rounded-2xl border border-white/[0.1] bg-black/35 px-4 py-3 text-[13px] leading-relaxed text-white placeholder:text-slate-600 outline-none transition focus:border-cyan-400/35"
                    />
                  </div>
                  <div className="relative mt-3">
                    <label htmlFor="fb-ctx" className="cockpit-label">
                      Optional context
                    </label>
                    <input
                      id="fb-ctx"
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      placeholder="e.g. search query, browser, region"
                      className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-black/30 px-4 py-2.5 text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-cyan-400/30"
                    />
                  </div>
                  {status === "error" && note && (
                    <p className="relative mt-3 text-xs text-rose-200" role="alert">
                      {note}
                    </p>
                  )}
                  <div className="relative mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={status === "sending" || message.trim().length < 8}
                      onClick={() => void submit()}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 py-2.5 text-sm font-semibold text-slate-950 transition enabled:hover:brightness-105 disabled:opacity-45 min-[400px]:flex-none min-[400px]:px-6"
                    >
                      {status === "sending" ? (
                        "Sending…"
                      ) : (
                        <>
                          <Send className="size-3.5" aria-hidden />
                          Submit securely
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.05]"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="relative mt-4 text-[10px] leading-relaxed text-slate-600">
                    Not financial advice. Feedback may be stored to improve QuantAI; see our privacy posture in the
                    trust strip below on the home page.
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
