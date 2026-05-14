"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { ArrowRight, ChevronDown, Loader2, Search, Sparkles } from "lucide-react";
import MagneticSurface from "@/components/motion/MagneticSurface";
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
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

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

  const pickHistory = (value: string) => {
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
    <div className="hero-ai-command-root">
      {/* Main command card — CSS forces visible/auto height (no inner scroll container) */}
      <div className="hero-ai-command-card relative rounded-[1.35rem] border border-white/[0.06] bg-[#020308]/98 p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.65),0_32px_96px_-52px_rgba(0,0,0,0.92),inset_0_1px_0_rgba(255,255,255,0.055),0_0_64px_-40px_rgba(34,211,238,0.14),0_0_72px_-48px_rgba(139,92,246,0.1)] backdrop-blur-[32px] sm:p-6">
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[0.85]"
          style={{
            background:
              "radial-gradient(100% 70% at 50% -15%, rgba(34,211,238,0.09), transparent 52%), radial-gradient(80% 55% at 100% 0%, rgba(139,92,246,0.06), transparent 45%)",
          }}
          aria-hidden
        />

        <div className="relative flex flex-col gap-4 sm:gap-5">
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-stretch sm:gap-4">
            <div
              className={`qa-search-field hero-search-field relative flex min-h-[56px] flex-1 items-center gap-3.5 rounded-[1.05rem] border border-white/[0.07] bg-black/55 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-[border-color,box-shadow,background-color] duration-300 sm:min-h-[60px] sm:px-5 ${
                submitPulse ? "hero-search-field--pulse" : ""
              }`}
            >
              <Search
                className={`size-[1.15rem] shrink-0 sm:size-[1.2rem] ${loading ? "text-cyan-200/75 motion-reduce:animate-none animate-pulse" : "text-cyan-400/28"}`}
                strokeWidth={1.5}
                aria-hidden
              />
              <input
                ref={registerInput}
                id={`${baseId}-q`}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={placeholder}
                enterKeyHint="search"
                autoComplete="off"
                disabled={loading}
                className="min-w-0 flex-1 bg-transparent py-3.5 text-[16px] font-medium leading-[1.35] tracking-[-0.022em] text-white outline-none placeholder:text-slate-500/50 placeholder:font-normal placeholder:tracking-[-0.015em] disabled:opacity-50 sm:py-4 sm:text-[17px]"
              />
            </div>

            <MagneticSurface
              className="flex w-full shrink-0 sm:w-auto sm:min-w-[10.5rem]"
              strength={0.06}
              disabled={mobilePerf}
            >
              <button
                type="button"
                onClick={runSubmit}
                disabled={loading}
                className="group relative flex min-h-[56px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-[1.05rem] px-8 text-[15px] font-semibold tracking-[-0.02em] text-[#030712] shadow-[0_14px_44px_-20px_rgba(34,211,238,0.35),0_0_40px_-28px_rgba(167,139,250,0.25)] transition duration-300 enabled:hover:shadow-[0_18px_52px_-18px_rgba(34,211,238,0.42)] disabled:opacity-45 sm:min-h-[60px] sm:min-w-[10.5rem] sm:px-9 sm:text-[16px]"
              >
                <span className="absolute inset-0 bg-gradient-to-br from-cyan-200 via-sky-400 to-violet-500/95 transition duration-500 group-hover:brightness-[1.04]" />
                <span className="absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100 bg-gradient-to-t from-transparent via-white/18 to-white/10" />
                <span className="relative flex items-center justify-center gap-2.5">
                  {loading ? (
                    <>
                      <Loader2 className="size-[1.1rem] shrink-0 animate-spin sm:size-[1.15rem]" aria-hidden />
                      <span className="whitespace-nowrap">Searching</span>
                    </>
                  ) : (
                    <>
                      <span className="whitespace-nowrap">Search</span>
                      <ArrowRight className="size-4 shrink-0 transition duration-300 group-hover:translate-x-0.5" aria-hidden />
                    </>
                  )}
                </span>
              </button>
            </MagneticSurface>
          </div>

          {history.length > 0 ? (
            <div>
              <p className="mb-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500/95">
                Recent
              </p>
              <div className="flex flex-wrap gap-2">
                {history.map((item) => (
                  <button
                    key={`h-${item}`}
                    type="button"
                    disabled={loading}
                    title={item}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickHistory(item)}
                    className="max-w-full truncate rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-left text-[12px] font-medium leading-snug tracking-[-0.014em] text-slate-300/95 transition duration-200 hover:border-cyan-400/22 hover:bg-white/[0.07] hover:text-slate-100 disabled:pointer-events-none disabled:opacity-45 sm:px-4 sm:text-[13px]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative mt-4 sm:mt-5">
        <button
          id={toggleId}
          type="button"
          disabled={loading || suggestions.length === 0}
          aria-expanded={suggestionsOpen}
          aria-controls={suggestPanelId}
          onClick={() => setSuggestionsOpen((o) => !o)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-black/40 px-4 py-2.5 text-[12px] font-semibold tracking-[-0.012em] text-slate-300/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition duration-200 hover:border-cyan-400/25 hover:bg-white/[0.05] hover:text-white disabled:pointer-events-none disabled:opacity-40 sm:w-auto sm:justify-start sm:py-2 sm:text-[13px]"
        >
          <Sparkles className="size-3.5 shrink-0 text-cyan-400/55" aria-hidden />
          <span>{suggestionsOpen ? "Hide smart suggestions" : "Show smart suggestions"}</span>
          <ChevronDown
            className={`size-4 shrink-0 text-slate-500 transition-transform duration-200 ${suggestionsOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        {suggestionsOpen ? (
          <div
            id={suggestPanelId}
            role="region"
            aria-labelledby={toggleId}
            className="hero-ai-suggest-panel mt-4 rounded-[1.15rem] border border-white/[0.07] bg-[#03050a]/96 p-4 shadow-[0_24px_64px_-40px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.05),0_0_48px_-36px_rgba(34,211,238,0.12)] backdrop-blur-[24px] sm:mt-5 sm:p-5"
          >
            <p className="mb-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500/95">
              Smart suggestions
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {suggestions.map((item) => (
                <button
                  key={`s-${item}`}
                  type="button"
                  disabled={loading}
                  title={item}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickPreset(item)}
                  className="flex min-h-[3.25rem] items-center rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-black/30 px-3.5 py-3 text-left text-[12.5px] font-medium leading-snug tracking-[-0.015em] text-slate-200/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-200 hover:border-cyan-400/28 hover:from-cyan-500/10 hover:to-black/40 hover:text-white disabled:pointer-events-none disabled:opacity-45 sm:min-h-[3.5rem] sm:px-4 sm:text-[13px]"
                >
                  <span className="line-clamp-3">{item}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
