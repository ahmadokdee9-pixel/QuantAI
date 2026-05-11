"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, BarChart3, GitCompare, Loader2, Sparkles, X } from "lucide-react";
import MultiStoreDealAdvisor from "@/components/deals/MultiStoreDealAdvisor";
import GlobalIntelligencePanel from "@/components/intelligence/GlobalIntelligencePanel";
import { analyzeDealCluster } from "@/lib/deals";
import type { DealClusterDTO } from "@/lib/deals/types";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { SearchIntelligenceLevel } from "@/lib/subscription/plans";
import type { ResultsFiltersState } from "@/lib/resultsFilters";
import { getFinalComposite, ratingValue, sortByCompositeRank } from "@/lib/shoppingScore";
import type { QuantProduct } from "@/lib/shoppingScore";
import IntelligenceEducationStrip from "./IntelligenceEducationStrip";
import ProductIntelligenceDrawer from "./ProductIntelligenceDrawer";
import ProductResultCard from "./ProductResultCard";
import ResultsToolbar from "./ResultsToolbar";

type Props = {
  products: QuantProduct[];
  sortedProducts: QuantProduct[];
  dealClusters?: DealClusterDTO[];
  searchIntelligence?: SearchIntelligenceDTO | null;
  intelligenceLevel?: SearchIntelligenceLevel;
  loading: boolean;
  sort: string;
  setSort: (v: string) => void;
  filters: ResultsFiltersState;
  setFilters: Dispatch<SetStateAction<ResultsFiltersState>>;
  activeFilterCount: number;
  onClearFilters: () => void;
  saveProduct: (p: QuantProduct) => void;
  savedLinks: Set<string>;
  resultsKey: number;
  searchError: string | null;
  addToWatchlist?: (p: QuantProduct) => void;
};

function ResultSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="cockpit-glass-panel overflow-hidden p-5">
          <div className="h-40 rounded-2xl animate-shimmer" />
          <div className="mt-4 h-4 w-[82%] rounded-lg bg-white/[0.08]" />
          <div className="mt-2 h-3 w-3/5 rounded bg-white/[0.05]" />
          <div className="mt-4 h-3 w-full rounded bg-white/[0.04]" />
          <div className="mt-2 h-3 w-2/3 rounded bg-white/[0.04]" />
          <div className="mt-6 h-11 rounded-full bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

export default function ProductResultsSurface({
  products,
  sortedProducts,
  loading,
  sort,
  setSort,
  filters,
  setFilters,
  activeFilterCount,
  onClearFilters,
  saveProduct,
  savedLinks,
  resultsKey,
  searchError,
  addToWatchlist,
  dealClusters = [],
  searchIntelligence = null,
  intelligenceLevel = "full",
}: Props) {
  const reduceMotion = useReducedMotion();
  const anchorRef = useRef<HTMLDivElement>(null);
  const prevLoading = useRef(false);
  const [detailProduct, setDetailProduct] = useState<QuantProduct | null>(null);
  const [compareLinks, setCompareLinks] = useState<string[]>([]);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const [verdictError, setVerdictError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<{
    winnerTitle: string;
    winnerLink: string;
    verdict: string;
    rationale: string[];
    confidence: string;
  } | null>(null);
  const [verdictSource, setVerdictSource] = useState<string | null>(null);

  const compositeRanked = useMemo(
    () => sortByCompositeRank(sortedProducts),
    [sortedProducts]
  );

  const rankByLink = useMemo(() => {
    const m = new Map<string, number>();
    compositeRanked.forEach((p, i) => m.set(p.link, i));
    return m;
  }, [compositeRanked]);

  const aiTopPicks = useMemo(() => compositeRanked.slice(0, 3), [compositeRanked]);

  const filteredDealClusters = useMemo(() => {
    if (!dealClusters.length) return [];
    const allow = new Set(sortedProducts.map((p) => p.link));
    return dealClusters.flatMap((c) => {
      const next = c.listings.filter((p) => allow.has(p.link));
      if (next.length < 2) return [];
      return [analyzeDealCluster(c.id, next)];
    });
  }, [dealClusters, sortedProducts]);

  const transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 32 };

  useEffect(() => {
    if (reduceMotion) return;
    const finished = prevLoading.current && !loading && products.length > 0;
    prevLoading.current = loading;
    if (finished && resultsKey > 0) {
      anchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [loading, products.length, resultsKey, reduceMotion]);

  useEffect(() => {
    if (sortedProducts.length > 0) return;
    queueMicrotask(() => setDetailProduct(null));
  }, [sortedProducts.length]);

  const toggleCompare = (link: string) => {
    setVerdict(null);
    setVerdictError(null);
    setVerdictSource(null);
    setCompareLinks((prev) => {
      if (prev.includes(link)) {
        return prev.filter((l) => l !== link);
      }
      if (prev.length >= 3) return prev;
      return [...prev, link];
    });
  };

  async function runCompareVerdict() {
    if (compareProducts.length === 0) return;
    setVerdictLoading(true);
    setVerdictError(null);
    try {
      const res = await fetch("/api/search/compare-verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ products: compareProducts }),
      });
      const data = (await res.json()) as {
        verdict?: {
          winnerTitle: string;
          winnerLink: string;
          verdict: string;
          rationale: string[];
          confidence: string;
        };
        source?: string;
        error?: string;
        retryAfter?: number;
      };
      if (res.status === 429) {
        const wait = data.retryAfter ? ` Retry in ~${data.retryAfter}s.` : "";
        setVerdictError((data.error || "Too many requests.") + wait);
        return;
      }
      if (!res.ok || !data.verdict) {
        setVerdictError(data.error || "Could not load AI verdict.");
        return;
      }
      setVerdict(data.verdict);
      setVerdictSource(data.source ?? null);
    } catch {
      setVerdictError("Could not load AI verdict.");
    } finally {
      setVerdictLoading(false);
    }
  }

  const compareProducts = sortedProducts.filter((p) => compareLinks.includes(p.link));

  if (loading && products.length === 0) {
    return (
      <section
        className="relative mx-auto max-w-7xl px-4 sm:px-6 pb-12"
        aria-busy="true"
        aria-label="Loading search results"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-cyan-500/8 to-transparent blur-2xl" />
        <div className="sticky top-[3.25rem] z-30 -mx-4 px-4 py-3 sm:-mx-6 sm:px-6 mb-8 border-b border-white/[0.07] bg-[#030712]/75 backdrop-blur-[28px] shadow-[0_20px_50px_-32px_rgba(0,0,0,0.85)]">
          <div className="h-12 max-w-2xl rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.07] via-white/[0.04] to-white/[0.07] animate-pulse" />
        </div>
        <ResultSkeleton />
      </section>
    );
  }

  if (searchError && !loading && products.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-16" aria-live="assertive">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
          className="mx-auto max-w-lg rounded-[1.75rem] border border-rose-400/25 bg-gradient-to-b from-rose-500/[0.12] to-white/[0.03] px-8 py-10 text-center backdrop-blur-2xl"
        >
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-500/15">
            <AlertCircle className="size-6 text-rose-200" strokeWidth={1.5} aria-hidden />
          </div>
          <h2 className="text-lg font-semibold text-white/95">Search could not complete</h2>
          <p className="mt-2 text-sm leading-relaxed text-rose-100/80">{searchError}</p>
        </motion.div>
      </section>
    );
  }

  if (products.length === 0) return null;

  if (!loading && sortedProducts.length === 0) {
    return (
      <section
        className="relative mx-auto max-w-7xl px-4 sm:px-6 pb-16"
        ref={anchorRef}
        aria-live="polite"
      >
        <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-[min(100%,480px)] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
        <ResultsToolbar
          sort={sort}
          setSort={setSort}
          filters={filters}
          setFilters={setFilters}
          filterPanelOpen={filterPanelOpen}
          setFilterPanelOpen={setFilterPanelOpen}
          resultCount={0}
          activeFilterCount={activeFilterCount}
          onClearFilters={onClearFilters}
        />
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
          className="mx-auto max-w-md rounded-[1.75rem] border border-white/[0.1] bg-gradient-to-b from-white/[0.07] to-white/[0.02] px-8 py-12 text-center backdrop-blur-2xl"
        >
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10">
            <Sparkles className="size-7 text-cyan-200" strokeWidth={1.25} aria-hidden />
          </div>
          <h2 className="text-lg font-semibold text-white/95">No listings match your filters</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Adjust price range, brand keyword, rating, or store trust—or clear filters—to see
            all{" "}
            <span className="tabular-nums text-slate-400">{products.length}</span> results from
            this search.
          </p>
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-6 rounded-full border border-white/15 bg-white/[0.08] px-6 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/[0.14]"
          >
            Reset filters
          </button>
        </motion.div>
      </section>
    );
  }

  const advisorPad =
    filteredDealClusters.length > 0 ? "pb-[min(40rem,52vh)] sm:pb-60" : "pb-24";

  return (
    <section className={`relative mx-auto max-w-7xl px-4 sm:px-6 ${advisorPad}`} ref={anchorRef}>
      <div className="pointer-events-none absolute inset-x-0 -top-8 h-56 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(34,211,238,0.12),transparent_65%)]" />

      <ResultsToolbar
        sort={sort}
        setSort={setSort}
        filters={filters}
        setFilters={setFilters}
        filterPanelOpen={filterPanelOpen}
        setFilterPanelOpen={setFilterPanelOpen}
        resultCount={sortedProducts.length}
        activeFilterCount={activeFilterCount}
        onClearFilters={onClearFilters}
      />

      <IntelligenceEducationStrip />

      {searchIntelligence && (
        <div className="mb-10">
          <GlobalIntelligencePanel intel={searchIntelligence} displayLevel={intelligenceLevel} />
        </div>
      )}

      {aiTopPicks.length > 0 && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
          className="mb-10"
        >
          <div className="mb-4 flex items-start gap-2.5">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-cyan-300" strokeWidth={1.5} aria-hidden />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight text-white/95">Neural top lane</h2>
              <p className="mt-0.5 text-[11px] font-normal leading-snug text-slate-500">
                Highest composite signal in this tray—fastest path from browse to conviction.
              </p>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [-webkit-overflow-scrolling:touch]">
            {aiTopPicks.map((p, idx) => {
              const comp = getFinalComposite(p, sortedProducts);
              return (
                <motion.div
                  key={p.link}
                  initial={reduceMotion ? false : { opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...transition, delay: idx * 0.06 }}
                  whileHover={
                    reduceMotion ? undefined : { y: -2, transition: { duration: 0.2 } }
                  }
                  className="min-w-[260px] max-w-[280px] snap-start rounded-2xl border border-cyan-400/28 bg-gradient-to-br from-cyan-400/[0.14] via-white/[0.05] to-violet-500/[0.1] p-4 shadow-[0_24px_60px_-28px_rgba(34,211,238,0.22)] backdrop-blur-xl"
                >
                  <div className="flex gap-3">
                    {p.image && (
                      <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-white p-1.5">
                        <img src={p.image} alt="" className="size-full object-contain" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-200/85">
                        #{idx + 1} pick
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[13px] font-medium leading-snug text-white/95">
                        {p.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">{p.store}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-semibold tabular-nums text-white">€{p.price}</span>
                    <span className="rounded-full border border-white/15 bg-black/35 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
                      QI composite {comp}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {compareProducts.length > 0 && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-5xl rounded-2xl border border-cyan-400/20 bg-[#050912]/96 p-4 shadow-[0_32px_120px_-20px_rgba(34,211,238,0.18)] backdrop-blur-2xl md:left-1/2 md:-translate-x-1/2 md:right-auto"
            role="region"
            aria-label="Product compare"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-white/90">
                <GitCompare className="size-4 text-cyan-300" aria-hidden />
                <BarChart3 className="size-4 text-violet-300/80" aria-hidden />
                Compare lab · {compareProducts.length}/3
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void runCompareVerdict()}
                  disabled={verdictLoading}
                  className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/35 bg-cyan-400/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-400/25 disabled:opacity-50"
                >
                  {verdictLoading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      Verdict
                    </>
                  ) : (
                    "QuantAI verdict"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompareLinks([]);
                    setVerdict(null);
                    setVerdictError(null);
                  }}
                  className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Clear compare"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {compareProducts.map((p) => {
                const qi = getFinalComposite(p, sortedProducts);
                const trust = p.store;
                return (
                  <motion.div
                    key={p.link}
                    layout
                    className="rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-black/40 p-3 text-xs"
                  >
                    <p className="font-medium text-white/90 line-clamp-2 leading-snug">{p.title}</p>
                    <p className="mt-1 text-slate-500">{trust}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-white/[0.06] bg-black/30 px-2 py-1.5">
                        <p className="text-[9px] uppercase tracking-wider text-slate-500">Price</p>
                        <p className="text-sm font-semibold tabular-nums text-emerald-300">€{p.price}</p>
                      </div>
                      <div className="rounded-lg border border-white/[0.06] bg-black/30 px-2 py-1.5">
                        <p className="text-[9px] uppercase tracking-wider text-slate-500">QI</p>
                        <p className="text-sm font-semibold tabular-nums text-cyan-200">{qi}</p>
                      </div>
                      <div className="rounded-lg border border-white/[0.06] bg-black/30 px-2 py-1.5">
                        <p className="text-[9px] uppercase tracking-wider text-slate-500">Rating</p>
                        <p className="text-sm font-semibold text-amber-200/90">
                          {ratingValue(p.rating) > 0 ? ratingValue(p.rating).toFixed(1) : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/[0.06] bg-black/30 px-2 py-1.5">
                        <p className="text-[9px] uppercase tracking-wider text-slate-500">Trend</p>
                        <p className="text-[11px] font-medium capitalize text-slate-300">
                          {p.qiTrendProjection ?? p.priceTrend}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {verdictError && (
              <p className="mt-3 text-xs text-rose-200/90" role="alert">
                {verdictError}
              </p>
            )}
            {verdict && (
              <div className="mt-4 rounded-xl border border-violet-400/25 bg-violet-500/[0.08] p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-violet-100">QuantAI verdict</p>
                  {verdictSource && (
                    <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                      {verdictSource}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-100/95">{verdict.verdict}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Winner:{" "}
                  <a
                    href={verdict.winnerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-cyan-200 underline-offset-2 hover:underline"
                  >
                    {verdict.winnerTitle}
                  </a>
                  <span className="mx-1 text-slate-600">·</span>
                  Decision confidence · {verdict.confidence}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-400">
                  {verdict.rationale.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ProductIntelligenceDrawer
        product={detailProduct}
        list={sortedProducts}
        open={detailProduct != null}
        onClose={() => setDetailProduct(null)}
      />

      <AnimatePresence mode="popLayout">
        <motion.div
          key={resultsKey}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22 }}
          className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
        >
          {sortedProducts.map((p, index) => {
            const rank = rankByLink.get(p.link) ?? index;
            return (
              <ProductResultCard
                key={`${p.id}-${p.link}`}
                product={p}
                list={sortedProducts}
                index={index}
                rank={rank}
                compareLinks={compareLinks}
                toggleCompare={toggleCompare}
                saveProduct={saveProduct}
                savedLinks={savedLinks}
                addToWatchlist={addToWatchlist}
                onOpenIntelligence={setDetailProduct}
              />
            );
          })}
        </motion.div>
      </AnimatePresence>

      {filteredDealClusters.length > 0 && (
        <MultiStoreDealAdvisor
          clusters={filteredDealClusters}
          sortedProducts={sortedProducts}
          compareBarActive={compareProducts.length > 0}
        />
      )}
    </section>
  );
}
