"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronDown, Loader2, Sparkles } from "lucide-react";
import {
  HERO_COMMAND_HISTORY_CAP,
  HERO_COMMAND_SUGGESTION_CAP,
  HERO_SEARCH_PROMPTS,
} from "@/lib/search/heroPrompts";

const PRESET_LC = new Set(HERO_SEARCH_PROMPTS.map((p) => p.toLowerCase()));

function filterPresets(query: string, max: number): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...HERO_SEARCH_PROMPTS].slice(0, max);
  const scored = HERO_SEARCH_PROMPTS.map((p) => {
    const pl = p.toLowerCase();
    let score = 0;
    if (pl.includes(q)) score += 4;
    const words = q.split(/\s+/).filter((w) => w.length > 1);
    for (const w of words) {
      if (pl.includes(w)) score += 1;
    }
    return { p, score };
  });
  scored.sort((a, b) => b.score - a.score || a.p.length - b.p.length);
  const out: string[] = [];
  for (const { p, score } of scored) {
    if (out.length >= max) break;
    if (score > 0) out.push(p);
  }
  if (out.length < max) {
    for (const p of HERO_SEARCH_PROMPTS) {
      if (out.includes(p)) continue;
      out.push(p);
      if (out.length >= max) break;
    }
  }
  return out.slice(0, max);
}

function recentFromHints(hintOptions: string[], max: number): string[] {
  const out: string[] = [];
  for (const h of hintOptions) {
    const t = h.trim();
    if (!t) continue;
    if (PRESET_LC.has(t.toLowerCase())) continue;
    if (!out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

type Props = {
  query: string;
  onQueryChange: (v: string) => void;
  onSubmit: () => void;
  onSubmitPreset: (preset: string) => void;
  loading: boolean;
  submitPulse: boolean;
  placeholder: string;
  hintOptions: string[];
  registerInput: (el: HTMLInputElement | null) => void;
  mobilePerf: boolean;
};

export default function HeroSearchCommand({
  query,
  onQueryChange,
  onSubmit,
  onSubmitPreset,
  loading,
  submitPulse,
  placeholder,
  hintOptions,
  registerInput,
  mobilePerf,
}: Props) {
  const baseId = useId();
  const reduceMotion = useReducedMotion();
  const lite = mobilePerf || reduceMotion;
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(
    () => filterPresets(query, HERO_COMMAND_SUGGESTION_CAP),
    [query]
  );

  const historyRaw = useMemo(
    () => recentFromHints(hintOptions, HERO_COMMAND_HISTORY_CAP),
    [hintOptions]
  );

  const history = useMemo(() => {
    const presetLc = new Set(suggestions.map((s) => s.toLowerCase()));
    return historyRaw.filter((h) => !presetLc.has(h.toLowerCase())).slice(0, HERO_COMMAND_HISTORY_CAP);
  }, [historyRaw, suggestions]);

  const suggestPanelId = `${baseId}-smart-panel`;
  const toggleId = `${baseId}-toggle`;

  const runSubmit = () => {
    setSuggestionsOpen(false);
    onSubmit();
  };

  const pickPreset = (value: string) => {
    const v = value.trim();
    if (!v || loading) return;
    onQueryChange(v);
    onSubmitPreset(v);
    setSuggestionsOpen(false);
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSubmit();
      return;
    }
    if (e.key === "Escape" && suggestionsOpen) {
      e.preventDefault();
      setSuggestionsOpen(false);
    }
  };

  const active = focused || loading;

  return (
    <motion.div
      className="qi-command-root"
      initial={lite ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: lite ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="qi-command-halo"
        aria-hidden
        animate={
          lite
            ? undefined
            : {
                opacity: active ? 0.95 : 0.55,
                scale: active ? 1.02 : 1,
              }
        }
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      />
      <div className="qi-command-floor" aria-hidden />

      <motion.div
        className={`qi-command-deck ${active ? "qi-command-deck--active" : ""} ${submitPulse ? "qi-command-deck--pulse" : ""}`}
        data-loading={loading ? "true" : "false"}
        animate={lite ? undefined : { y: active ? -2 : 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      >
        <div className="qi-command-glass qi-command-glass--deep" aria-hidden />
        <motion.div
          className="qi-command-glass qi-command-glass--sheen"
          aria-hidden
          animate={lite ? undefined : { opacity: active ? 1 : 0.65 }}
        />
        <div className="qi-command-rim" aria-hidden />
        <motion.div
          className="qi-command-scan"
          aria-hidden
          animate={lite || !active ? { opacity: 0 } : { opacity: [0, 0.35, 0] }}
          transition={
            lite
              ? { duration: 0 }
              : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
          }
        />

        <div className="relative z-[2] flex flex-col gap-4 p-5 sm:p-6">
          <motion.div
            className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3"
            layout={false}
          >
            <motion.div className="flex min-w-0 items-center gap-2.5" layout={false}>
              <span className="qi-command-status-dot" data-active={active ? "true" : "false"} aria-hidden />
              <span className="qi-command-manifest">
                <Sparkles className="size-3 shrink-0 opacity-50" strokeWidth={1.75} aria-hidden />
                Market command
              </span>
            </motion.div>
            <span className="qi-command-channel hidden sm:inline">QI · live field</span>
          </motion.div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <label className="sr-only" htmlFor={`${baseId}-q`}>
              Query the market
            </label>
            <div
              className={`qi-command-field qa-search-field relative flex min-h-[60px] flex-1 items-stretch overflow-hidden rounded-[1.15rem] ${
                focused ? "qi-command-field--focus" : ""
              }`}
            >
              <span className="qi-command-prefix hidden items-center pl-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500/75 sm:flex">
                Query
              </span>
              <input
                ref={registerInput}
                id={`${baseId}-q`}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={onInputKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={placeholder}
                enterKeyHint="search"
                autoComplete="off"
                disabled={loading}
                className="qi-command-input min-w-0 flex-1 bg-transparent px-4 py-4 outline-none disabled:opacity-45 sm:px-5 sm:py-[1.05rem]"
              />
              <span className="qi-command-cursor-beam" aria-hidden />
              <span className="qi-command-field-glow" aria-hidden />
            </div>

            <button
              type="button"
              onClick={runSubmit}
              disabled={loading}
              className="qi-command-execute group relative flex min-h-[60px] w-full shrink-0 items-center justify-center gap-2 rounded-[1.15rem] px-8 sm:min-w-[10.5rem] sm:w-auto"
            >
              <span className="qi-command-execute-shine" aria-hidden />
              <span className="relative z-[1] flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em]">
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Scanning field
                  </>
                ) : (
                  <>
                    Execute read
                    <ArrowRight
                      className="size-4 opacity-80 transition group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </>
                )}
              </span>
            </button>
          </div>

          {history.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-t border-white/[0.04] pt-3">
              <span className="w-full text-[10px] font-medium uppercase tracking-[0.16em] text-slate-600/90">
                Recent
              </span>
              {history.map((item) => (
                <button
                  key={`h-${item}`}
                  type="button"
                  disabled={loading}
                  title={item}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickPreset(item)}
                  className="max-w-full truncate rounded-lg border border-transparent px-3 py-1.5 text-left text-[12px] font-medium text-slate-500/90 transition hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-slate-300/95 disabled:opacity-40"
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </motion.div>

      {suggestions.length > 0 ? (
        <div className="mt-5 px-1">
          <button
            id={toggleId}
            type="button"
            disabled={loading}
            aria-expanded={suggestionsOpen}
            aria-controls={suggestPanelId}
            onClick={() => setSuggestionsOpen((o) => !o)}
            className="text-[11px] font-medium tracking-[0.12em] uppercase text-slate-500/80 transition hover:text-slate-400/95 disabled:opacity-40"
          >
            <span className="inline-flex items-center gap-1.5">
              {suggestionsOpen ? "Hide field examples" : "Field examples"}
              <ChevronDown
                className={`size-3.5 transition-transform ${suggestionsOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </span>
          </button>

          {suggestionsOpen ? (
            <div
              id={suggestPanelId}
              role="region"
              aria-labelledby={toggleId}
              className="qi-command-suggest mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"
            >
              {suggestions.map((item) => (
                <button
                  key={`s-${item}`}
                  type="button"
                  disabled={loading}
                  title={item}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickPreset(item)}
                  className="min-h-[2.85rem] rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 text-left text-[12px] font-medium leading-snug text-slate-400/95 transition hover:border-cyan-400/12 hover:bg-cyan-500/[0.04] hover:text-slate-200/95 disabled:opacity-40"
                >
                  <span className="line-clamp-2">{item}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  );
}
