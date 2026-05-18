"use client";

import type { Dispatch, SetStateAction } from "react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, BarChart3, Loader2, Sparkles } from "lucide-react";
import { QuantAnalyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";
import { apiErrorText, isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";
import GlobalIntelligencePanel from "@/components/intelligence/GlobalIntelligencePanel";
import { useCockpit, type CockpitQuickHandlers } from "@/components/cockpit/cockpitContext";
import ShareSnapshotBar from "@/components/share/ShareSnapshotBar";
import { buildCompareIntelligenceSnapshot } from "@/lib/intelligence/compareIntelligence";
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
import { sortByCompositeRankEnhanced } from "@/lib/intelligence/searchRankEnhance";
import { parseCommerceSearchIntents } from "@/lib/intelligence/searchIntentV2";
import { extractHumanSearchIntent } from "@/lib/intelligence/searchIntentBrain";
import { computeMarketAwarenessForTray } from "@/lib/intelligence/marketAwareness";
import { getFinalComposite } from "@/lib/shoppingScore";
import type { QuantProduct } from "@/lib/shoppingScore";
import CompareIntelligencePanel from "./CompareIntelligencePanel";
import ProductIntelligenceDrawer from "./ProductIntelligenceDrawer";
import ProductResultCard from "./ProductResultCard";
import ResultsToolbar from "./ResultsToolbar";
import LiveIntelligenceLayer from "@/components/live/LiveIntelligenceLayer";
import { useMobilePerf } from "@/lib/hooks/useMobilePerf";
import { relatedTrayQueries } from "@/lib/search/relatedTrayQueries";
import { buildUnifiedMarketGroup } from "@/lib/intelligence/unifiedMarketMatching";
import {
  loadMarketMemory,
  recordTrayPriceSnapshots,
} from "@/lib/intelligence/marketMemory";

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
  /** Sparse-tray follow-up scans (hero prompts / token match). */
  onRunRelatedQuery?: (q: string) => void;
  /** API market/debug metadata retained for premium tray context. */
  searchMeta?: Record<string, unknown> | null;
};

function ResultSkeleton() {
  return (
    <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={i < 6 ? { animationDelay: `${i * 55}ms` } : undefined}
          className="cockpit-glass-panel skeleton-cinematic overflow-hidden border-white/[0.07] p-5 motion-safe:animate-[fadeIn_0.45s_ease-out_both]"
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
  onRunRelatedQuery,
  searchMeta = null,
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
  const [marketMemoryTick, setMarketMemoryTick] = useState(0);

  useEffect(() => {
    onCompareTrayChange?.(compareLinks);
  }, [compareLinks, onCompareTrayChange]);

  useEffect(() => {
    if (sortedProducts.length === 0) return;
    if (typeof window === "undefined") return;
    recordTrayPriceSnapshots(sortedProducts, searchQuery);
    const id = window.setTimeout(() => setMarketMemoryTick((n) => n + 1), 0);
    return () => window.clearTimeout(id);
  }, [sortedProducts, searchQuery, resultsKey]);

  const compositeRanked = useMemo(
    () => sortByCompositeRankEnhanced(sortedProducts, searchQuery),
    [sortedProducts, searchQuery]
  );
  const rankByLink = useMemo(() => {
    const m = new Map<string, number>();
    compositeRanked.forEach((p, i) => m.set(p.link, i));
    return m;
  }, [compositeRanked]);

  const humanSearchIntent = useMemo(
    () => (searchQuery.trim() ? extractHumanSearchIntent(searchQuery) : null),
    [searchQuery]
  );

  const marketMemoryState = useMemo(() => {
    void marketMemoryTick;
    void resultsKey;
    void searchQuery;
    if (typeof window === "undefined") return null;
    return loadMarketMemory();
  }, [marketMemoryTick, searchQuery, resultsKey]);

  const dealIntelResolved = useMemo(() => {
    if (dealIntelByLinkProp) return dealIntelByLinkProp;
    const intents = searchQuery.trim() ? parseCommerceSearchIntents(searchQuery) : undefined;
    return buildDealIntelByLink(
      sortedProducts,
      intents,
      humanSearchIntent ?? undefined,
      marketMemoryState ?? undefined
    );
  }, [dealIntelByLinkProp, sortedProducts, searchQuery, humanSearchIntent, marketMemoryState]);
  const marketTray = useMemo(
    () => computeMarketAwarenessForTray(searchQuery?.trim() ?? "", sortedProducts),
    [sortedProducts, searchQuery]
  );
  const marketPulse = useMemo(() => sortedProducts[0]?.qiMarketPulse ?? null, [sortedProducts]);
  const trayDealHighlights = useMemo(() => buildTrayDealHighlights(sortedProducts), [sortedProducts]);
  const marketComparison = searchMeta?.marketComparison as
    | {
        merchantCount?: number;
        trustedMerchantCount?: number;
        comparisonSignals?: {
          merchantBalanceScore?: number;
          marketplaceShare01?: number;
          regionalFit01?: number;
          strongestFamilyMerchantDepth?: number;
        };
      }
    | undefined;
  const marketComparisonSignals = marketComparison?.comparisonSignals;

  const unifiedMarketByLink = useMemo(
    () => buildUnifiedMarketGroup(sortedProducts, searchQuery.trim()).byLink,
    [sortedProducts, searchQuery]
  );
  const leadFamilyInsight = useMemo(() => {
    let best: ReturnType<typeof unifiedMarketByLink.get> | null = null;
    for (const p of compositeRanked) {
      const insight = unifiedMarketByLink.get(p.link);
      if (!insight || insight.storeCount < 2) continue;
      if (
        !best ||
        insight.storeCount > best.storeCount ||
        (insight.storeCount === best.storeCount && insight.merchantDiversityScore > best.merchantDiversityScore)
      ) {
        best = insight;
      }
    }
    return best;
  }, [compositeRanked, unifiedMarketByLink]);

  const aiTopPicks = useMemo(() => compositeRanked.slice(0, 3), [compositeRanked]);
  const compactTray = sortedProducts.length > 0 && sortedProducts.length <= 4;
  const sparseTray = sortedProducts.length > 0 && sortedProducts.length <= 3;
  const relatedQueries = useMemo(
    () => (sparseTray && searchQuery.trim() ? relatedTrayQueries(searchQuery, 5) : []),
    [sparseTray, searchQuery]
  );
  const gridCols =
    sortedProducts.length === 1
      ? "grid-cols-1 sm:grid-cols-1 max-w-md mx-auto"
      : "sm:grid-cols-2 xl:grid-cols-3";
  const gridMax =
    sortedProducts.length === 2 ? "max-w-4xl mx-auto" : sortedProducts.length === 3 ? "max-w-6xl mx-auto" : "";

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
    : { type: "spring" as const, stiffness: 300, damping: 36 };

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

  const compareProducts = sortedProducts.filter((p) => compareLinks.includes(p.link));

  const compareIntelligence = useMemo(
    () => buildCompareIntelligenceSnapshot(compareProducts, sortedProducts),
    [compareProducts, sortedProducts]
  );

  async function runCompareVerdict() {
    if (compareProducts.length === 0) return;
    setVerdictLoading(true);
    setVerdictError(null);
    try {
      const res = await fetch("/api/search/compare-verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          products: compareProducts,
          tray: sortedProducts.slice(0, 48),
        }),
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
        className="relative mx-auto min-h-[min(52rem,78vh)] max-w-7xl px-4 sm:px-6 pb-12"
        aria-busy="true"
        aria-label="Loading search results"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-cyan-500/8 to-transparent blur-2xl" />
        <div className="sticky top-[3.25rem] z-30 -mx-4 px-4 py-3 sm:-mx-6 sm:px-6 mb-6 border-b border-white/[0.07] bg-[#030712]/75 backdrop-blur-[28px] shadow-[0_20px_50px_-32px_rgba(0,0,0,0.85)]">
          <div className="h-12 max-w-2xl rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.07] via-white/[0.04] to-white/[0.07] animate-pulse" />
        </div>
        <div className="mb-8 max-w-2xl">
          <p className="text-[12px] font-medium text-slate-500/90" aria-live="polite">
            Assembling your tray…
          </p>
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
          <h2 className="cockpit-display text-lg text-white/95">Field paused</h2>
          <p className="cockpit-body mt-2 text-sm text-slate-300/95">
            The listing feed didn’t return a clean tray. Try a shorter query, a different retailer hint, or run again—nothing
            on-device was lost.
          </p>
          <p className="cockpit-body mt-3 text-xs leading-relaxed text-slate-500">{searchError}</p>
          {onRetrySearch && (
            <button
              type="button"
              onClick={onRetrySearch}
              className="cockpit-cta mt-6 w-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 py-2.5 text-sm text-slate-950 transition hover:brightness-105"
            >
              Run again
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
          <h2 className="text-lg font-semibold text-white/95">Filters cleared the visible field</h2>
          <p className="cockpit-body mt-2 text-sm text-slate-400">
            This scan still holds{" "}
            <span className="tabular-nums font-medium text-slate-300">{products.length}</span> listings—widen a
            constraint or reset filters to bring them back into view.
          </p>
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-6 rounded-full border border-white/15 bg-white/[0.08] px-6 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/[0.14]"
          >
            Show all results
          </button>
        </motion.div>
      </section>
    );
  }

  const advisorPad =
    mobilePerf && filteredDealClusters.length === 0
      ? compactTray
        ? "pb-12"
        : "pb-16"
      : filteredDealClusters.length > 0
        ? "pb-[min(40rem,52vh)] sm:pb-60"
        : compactTray
          ? "pb-16"
          : "pb-24";

  return (
    <section
      id="quantai-results-anchor"
      className={`relative mx-auto max-w-7xl scroll-mt-[max(5.5rem,env(safe-area-inset-top,0px)+3rem)] px-4 sm:px-6 ${advisorPad}`}
      ref={anchorRef}
    >
      <div className="pointer-events-none absolute inset-x-0 -top-8 h-48 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,rgba(34,211,238,0.08),transparent_68%)]" />

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

      {marketComparison ? (
        <div className="mb-5 grid gap-2 rounded-[1.35rem] border border-white/[0.075] bg-gradient-to-r from-white/[0.045] via-cyan-500/[0.035] to-violet-500/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] sm:grid-cols-4 sm:p-4">
          {[
            ["Market depth", `${marketComparison.merchantCount ?? sortedProducts.length} merchants`],
            ["Trusted lanes", `${marketComparison.trustedMerchantCount ?? 0} verified`],
            ["Balance", `${marketComparisonSignals?.merchantBalanceScore ?? 0}/100`],
            ["Regional fit", `${Math.round((marketComparisonSignals?.regionalFit01 ?? 0) * 100)}% local`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/[0.055] bg-black/20 px-3 py-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
              <p className="mt-1 text-[13px] font-semibold text-slate-100">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {loading && products.length > 0 ? (
        <div
          className="mb-4 flex items-center justify-center gap-2.5 rounded-xl border border-cyan-400/14 bg-cyan-500/[0.07] px-4 py-3 text-center text-[12px] font-medium text-cyan-50/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-opacity duration-300"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-3.5 shrink-0 animate-spin text-cyan-200/90" aria-hidden />
          Updating your tray—previous results stay visible until the new scan lands.
        </div>
      ) : null}

      <div className={compactTray ? "mb-4" : "mb-6"}>
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
        marketPulse={marketPulse}
        familyInsight={leadFamilyInsight}
        defaultCollapsed={mobilePerf}
      />
      {sortedProducts.length >= 2 && compareLinks.length === 0 && (
          <p className="cockpit-body -mt-1 mb-4 text-center text-[12px] leading-snug text-slate-500">
          Pin <span className="font-medium text-slate-400">Compare</span> on two or three rows to open the decision lab.
        </p>
      )}
      {sortedProducts.length === 1 && compareLinks.length === 0 && (
        <p className="cockpit-body -mt-1 mb-4 text-center text-[12px] leading-snug text-slate-500">
          One row in field—run an adjacent scan to build a stronger comparison set.
        </p>
      )}

      {sparseTray && onRunRelatedQuery && relatedQueries.length > 0 ? (
        <div className="mb-6 rounded-[1.25rem] border border-white/[0.1] bg-white/[0.03] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Adjacent scans
            </p>
            <span className="text-[11px] text-slate-500">Same session · new field</span>
          </div>
          <p className="cockpit-body mt-1.5 text-[13px] text-slate-400">
            Few rows in this tray—open a sibling query to keep the analyst surface populated.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {relatedQueries.map((rq) => (
              <button
                key={rq}
                type="button"
                disabled={loading}
                onClick={() => onRunRelatedQuery(rq)}
                className="max-w-[min(100%,20rem)] rounded-full border border-white/[0.1] bg-black/30 px-3 py-1.5 text-left text-[11px] font-medium leading-snug text-slate-200 transition hover:border-cyan-400/22 hover:bg-white/[0.05] disabled:opacity-40"
              >
                {rq}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!compactTray ? <IntelligenceEducationStrip /> : null}

      {sortedProducts.length >= 2 && trayDealHighlights.length > 0 && (
        <div className="mb-8 min-w-0">
          <div className="mb-2 flex items-center justify-center gap-2">
            <BarChart3 className="size-3.5 text-emerald-300/80" aria-hidden />
            <p className="cockpit-label text-center text-[11px] tracking-[0.1em] text-slate-500">
              Market signals · this tray
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
              : { type: "spring", stiffness: 300, damping: 36 }
          }
          className={`intel-panel-shimmer relative z-0 min-w-0 overflow-hidden rounded-[1.75rem] ${compactTray ? "mb-6" : "mb-12"}`}
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

      {aiTopPicks.length > 0 && sortedProducts.length > 3 && (
        <motion.div
          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
          className="mb-12"
        >
          <div className="rounded-[1.35rem] border border-cyan-400/20 bg-gradient-to-b from-cyan-500/[0.06] via-[#050a14]/90 to-black/50 p-1 shadow-[0_0_0_1px_rgba(34,211,238,0.06),0_28px_80px_-40px_rgba(34,211,238,0.12)]">
            <div className="rounded-[1.25rem] border border-white/[0.06] bg-[#030712]/80 px-4 py-4 sm:px-5 sm:py-5">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="cockpit-overline text-[10px] text-cyan-200/75">Lead lane</p>
                  <h2 className="mt-1 text-base font-semibold tracking-tight text-white">Highest-conviction starts</h2>
                  <p className="cockpit-body mt-1 max-w-xl text-[13px] text-slate-400">
                    Start here, then scan the full market tray for price, seller, and regional contrast.
                  </p>
                </div>
              </div>
              <div className="flex min-w-0 gap-3 overflow-x-auto pb-1 pt-0.5 snap-x snap-mandatory [-webkit-overflow-scrolling:touch] sm:gap-4">
            {aiTopPicks.map((p, idx) => {
              const comp = getFinalComposite(p, sortedProducts);
              const sym = currencySymbolFromListing(p);
              const lead = idx === 0;
              return (
                <motion.div
                  key={p.link}
                  initial={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...transition, delay: idx * 0.05 }}
                  whileHover={
                    reduceMotion ? undefined : { y: -2, transition: { type: "spring", stiffness: 340, damping: 34 } }
                  }
                  className={`min-w-[min(100%,300px)] max-w-[300px] shrink-0 snap-start rounded-2xl p-[1px] ${
                    lead
                      ? "bg-gradient-to-br from-cyan-400/35 via-white/10 to-violet-400/25 shadow-[0_0_40px_-18px_rgba(34,211,238,0.25)]"
                      : "bg-gradient-to-br from-white/[0.08] to-white/[0.02]"
                  }`}
                >
                  <div
                    className={`h-full rounded-[0.95rem] p-4 backdrop-blur-xl ${
                      lead
                        ? "border border-cyan-400/20 bg-gradient-to-br from-[#06121f]/95 via-black/60 to-black/40"
                        : "border border-white/[0.07] bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-black/40"
                    }`}
                  >
                  <div className="flex gap-3">
                    {p.image && (
                      <div className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-xl border border-white/[0.1] bg-gradient-to-b from-white to-slate-100 p-1.5">
                        <Image
                          src={p.image}
                          alt=""
                          fill
                          sizes="72px"
                          className="object-contain object-center p-0.5"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {lead ? (
                        <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-cyan-100/95">
                          Lead pick
                        </span>
                      ) : (
                        <p className="cockpit-label text-[10px] text-slate-500/90">#{idx + 1}</p>
                      )}
                      <p className="cockpit-body mt-1 line-clamp-2 text-[14px] font-semibold leading-snug text-white/[0.97]">
                        {p.title}
                      </p>
                      <p className="cockpit-body mt-1 text-[12px] text-slate-500">{p.store}</p>
                    </div>
                  </div>
                  <div className="mt-3.5 flex min-w-0 items-center justify-between gap-2 border-t border-white/[0.08] pt-3">
                    <span className={`tabular-nums tracking-tight text-white ${lead ? "text-xl font-semibold" : "text-lg font-semibold"}`}>
                      {formatListingPrice(p.price, sym)}
                    </span>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums ${
                        lead
                          ? "border-cyan-400/35 bg-cyan-500/15 text-cyan-50/95"
                          : "border-white/[0.1] bg-black/35 text-slate-300"
                      }`}
                    >
                      QI {comp}
                    </span>
                  </div>
                  </div>
                </motion.div>
              );
            })}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {compareProducts.length > 0 && (
        <CompareIntelligencePanel
          key={compareProducts.map((p) => p.link).join("|")}
          compareProducts={compareProducts}
          sortedProducts={sortedProducts}
          intelligence={compareIntelligence}
          verdict={verdict}
          verdictLoading={verdictLoading}
          verdictError={verdictError}
          verdictSource={verdictSource}
          onRunVerdict={runCompareVerdict}
          compareExportFlash={compareExportFlash}
          onExportCompare={() => {
            void (async () => {
              const ok = await copyText(buildCompareExport(compareProducts, verdict));
              if (ok) {
                setCompareExportFlash(true);
                window.setTimeout(() => setCompareExportFlash(false), 2000);
              }
            })();
          }}
          onClearAll={() => {
            setCompareLinks([]);
            setVerdict(null);
            setVerdictError(null);
            setVerdictSource(null);
          }}
          reduceMotion={Boolean(reduceMotion)}
          mobilePerf={mobilePerf}
        />
      )}

      <ProductIntelligenceDrawer
        product={detailProduct}
        list={sortedProducts}
        open={detailProduct != null}
        onClose={() => setDetailProduct(null)}
      />

      {mobilePerf ? (
        <div
          className={`grid min-w-0 ${gridCols} ${compactTray ? "gap-5 sm:gap-6" : "gap-7"} ${gridMax}`}
        >
          {sortedProducts.map((p, index) => {
            const rank = rankByLink.get(p.link) ?? index;
            return (
              <div
                key={`${p.id}-${p.link}`}
                className="min-w-0 [contain-intrinsic-size:auto_26rem] [content-visibility:auto]"
              >
                <ProductResultCard
                  product={p}
                  list={sortedProducts}
                  index={index}
                  rank={rank}
                  dealIntel={dealIntelResolved.get(p.link)}
                  marketTray={marketTray}
                  compareLinks={compareLinks}
                  toggleCompare={toggleCompare}
                  saveProduct={saveProduct}
                  savedLinks={savedLinks}
                  addToWatchlist={addToWatchlist}
                  onOpenIntelligence={setDetailProduct}
                  lowPower={mobilePerf}
                  imagePriority={index < 9 ? "high" : "low"}
                  unifiedMarket={unifiedMarketByLink.get(p.link) ?? null}
                  humanSearchIntent={humanSearchIntent}
                  marketMemoryState={marketMemoryState}
                  searchQuery={searchQuery}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <AnimatePresence mode="sync">
          <motion.div
            key="product-grid"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={`grid min-w-0 ${gridCols} ${compactTray ? "gap-5 sm:gap-6" : "gap-7"} ${gridMax}`}
          >
            {sortedProducts.map((p, index) => {
              const rank = rankByLink.get(p.link) ?? index;
              return (
                <div
                  key={`${p.id}-${p.link}`}
                  className="min-w-0 [contain-intrinsic-size:auto_26rem] [content-visibility:auto]"
                >
                  <ProductResultCard
                    product={p}
                    list={sortedProducts}
                    index={index}
                    rank={rank}
                    dealIntel={dealIntelResolved.get(p.link)}
                    marketTray={marketTray}
                    compareLinks={compareLinks}
                    toggleCompare={toggleCompare}
                    saveProduct={saveProduct}
                    savedLinks={savedLinks}
                    addToWatchlist={addToWatchlist}
                    onOpenIntelligence={setDetailProduct}
                    lowPower={false}
                    imagePriority={index < 9 ? "high" : "low"}
                    unifiedMarket={unifiedMarketByLink.get(p.link) ?? null}
                    humanSearchIntent={humanSearchIntent}
                    marketMemoryState={marketMemoryState}
                    searchQuery={searchQuery}
                  />
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}

      {compareProducts.length > 0 ? (
        <div className="pointer-events-none h-[min(11rem,26dvh)] sm:h-36" aria-hidden />
      ) : null}

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
