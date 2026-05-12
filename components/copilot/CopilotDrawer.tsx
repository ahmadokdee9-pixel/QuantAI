"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  { label: "Best buy", prompt: "Which one should I buy and why? Pick the best buy from my current tray." },
  { label: "Cheapest safe option", prompt: "What is the cheapest safe option here for my budget?" },
  { label: "Long-term value", prompt: "Compare these products for long-term value." },
  { label: "Avoid risks", prompt: "What should I avoid in this result set?" },
  { label: "Compare selected", prompt: "Compare the products I have in my compare tray for overall fit." },
  { label: "Explain score", prompt: "Explain how QuantAI scores these listings and what matters most." },
];

const FOLLOW_UP_CHIPS: { label: string; prompt: string }[] = [
  { label: "Hidden fees?", prompt: "What fees or caveats should I watch for in these listings?" },
  { label: "Delivery risk", prompt: "Which pick has the safest delivery / return story in this tray?" },
  { label: "Price vs trust", prompt: "How do price and store trust trade off in my top results?" },
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
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
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
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm"
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
                    <p className="text-[10px] text-slate-500">Session-aware · JSON-backed</p>
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

              <div className="flex flex-wrap gap-1.5 border-b border-white/[0.05] px-3 py-2">
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
                  <div className="flex flex-wrap gap-1.5 border-t border-white/[0.04] pt-2">
                    <span className="w-full text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      Follow-ups
                    </span>
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
