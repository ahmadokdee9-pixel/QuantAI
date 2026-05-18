"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, Loader2 } from "lucide-react";
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
}: Props) {
  const baseId = useId();
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

  return (
    <div className="qi-instrument-root">
      <motion.div
        className={`qi-instrument-surface relative ${focused ? "qi-instrument-surface--active" : ""} ${submitPulse ? "qi-instrument-surface--pulse" : ""}`}
        data-loading={loading ? "true" : "false"}
      >
        <div className="qi-instrument-glass" aria-hidden />
        <div className="qi-instrument-reflection" aria-hidden />

        <div className="relative flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <label className="sr-only" htmlFor={`${baseId}-q`}>
              Search the market
            </label>
            <div
              className={`qi-instrument-field qa-search-field relative flex min-h-[58px] flex-1 items-center rounded-[1.1rem] px-5 sm:min-h-[62px] ${
                focused ? "qi-instrument-field--focus" : ""
              }`}
            >
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
                className="qi-instrument-input min-w-0 flex-1 bg-transparent py-4 outline-none disabled:opacity-45"
              />
              <span className="qi-instrument-cursor-glow" aria-hidden />
            </div>

            <button
              type="button"
              onClick={runSubmit}
              disabled={loading}
              className="qi-instrument-submit group relative flex min-h-[58px] w-full shrink-0 items-center justify-center gap-2 rounded-[1.1rem] px-8 sm:min-h-[62px] sm:w-auto sm:min-w-[9.5rem]"
            >
              <span className="relative z-[1] flex items-center gap-2 text-[15px] font-medium tracking-[-0.02em]">
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Scanning
                  </>
                ) : (
                  <>
                    Enter field
                    <ArrowRight className="size-4 opacity-70 transition group-hover:translate-x-0.5" aria-hidden />
                  </>
                )}
              </span>
            </button>
          </div>

          {history.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {history.map((item) => (
                <button
                  key={`h-${item}`}
                  type="button"
                  disabled={loading}
                  title={item}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickPreset(item)}
                  className="max-w-full truncate rounded-lg px-3 py-1.5 text-left text-[12px] font-medium text-slate-500/90 transition hover:bg-white/[0.04] hover:text-slate-300/95 disabled:opacity-40"
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </motion.div>

      {suggestions.length > 0 ? (
        <div className="mt-4">
          <button
            id={toggleId}
            type="button"
            disabled={loading}
            aria-expanded={suggestionsOpen}
            aria-controls={suggestPanelId}
            onClick={() => setSuggestionsOpen((o) => !o)}
            className="text-[11px] font-medium tracking-wide text-slate-500/80 transition hover:text-slate-400/95 disabled:opacity-40"
          >
            <span className="inline-flex items-center gap-1.5">
              {suggestionsOpen ? "Hide examples" : "Examples"}
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
              className="qi-instrument-suggest mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"
            >
              {suggestions.map((item) => (
                <button
                  key={`s-${item}`}
                  type="button"
                  disabled={loading}
                  title={item}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickPreset(item)}
                  className="min-h-[2.75rem] rounded-xl px-3 py-2.5 text-left text-[12px] font-medium leading-snug text-slate-400/95 transition hover:bg-white/[0.04] hover:text-slate-200/95 disabled:opacity-40"
                >
                  <span className="line-clamp-2">{item}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
