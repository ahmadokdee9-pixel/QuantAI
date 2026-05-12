"use client";

import type { Dispatch, SetStateAction } from "react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, BarChart3, GitCompare, Loader2, Sparkles, X } from "lucide-react";
import { QuantAnalyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";
import { apiErrorText, isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";
import GlobalIntelligencePanel from "@/components/intelligence/GlobalIntelligencePanel";
import AILoadingPhase from "@/components/loading/AILoadingPhase";
import SearchStreamRibbon from "@/components/loading/SearchStreamRibbon";
import { useCockpit, type CockpitQuickHandlers } from "@/components/cockpit/cockpitContext";
import ShareSnapshotBar from "@/components/share/ShareSnapshotBar";
import { buildCompareTrayInsights } from "@/lib/intelligence/compareTrayInsights";
import {
  buildDealIntelByLink,
  buildTrayDealHighlights,
  type ProductDealIntelligence,
} from "@/lib/intelligence/dealIntelligenceEngine";
import type { CompareVerdictPayload } from "@/lib/intelligence/compareVerdict";
import { analyzeDealCluster } from "@/lib/deals";
import type { DealClusterDTO } from "@/lib/deals/types";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { SearchIntelligenceLevel } from "@/lib/subscription/plans";
import type { ResultsFiltersState } from "@/lib/resultsFilters";
import { buildCompareExport, buildTraySummary, copyText } from "@/lib/share/intelligenceExport";
import { currencySymbolFromListing, formatListingPrice } from "@/lib/commerce/cues";
import { getFinalComposite, getStoreTrustScore, ratingValue, sortByCompositeRank } from "@/lib/shoppingScore";
import type { QuantProduct } from "@/lib/shoppingScore";
import ProductIntelligenceDrawer from "./ProductIntelligenceDrawer";
import ProductResultCard from "./ProductResultCard";
import ResultsToolbar from "./ResultsToolbar";
import LiveIntelligenceLayer from "@/components/live/LiveIntelligenceLayer";
import { useMobilePerf } from "@/lib/hooks/useMobilePerf";

const IntelligenceEducationStrip = dynamic(() => import("./IntelligenceEducationStrip"), {
  loading: () => (
    <div className="mb-10 h-28 max-w-5xl rounded-2xl border border-white/[0.06] bg-white/[0.03] animate-pulse" />
  ),
});

const MultiStoreDealAdvisor = dynamic(() => import("@/components/deals/MultiStoreDealAdvisor"), {
  ssr: false,
  loading: () => (
    <div className="h-36 max-w-5xl rounded-2xl border border-white/[0.06] bg-white/[0.03] animate-pulse" aria-hidden />
  ),
});

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
  searchQuery?: string;
  onRetrySearch?: () => void;
  /** Reports compare tray link selection for copilot / analytics context. */
  onCompareTrayChange?: (links: string[]) => void;
  /** Precomputed tray deal map (optional — avoids duplicate work from home). */
  dealIntelByLink?: Map<string, ProductDealIntelligence>;
};

function ResultSkeleton() {
  return (
    <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="cockpit-glass-panel skeleton-cinematic overflow-hidden border-white/[0.07] p-5"
        >
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
  searchQuery = "",
  onRetrySearch,
  onCompareTrayChange,
  dealIntelByLink: dealIntelByLinkProp,
}: Props) {
  const { registerQuickHandlers } = useCockpit();
  const reduceMotion = useReducedMotion();
  const mobilePerf = useMobilePerf();
  const anchorRef = useRef<HTMLDivElement>(null);
  const prevLoading = useRef(false);
  const [detailProduct, setDetailProduct] = useState<QuantProduct | null>(null);
  const [compareLinks, setCompareLinks] = useState<string[]>([]);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const [verdictError, setVerdictError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<CompareVerdictPayload | null>(null);
  const [verdictSource, setVerdictSource] = useState<string | null>(null);
  const [compareExportFlash, setCompareExportFlash] = useState(false);

  useEffect(() => {
    onCompareTrayChange?.(compareLinks);
  }, [compareLinks, onCompareTrayChange]);

  const compositeRanked = useMemo(
    () => sortByCompositeRank(sortedProducts),
    [sortedProducts]
  );
  const rankByLink = useMemo(() => {
    const m = new Map<string, number>();
    compositeRanked.forEach((p, i) => m.set(p.link, i));
    return m;
  }, [compositeRanked]);

  const dealIntelResolved = useMemo(() => {
    if (dealIntelByLinkProp) return dealIntelByLinkProp;
    return buildDealIntelByLink(sortedProducts);
  }, [dealIntelByLinkProp, sortedProducts]);
  const trayDealHighlights = useMemo(() => buildTrayDealHighlights(sortedProducts), [sortedProducts]);

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
    if (reduceMotion || mobilePerf) return;
    const finished = prevLoading.current && !loading && products.length > 0;
    prevLoading.current = loading;
    if (!finished || resultsKey <= 0) return;
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = window.visualViewport?.height ?? window.innerHeight;
    if (rect.top >= 0 && rect.top < vh * 0.9) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading, products.length, resultsKey, reduceMotion, mobilePerf]);

  useEffect(() => {
    if (sortedProducts.length > 0) return;
    queueMicrotask(() => setDetailProduct(null));
  }, [sortedProducts.length]);

  const trayCtxRef = useRef({
    sortedProducts,
    searchQuery,
    compositeRanked,
    saveProduct,
    addToWatchlist,
  });
  useLayoutEffect(() => {
    trayCtxRef.current = {
      sortedProducts,
      searchQuery,
      compositeRanked,
      saveProduct,
      addToWatchlist,
    };
  }, [sortedProducts, searchQuery, compositeRanked, saveProduct, addToWatchlist]);

  const trayHandlers = useMemo<CockpitQuickHandlers>(
    () => ({
      scrollToTray: () =>
        document
          .getElementById("quantai-results-anchor")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      scrollToCompareLab: () =>
        document
          .getElementById("quantai-compare-lab")
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      exportIntelligenceSummary: async () => {
        const { sortedProducts: list, searchQuery: q } = trayCtxRef.current;
        if (list.length === 0) return;
        await copyText(buildTraySummary(q.trim() || "—", list));
      },
      saveLeadingPick: () => {
        const top = trayCtxRef.current.compositeRanked[0];
        if (top) trayCtxRef.current.saveProduct(top);
      },
      watchLeadingPick: () => {
        const top = trayCtxRef.current.compositeRanked[0];
        const add = trayCtxRef.current.addToWatchlist;
        if (top && add) add(top);
      },
      primeCompareLane: () => {
        const ranked = trayCtxRef.current.compositeRanked;
        const top = ranked[0];
        const second = ranked[1];
        if (!top || !second) return;
        setCompareLinks([top.link, second.link]);
        window.requestAnimationFrame(() =>
          document
            .getElementById("quantai-compare-lab")
            ?.scrollIntoView({ behavior: "smooth", block: "center" })
        );
      },
    }),
    [setCompareLinks]
  );

  useEffect(() => {
    if (sortedProducts.length === 0) {
      registerQuickHandlers(null);
      return () => registerQuickHandlers(null);
    }
    registerQuickHandlers(trayHandlers);
    return () => registerQuickHandlers(null);
  }, [sortedProducts.length, registerQuickHandlers, trayHandlers]);

  const toggleCompare = useCallback((link: string) => {
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
  }, []);

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
      const parsed = await readApiJson<{
        verdict?: CompareVerdictPayload;
        source?: string;
        error?: string;
        retryAfter?: number;
      }>(res);
      const data = parsed.data;
      if (res.status === 429) {
        const wait =
          data && typeof data.retryAfter === "number"
            ? ` Retry in ~${data.retryAfter}s.`
            : "";
        setVerdictError(apiErrorText(parsed, "Too many requests.") + wait);
        trackEvent(QuantAnalyticsEvents.COMPARE_VERDICT_FAIL, { reason: "rate_limit" });
        return;
      }
      if (!res.ok || isApiFailure(parsed) || !data?.verdict) {
        setVerdictError(apiErrorText(parsed, "Could not load AI verdict."));
        trackEvent(QuantAnalyticsEvents.COMPARE_VERDICT_FAIL, { reason: "response" });
        return;
      }
      setVerdict(data.verdict);
      setVerdictSource(data.source ?? null);
      trackEvent(QuantAnalyticsEvents.COMPARE_VERDICT, {
        source: data.source ?? "unknown",
        count: compareProducts.length,
      });
    } catch {
      setVerdictError("Could not load AI verdict.");
      trackEvent(QuantAnalyticsEvents.COMPARE_VERDICT_FAIL, { reason: "network" });
    } finally {
      setVerdictLoading(false);
    }
  }

  const compareProducts = sortedProducts.filter((p) => compareLinks.includes(p.link));

  const compareTrayInsightLines = useMemo(() => {
    const pinned = sortedProducts.filter((p) => compareLinks.includes(p.link));
    return buildCompareTrayInsights(pinned, sortedProducts);
  }, [compareLinks, sortedProducts]);

  const prevCompareCount = useRef(0);
  useEffect(() => {
    const n = compareProducts.length;
    if (n > 0 && prevCompareCount.current === 0) {
      trackEvent(QuantAnalyticsEvents.COMPARE_OPEN, { count: n });
    }
    prevCompareCount.current = n;
  }, [compareProducts.length]);

  if (loading && products.length === 0) {
    return (
      <section
        id="quantai-results-anchor"
        className="relative mx-auto min-h-[45vh] max-w-7xl px-4 sm:px-6 pb-12"
        aria-busy="true"
        aria-label="Loading search results"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-cyan-500/8 to-transparent blur-2xl" />
        <div className="sticky top-[3.25rem] z-30 -mx-4 px-4 py-3 sm:-mx-6 sm:px-6 mb-6 border-b border-white/[0.07] bg-[#030712]/75 backdrop-blur-[28px] shadow-[0_20px_50px_-32px_rgba(0,0,0,0.85)]">
          <div className="h-12 max-w-2xl rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.07] via-white/[0.04] to-white/[0.07] animate-pulse" />
        </div>
        <div className="mb-6 space-y-4 max-w-2xl">
          <SearchStreamRibbon active />
          <AILoadingPhase />
        </div>
        <ResultSkeleton />
      </section>
    );
  }

  if (searchError && !loading && products.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-16" aria-live="assertive">
        <motion.div
          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
          className="mx-auto max-w-lg rounded-[1.75rem] border border-rose-400/25 bg-gradient-to-b from-rose-500/[0.12] to-white/[0.03] px-8 py-10 text-center backdrop-blur-2xl"
        >
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-500/15">
            <AlertCircle className="size-6 text-rose-200" strokeWidth={1.5} aria-hidden />
          </div>
          <h2 className="cockpit-display text-lg text-white/95">Search could not complete</h2>
          <p className="cockpit-body mt-2 text-sm text-rose-100/80">{searchError}</p>
          {onRetrySearch && (
            <button
              type="button"
              onClick={onRetrySearch}
              className="cockpit-cta mt-6 w-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 py-2.5 text-sm text-slate-950 transition hover:brightness-105"
            >
              Retry intelligence run
            </button>
          )}
        </motion.div>
      </section>
    );
  }

  if (products.length === 0) return null;

  if (!loading && sortedProducts.length === 0) {
    return (
      <section
        id="quantai-results-anchor"
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
          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
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
    mobilePerf && filteredDealClusters.length === 0
      ? "pb-16"
      : filteredDealClusters.length > 0
        ? "pb-[min(40rem,52vh)] sm:pb-60"
        : "pb-24";

  return (
    <section
      id="quantai-results-anchor"
      className={`relative mx-auto max-w-7xl scroll-mt-[max(5.5rem,env(safe-area-inset-top,0px)+3rem)] px-4 sm:px-6 ${advisorPad}`}
      ref={anchorRef}
    >
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

      {loading && products.length > 0 ? (
        <div
          className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2.5 text-center text-[11px] font-medium text-cyan-50/95"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
          Updating results — tray stays pinned so scroll does not jump.
        </div>
      ) : null}

      <div className="mb-6">
        <ShareSnapshotBar
          query={searchQuery}
          products={sortedProducts}
          intelligence={searchIntelligence}
        />
      </div>

      <LiveIntelligenceLayer
        key={searchQuery}
        query={searchQuery}
        products={sortedProducts}
        defaultCollapsed={mobilePerf}
      />
      {sortedProducts.length >= 2 && compareLinks.length === 0 && (
        <p className="cockpit-body -mt-1 mb-4 text-center text-[11px] leading-relaxed text-slate-500">
          Pin <span className="font-medium text-slate-400">Compare</span> on two or three finalists to unlock QuantAI
          verdicts in Compare lab.
        </p>
      )}

      <IntelligenceEducationStrip />

      {sortedProducts.length >= 2 && trayDealHighlights.length > 0 && (
        <div className="mb-8 min-w-0">
          <div className="mb-2 flex items-center justify-center gap-2">
            <BarChart3 className="size-3.5 text-emerald-300/80" aria-hidden />
            <p className="cockpit-label text-center text-[10px] tracking-[0.14em] text-slate-500">
              Cross-retailer deal intelligence · this tray
            </p>
          </div>
          <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
            {trayDealHighlights.map((h) => (
              <a
                key={h.id}
                href={h.link}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-[min(14rem,78vw)] shrink-0 rounded-2xl border border-white/[0.08] bg-black/35 px-3 py-2.5 text-left transition hover:border-cyan-400/25 hover:bg-white/[0.04]"
              >
                <p className="text-[11px] font-semibold text-cyan-100/90">{h.label}</p>
                <p className="mt-0.5 truncate text-[10px] text-slate-500">{h.store}</p>
                <p className="mt-1 line-clamp-3 text-[10px] leading-relaxed text-slate-400 [overflow-wrap:anywhere]">
                  {h.blurb}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      {searchIntelligence && (
        <motion.div
          initial={reduceMotion || mobilePerf ? { opacity: 1, y: 0 } : { opacity: 0.88, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion || mobilePerf
              ? { duration: 0 }
              : { type: "spring", stiffness: 360, damping: 34 }
          }
          className="intel-panel-shimmer relative z-0 mb-12 min-w-0 overflow-hidden rounded-[1.75rem]"
        >
          <div className="relative z-[1] min-w-0">
            <GlobalIntelligencePanel
              intel={searchIntelligence}
              displayLevel={intelligenceLevel}
              performanceMode={mobilePerf}
            />
          </div>
        </motion.div>
      )}

      {aiTopPicks.length > 0 && (
        <motion.div
          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
          className="mb-12"
        >
          <div className="mb-5 flex items-start gap-2.5">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-slate-500" strokeWidth={1.5} aria-hidden />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight text-white/[0.96]">Neural top lane</h2>
              <p className="cockpit-body mt-1 text-[11px] leading-relaxed text-slate-500">
                Highest composite signal in this tray—fastest path from browse to conviction.
              </p>
            </div>
          </div>
          <div className="flex min-w-0 gap-4 overflow-x-auto pb-2 pt-0.5 snap-x snap-mandatory [-webkit-overflow-scrolling:touch]">
            {aiTopPicks.map((p, idx) => {
              const comp = getFinalComposite(p, sortedProducts);
              const sym = currencySymbolFromListing(p);
              return (
                <motion.div
                  key={p.link}
                  initial={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...transition, delay: idx * 0.05 }}
                  whileHover={
                    reduceMotion ? undefined : { y: -3, transition: { type: "spring", stiffness: 400, damping: 28 } }
                  }
                  className="min-w-[min(100%,280px)] max-w-[280px] shrink-0 snap-start rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-black/35 p-4 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.55)] backdrop-blur-xl"
                >
                  <div className="flex gap-3">
                    {p.image && (
                      <div className="relative size-[4.25rem] shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-white to-slate-100 p-1.5">
                        <Image
                          src={p.image}
                          alt=""
                          fill
                          sizes="68px"
                          className="object-contain object-center p-0.5"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="cockpit-label text-[10px] text-slate-500/90">Pick #{idx + 1}</p>
                      <p className="cockpit-body mt-1 line-clamp-2 text-[13px] font-semibold leading-snug text-white/[0.96]">
                        {p.title}
                      </p>
                      <p className="cockpit-body mt-1 text-[11px] text-slate-500">{p.store}</p>
                    </div>
                  </div>
                  <div className="mt-3.5 flex min-w-0 items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                    <span className="text-lg font-semibold tabular-nums tracking-tight text-white">
                      {formatListingPrice(p.price, sym)}
                    </span>
                    <span className="shrink-0 rounded-full border border-white/[0.1] bg-black/30 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-slate-300">
                      QI {comp}
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
            id="quantai-compare-lab"
            initial={reduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 28, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.85 }}
            className="qa-scroll-touch fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] left-3 right-3 z-40 mx-auto max-w-5xl rounded-3xl border border-cyan-400/22 bg-[#050a14]/97 p-4 shadow-[0_36px_100px_-24px_rgba(34,211,238,0.2),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl sm:left-4 sm:right-4 sm:p-5 md:left-1/2 md:-translate-x-1/2 md:right-auto max-md:max-h-[min(72dvh,30rem)] max-md:overflow-y-auto"
            role="region"
            aria-label="Product compare"
          >
            <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
              <span className="cockpit-display flex min-w-0 items-center gap-2 text-sm text-white/92">
                <GitCompare className="size-4 shrink-0 text-cyan-300" aria-hidden />
                <BarChart3 className="size-4 shrink-0 text-violet-300/80" aria-hidden />
                <span className="truncate">Compare lab · {compareProducts.length}/3</span>
              </span>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => void runCompareVerdict()}
                  disabled={verdictLoading}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-cyan-400/35 bg-cyan-400/15 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-400/22 disabled:opacity-50"
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
                    void (async () => {
                      const ok = await copyText(buildCompareExport(compareProducts));
                      if (ok) {
                        setCompareExportFlash(true);
                        window.setTimeout(() => setCompareExportFlash(false), 2000);
                      }
                    })();
                  }}
                  className="min-h-11 rounded-full border border-white/12 bg-white/[0.07] px-3 py-2 text-[11px] font-semibold text-slate-200 transition hover:bg-white/12"
                >
                  {compareExportFlash ? "Copied" : "Export compare"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompareLinks([]);
                    setVerdict(null);
                    setVerdictError(null);
                  }}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Clear compare"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            {compareTrayInsightLines.length > 0 && (
              <div className="mb-3 min-w-0 rounded-2xl border border-white/[0.07] bg-black/35 px-3 py-3 sm:px-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Analyst snapshot (heuristic)
                </p>
                <ul className="mt-2 space-y-2.5">
                  {compareTrayInsightLines.map((line) => (
                    <li key={line.id} className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-200/95">{line.title}</p>
                      <p className="cockpit-body mt-0.5 text-[11px] leading-relaxed text-slate-400 [overflow-wrap:anywhere]">
                        {line.body}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-3">
              {compareProducts.map((p, cIdx) => {
                const qi = getFinalComposite(p, sortedProducts);
                const trustScore = getStoreTrustScore(p.store);
                const sym = currencySymbolFromListing(p);
                return (
                  <motion.div
                    key={p.link}
                    layout
                    initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...transition, delay: cIdx * 0.04 }}
                    className="min-w-0 rounded-2xl border border-white/[0.09] bg-gradient-to-b from-white/[0.08] to-black/45 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-4"
                  >
                    <p className="cockpit-body text-[12px] font-semibold leading-snug text-white/[0.95] line-clamp-2">
                      {p.title}
                    </p>
                    <p className="cockpit-body mt-1.5 text-[11px] leading-snug text-slate-500 [overflow-wrap:anywhere]">
                      <span className="text-slate-400">{p.store}</span>
                      <span className="text-slate-600"> · </span>
                      <span className="tabular-nums text-slate-300">Trust prior {trustScore}</span>
                    </p>
                    <div className="mt-3.5 grid grid-cols-2 gap-2 sm:gap-2.5">
                      <div className="rounded-xl border border-white/[0.07] bg-black/35 px-2.5 py-2">
                        <p className="cockpit-label text-[9px] text-slate-500">Price</p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-200/95">
                          {formatListingPrice(p.price, sym)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/[0.07] bg-black/35 px-2.5 py-2">
                        <p className="cockpit-label text-[9px] text-slate-500">QI</p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-cyan-100">{qi}</p>
                      </div>
                      <div className="rounded-xl border border-white/[0.07] bg-black/35 px-2.5 py-2">
                        <p className="cockpit-label text-[9px] text-slate-500">Trust</p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-200">{trustScore}</p>
                      </div>
                      <div className="rounded-xl border border-white/[0.07] bg-black/35 px-2.5 py-2">
                        <p className="cockpit-label text-[9px] text-slate-500">Rating</p>
                        <p className="mt-0.5 text-sm font-semibold text-amber-200/90">
                          {ratingValue(p.rating) > 0 ? ratingValue(p.rating).toFixed(1) : "—"}
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
              <div className="mt-4 rounded-2xl border border-violet-400/28 bg-gradient-to-b from-violet-500/[0.1] to-black/30 p-4 text-xs sm:p-4">
                <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-200/70">
                      Compare analyst report
                    </p>
                    <p className="cockpit-display text-sm text-violet-100">QuantAI verdict</p>
                  </div>
                  {verdictSource && (
                    <span className="shrink-0 rounded-full border border-white/10 bg-black/35 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                      {verdictSource}
                    </span>
                  )}
                </div>
                <p className="cockpit-body mt-3 text-[13px] leading-relaxed text-slate-100/95">{verdict.verdict}</p>
                <p className="cockpit-body mt-2 text-[11px] leading-relaxed text-slate-400">
                  Winner:{" "}
                  <a
                    href={verdict.winnerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-cyan-200 underline-offset-2 hover:underline"
                  >
                    {verdict.winnerTitle}
                  </a>
                  <span className="mx-1 text-slate-600">·</span>
                  Confidence · {verdict.confidence}
                </p>
                <ul className="cockpit-body mt-3 list-disc space-y-1.5 pl-4 text-[12px] leading-relaxed text-slate-400">
                  {verdict.rationale.map((r) => (
                    <li key={r} className="[overflow-wrap:anywhere]">
                      {r}
                    </li>
                  ))}
                </ul>
                {verdict.tradeoffAnalysis && verdict.tradeoffAnalysis.length > 0 && (
                  <div className="mt-4 border-t border-white/[0.06] pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tradeoff axes</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-slate-400">
                      {verdict.tradeoffAnalysis.map((t) => (
                        <li key={t} className="[overflow-wrap:anywhere]">
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {verdict.bestForPersonas && verdict.bestForPersonas.length > 0 && (
                  <div className="mt-3 border-t border-white/[0.06] pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Best for</p>
                    <ul className="mt-2 space-y-2 text-[11px] text-slate-400">
                      {verdict.bestForPersonas.map((b) => (
                        <li key={`${b.persona}-${b.pick}`} className="rounded-lg border border-white/[0.06] bg-black/25 px-2.5 py-2">
                          <span className="font-semibold text-slate-200">{b.persona.replace(/_/g, " ")}</span>
                          <span className="text-slate-600"> · </span>
                          <span className="text-slate-300">{b.pick}</span>
                          <span className="mt-0.5 block text-slate-500">{b.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(verdict.shortTermPick || verdict.longTermPick) && (
                  <div className="mt-3 grid gap-2 border-t border-white/[0.06] pt-3 sm:grid-cols-2">
                    {verdict.shortTermPick ? (
                      <div className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">Short-term</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{verdict.shortTermPick}</p>
                      </div>
                    ) : null}
                    {verdict.longTermPick ? (
                      <div className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/80">Long-term</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{verdict.longTermPick}</p>
                      </div>
                    ) : null}
                  </div>
                )}
                {verdict.verificationNote ? (
                  <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-500/5 px-2.5 py-2 text-[11px] leading-relaxed text-amber-100/90">
                    {verdict.verificationNote}
                  </p>
                ) : null}
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

      {mobilePerf ? (
        <div className="grid min-w-0 gap-7 sm:grid-cols-2 xl:grid-cols-3">
          {sortedProducts.map((p, index) => {
            const rank = rankByLink.get(p.link) ?? index;
            return (
              <ProductResultCard
                key={`${p.id}-${p.link}`}
                product={p}
                list={sortedProducts}
                index={index}
                rank={rank}
                dealIntel={dealIntelResolved.get(p.link)}
                compareLinks={compareLinks}
                toggleCompare={toggleCompare}
                saveProduct={saveProduct}
                savedLinks={savedLinks}
                addToWatchlist={addToWatchlist}
                onOpenIntelligence={setDetailProduct}
                lowPower={mobilePerf}
              />
            );
          })}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div
            key="product-grid"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
            className="grid min-w-0 gap-7 sm:grid-cols-2 xl:grid-cols-3"
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
                  dealIntel={dealIntelResolved.get(p.link)}
                  compareLinks={compareLinks}
                  toggleCompare={toggleCompare}
                  saveProduct={saveProduct}
                  savedLinks={savedLinks}
                  addToWatchlist={addToWatchlist}
                  onOpenIntelligence={setDetailProduct}
                  lowPower={false}
                />
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}

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
