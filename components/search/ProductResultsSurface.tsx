"use client";

import type { Dispatch, SetStateAction } from "react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import InstitutionalStatePanel from "@/components/system/InstitutionalStatePanel";
import InstitutionalFilteredPanel from "@/components/system/InstitutionalFilteredPanel";
import InlineSystemNotice from "@/components/system/InlineSystemNotice";
import { resolveInstitutionalState } from "@/lib/ui/systemStateLanguage";
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
  type ProductDealIntelligence,
} from "@/lib/intelligence/dealIntelligenceEngine";
import type { CompareVerdictPayload } from "@/lib/intelligence/compareVerdict";
import { analyzeDealCluster } from "@/lib/deals";
import type { DealClusterDTO } from "@/lib/deals/types";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { SearchIntelligenceLevel } from "@/lib/subscription/plans";
import type { ResultsFiltersState } from "@/lib/resultsFilters";
import { buildCompareExport, buildTraySummary, copyText } from "@/lib/share/intelligenceExport";
import { sortByCompositeRankEnhanced } from "@/lib/intelligence/searchRankEnhance";
import { parseCommerceSearchIntents } from "@/lib/intelligence/searchIntentV2";
import { extractHumanSearchIntent } from "@/lib/intelligence/searchIntentBrain";
import { computeMarketAwarenessForTray } from "@/lib/intelligence/marketAwareness";
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
  /** Precomputed tray deal map (optional â€” avoids duplicate work from home). */
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
          <div className="qa-skeleton-shimmer h-40 rounded-2xl" />
          <div className="qa-skeleton-shimmer mt-4 h-4 w-[82%] rounded-lg" />
          <div className="qa-skeleton-shimmer mt-2 h-3 w-3/5 rounded" />
          <div className="qa-skeleton-shimmer mt-4 h-3 w-full rounded" />
          <div className="qa-skeleton-shimmer mt-2 h-3 w-2/3 rounded" />
          <div className="qa-skeleton-shimmer mt-6 h-11 rounded-full" />
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
  const [trayFocusLink, setTrayFocusLink] = useState<string | null>(null);

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
        await copyText(buildTraySummary(q.trim() || "â€”", list));
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
      setVerdictError("Comparison tray recalibrating â€” synthesis alignment incomplete.");
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
        <div className="qa-os-toolbar sticky top-[3.25rem] z-30 -mx-4 px-4 py-3 sm:-mx-6 sm:px-6 mb-6">
          <div className="h-12 max-w-2xl rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.07] via-white/[0.04] to-white/[0.07] animate-pulse" />
        </div>
        <div className="mb-8 max-w-2xl">
          <p className="qi-sys-results-loading" aria-live="polite">
            Stabilizing synthesis tray
          </p>
          <div className="qi-sys-results-loading-bar" aria-hidden>
            <div className="qi-sys-results-loading-fill" />
          </div>
        </div>
        <ResultSkeleton />
      </section>
    );
  }

  if (searchError && !loading && products.length === 0) {
    const state = resolveInstitutionalState(searchError);
    if (!state) return null;
    const trayExpl = searchMeta?.trayExplanation as
      | { headline?: string; supporting?: string; hints?: string[] }
      | null
      | undefined;
    const mergedState = {
      ...state,
      supporting:
        typeof trayExpl?.supporting === "string" && trayExpl.supporting.trim()
          ? trayExpl.supporting.trim()
          : state.supporting,
      recoveryHints:
        Array.isArray(trayExpl?.hints) && trayExpl.hints.length > 0
          ? trayExpl.hints
          : state.recoveryHints,
    };
    return (
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-16" aria-live="polite">
        <InstitutionalStatePanel state={mergedState} onAction={onRetrySearch} />
        <p className="qi-silent-whisper mx-auto mt-4 max-w-lg text-center text-[11px] text-slate-500/85">
          QuantAI provides decision intelligence from retailer listings in this tray — not financial advice.
        </p>
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
        <InstitutionalFilteredPanel visibleCount={products.length} onClearFilters={onClearFilters} />
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

      {marketComparison && !searchIntelligence ? (
        <div className="mb-6 grid gap-2 rounded-[1.25rem] border border-white/[0.06] bg-white/[0.02] p-3 sm:grid-cols-4 sm:p-3.5">
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
          Updating trayâ€¦
        </div>
      ) : null}

      <div className={compactTray ? "mb-5" : "mb-8"}>
        <ShareSnapshotBar
          query={searchQuery}
          products={sortedProducts}
          intelligence={searchIntelligence}
        />
      </div>

      {!searchIntelligence ? (
        <LiveIntelligenceLayer
          key={searchQuery}
          query={searchQuery}
          products={sortedProducts}
          marketPulse={marketPulse}
          familyInsight={leadFamilyInsight}
          defaultCollapsed
        />
      ) : null}
      {sortedProducts.length >= 2 && compareLinks.length === 0 ? (
        <div className="mb-7 flex justify-center">
          <button
            type="button"
            onClick={() => setCompareLinks(sortedProducts.slice(0, 2).map((p) => p.link))}
            className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[11px] font-medium text-slate-400 transition hover:border-cyan-400/15 hover:text-slate-200"
          >
            Compare top two
          </button>
        </div>
      ) : null}

      {sparseTray && onRunRelatedQuery && relatedQueries.length > 0 ? (
        <div className="mb-8 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 sm:px-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
            Adjacent scans
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
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

      {searchIntelligence && (
        <motion.div
          initial={reduceMotion || mobilePerf ? { opacity: 1, y: 0 } : { opacity: 0.88, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion || mobilePerf
              ? { duration: 0 }
              : { type: "spring", stiffness: 300, damping: 36 }
          }
          className={`intel-panel-shimmer relative z-0 min-w-0 overflow-hidden rounded-[1.5rem] ${compactTray ? "mb-8" : "mb-14"}`}
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
          className={`qi-tray-atmosphere grid min-w-0 ${gridCols} ${compactTray ? "gap-6 sm:gap-7" : "gap-8 sm:gap-9"} ${gridMax}`}
          data-tray-focus={trayFocusLink ? "true" : "false"}
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
            className={`qi-tray-atmosphere grid min-w-0 ${gridCols} ${compactTray ? "gap-6 sm:gap-7" : "gap-8 sm:gap-9"} ${gridMax}`}
            data-tray-focus={trayFocusLink ? "true" : "false"}
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
