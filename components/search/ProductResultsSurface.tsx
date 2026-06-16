"use client";

/** QUANTAI_PHASE_26_2_STABLE_FROZEN — single verdict + reasoning pipeline wiring. */
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import InstitutionalFilteredPanel from "@/components/system/InstitutionalFilteredPanel";
import InstitutionalStatePanel from "@/components/system/InstitutionalStatePanel";
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
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { Phase93TrustDiscountMeta } from "@/lib/intelligence/phase93TrustDiscountHardening";
import type { VerdictSurfaceContext } from "@/lib/ui/verdictSurfaceOptimization";
import type { MarketContextInput } from "@/lib/ui/marketContextActivation";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
  type CoherentProductDecision,
} from "@/lib/ui/decisionCoherenceActivation";
import {
  buildProductionReadinessDecisionMap,
  buildProductionReadinessDisplayCoherenceByLink,
  orderProductsBySearchRank,
} from "@/lib/ui/phase45ProductionReadinessActivation";
import { parseTruthFoundationPrefetch } from "@/lib/truth/truthFoundationLoader";
import CompareIntelligencePanel from "./CompareIntelligencePanel";
import IntelligenceCommandCenter from "./IntelligenceCommandCenter";
import LiveIntelligenceRail from "./LiveIntelligenceRail";
import MarketSummaryBlock from "./MarketSummaryBlock";
import ProductIntelligenceDrawer from "./ProductIntelligenceDrawer";
import ProductResultCard from "./ProductResultCard";
import ResultsToolbar from "./ResultsToolbar";
import SellerCoverageStrip from "./SellerCoverageStrip";
import { useMobilePerf } from "@/lib/hooks/useMobilePerf";
import { relatedTrayQueries } from "@/lib/search/relatedTrayQueries";
import { buildUnifiedMarketGroup } from "@/lib/intelligence/unifiedMarketMatching";
import { buildCommerceCoverageTray } from "@/lib/ui/commerceCoverageActivation";
import { INTEL_TERMS } from "@/lib/ui/intelligenceTerminology";
import {
  loadMarketMemory,
  recordTrayPriceSnapshots,
} from "@/lib/intelligence/marketMemory";

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
    <div className="qa-ui-results-grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={i < 6 ? { animationDelay: `${i * 55}ms` } : undefined}
          className="cockpit-glass-panel skeleton-cinematic overflow-hidden border-white/[0.07] p-5 motion-safe:animate-[fadeIn_0.45s_ease-out_both]"
        >
          <div className="qa-skeleton-shimmer h-14 rounded-xl" />
          <div className="qa-skeleton-shimmer mt-3 h-3 w-full rounded" />
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="qa-skeleton-shimmer h-12 rounded-lg" />
            <div className="qa-skeleton-shimmer h-12 rounded-lg" />
            <div className="qa-skeleton-shimmer h-12 rounded-lg" />
          </div>
          <div className="qa-skeleton-shimmer mt-3 h-3 w-4/5 rounded" />
          <div className="qa-skeleton-shimmer mt-2 h-3 w-2/3 rounded" />
          <div className="qa-skeleton-shimmer mt-4 h-10 rounded-full" />
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

  const truthPrefetchByLink = useMemo(
    () => parseTruthFoundationPrefetch(searchMeta?.truthFoundationPrefetch),
    [searchMeta?.truthFoundationPrefetch]
  );

  const compositeRanked = useMemo(
    () => sortByCompositeRankEnhanced(sortedProducts, searchQuery, { truthPrefetchByLink }),
    [sortedProducts, searchQuery, truthPrefetchByLink]
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
  const decisionBrief = (searchMeta?.decisionBrief ?? null) as DecisionBriefDTO | null;
  const verdictSurface = useMemo((): VerdictSurfaceContext => {
    return {
      verdictIntelligence:
        (searchMeta?.verdictIntelligence as VerdictSurfaceContext["verdictIntelligence"]) ?? null,
      rankingEngine: (searchMeta?.rankingEngine as VerdictSurfaceContext["rankingEngine"]) ?? null,
      decisionReadiness:
        (searchMeta?.decisionReadiness as VerdictSurfaceContext["decisionReadiness"]) ?? null,
      intentConfidence:
        (searchMeta?.intentConfidence as VerdictSurfaceContext["intentConfidence"]) ?? null,
      valueIntelligence:
        (searchMeta?.valueIntelligence as VerdictSurfaceContext["valueIntelligence"]) ?? null,
    };
  }, [searchMeta]);
  const marketContext = useMemo((): MarketContextInput => {
    return {
      decisionBrief,
      valueIntelligence:
        (searchMeta?.valueIntelligence as MarketContextInput["valueIntelligence"]) ?? null,
      realDiscount: (searchMeta?.realDiscount as MarketContextInput["realDiscount"]) ?? null,
      retailerTrust: (searchMeta?.retailerTrust as MarketContextInput["retailerTrust"]) ?? null,
      reviewCredibility:
        (searchMeta?.reviewCredibility as MarketContextInput["reviewCredibility"]) ?? null,
      decisionReadiness:
        (searchMeta?.decisionReadiness as MarketContextInput["decisionReadiness"]) ?? null,
      rankingEngine: (searchMeta?.rankingEngine as MarketContextInput["rankingEngine"]) ?? null,
      verdictIntelligence:
        (searchMeta?.verdictIntelligence as MarketContextInput["verdictIntelligence"]) ?? null,
    };
  }, [searchMeta, decisionBrief]);
  const trayCoherence = useMemo(
    () => buildTrayCoherenceContext({ searchMeta, decisionBrief }),
    [searchMeta, decisionBrief]
  );
  const commerceCoverageByLink = useMemo(
    () =>
      buildCommerceCoverageTray(
        sortedProducts,
        searchQuery.trim(),
        "€",
        (searchMeta?.phase93TrustDiscount as Phase93TrustDiscountMeta | null) ?? null
      ),
    [sortedProducts, searchQuery, searchMeta?.phase93TrustDiscount]
  );
  const coherenceByLink = useMemo((): Map<string, CoherentProductDecision> => {
    const map = new Map<string, CoherentProductDecision>();
    for (let index = 0; index < sortedProducts.length; index++) {
      const product = sortedProducts[index]!;
      const rank = rankByLink.get(product.link) ?? index;
      map.set(
        product.link,
        activateProductDecisionCoherence({
          product,
          list: sortedProducts,
          rank,
          tray: trayCoherence,
          commerceCoverage: commerceCoverageByLink.get(product.link) ?? null,
          searchQuery: searchQuery.trim(),
          trayVerdictAuthority: null,
        })
      );
    }
    return map;
  }, [sortedProducts, rankByLink, trayCoherence, commerceCoverageByLink, searchQuery]);

  const metaByLink = useMemo(
    () =>
      new Map(
        sortedProducts.map((product, index) => [
          product.link,
          {
            price: product.price,
            rank: rankByLink.get(product.link) ?? index,
            rating: Number(product.rating) || 0,
            reviewsCount: product.reviewsCount ?? 0,
            store: product.store,
          },
        ])
      ),
    [sortedProducts, rankByLink]
  );
  const productsByLink = useMemo(
    () =>
      new Map(
        sortedProducts.map((product) => [
          product.link,
          { product, searchQuery: searchQuery.trim() },
        ])
      ),
    [sortedProducts, searchQuery]
  );
  const commerceCore = useMemo(
    () =>
      buildProductionReadinessDecisionMap(
        coherenceByLink,
        metaByLink,
        productsByLink,
        marketMemoryState,
        truthPrefetchByLink
      ),
    [coherenceByLink, metaByLink, productsByLink, marketMemoryState, truthPrefetchByLink]
  );
  const universalByLink = commerceCore.decisions;
  const phase45TrayContext = commerceCore.trayContext;
  const intelligenceRankedProducts = useMemo(
    () => orderProductsBySearchRank(sortedProducts, phase45TrayContext.intelligenceRankOrder),
    [sortedProducts, phase45TrayContext.intelligenceRankOrder]
  );
  const intelligenceSearchRankByLink = useMemo(() => {
    const m = new Map<string, number>();
    phase45TrayContext.intelligenceRankOrder.forEach((link, index) => m.set(link, index));
    return m;
  }, [phase45TrayContext.intelligenceRankOrder]);
  const displayCoherenceByLink = useMemo(
    () => buildProductionReadinessDisplayCoherenceByLink(coherenceByLink, universalByLink, phase45TrayContext),
    [coherenceByLink, universalByLink, phase45TrayContext]
  );
  const phase271Tray = null;
  const detailCoherence = detailProduct
    ? displayCoherenceByLink.get(detailProduct.link) ?? null
    : null;
  const unifiedMarketByLink = useMemo(
    () => buildUnifiedMarketGroup(sortedProducts, searchQuery.trim()).byLink,
    [sortedProducts, searchQuery]
  );
  const detailCommerceCoverage = detailProduct
    ? commerceCoverageByLink.get(detailProduct.link) ?? null
    : null;
  const compactTray = sortedProducts.length > 0 && sortedProducts.length <= 4;
  const sparseTray = sortedProducts.length > 0 && sortedProducts.length <= 3;
  const relatedQueries = useMemo(
    () => (sparseTray && searchQuery.trim() ? relatedTrayQueries(searchQuery, 5) : []),
    [sparseTray, searchQuery]
  );
  const resultsGridClass =
    sortedProducts.length === 1
      ? "qa-ui-results-grid qa-ui-results-grid--single"
      : "qa-ui-results-grid";
  const gridMax =
    sortedProducts.length === 2 ? "max-w-4xl mx-auto" : sortedProducts.length === 3 ? "max-w-6xl mx-auto" : "";

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
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-slate-900/5 to-transparent blur-2xl" />
        <div className="qa-os-toolbar sticky top-[3.25rem] z-30 -mx-4 px-4 py-3 sm:-mx-6 sm:px-6 mb-6">
          <div className="h-12 max-w-2xl rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.07] via-white/[0.04] to-white/[0.07] animate-pulse" />
        </div>
        <LiveIntelligenceRail live searchQuery={searchQuery} className="mb-6" />
        <ResultSkeleton />
      </section>
    );
  }

  if (searchError && !loading && products.length === 0) {
    const institutional = resolveInstitutionalState(searchError);
    return (
      <section
        id="quantai-results-anchor"
        className="qa-ref-section qa-ref-section--results mx-auto max-w-7xl px-4 sm:px-6 pb-16"
        aria-live="polite"
      >
        {institutional ? (
          <InstitutionalStatePanel
            state={institutional}
            onAction={onRetrySearch}
            className="mt-4"
          />
        ) : (
          <div className="qa-ref-ws-alert mt-4 text-center">
            <p>{searchError}</p>
            {onRetrySearch ? (
              <button
                type="button"
                className="qa-ref-btn qa-ref-btn--ghost mt-3"
                onClick={onRetrySearch}
              >
                Retry intelligence read
              </button>
            ) : null}
          </div>
        )}
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
    compactTray
      ? "pb-8"
      : "pb-12";

  return (
    <section
      id="quantai-results-anchor"
      className={`qa-ref-results qa-ref-section qa-ref-section--results relative scroll-mt-[max(5.5rem,env(safe-area-inset-top,0px)+3rem)] ${loading ? "qa-ref-results--scanning" : ""} ${advisorPad}`}
      ref={anchorRef}
    >
      <div className="pointer-events-none absolute inset-x-0 -top-8 h-40 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,rgba(91,111,217,0.06),transparent_70%)]" />

      <IntelligenceCommandCenter
        products={sortedProducts}
        searchQuery={searchQuery}
        searchIntelligence={searchIntelligence}
        marketComparison={marketComparison ?? null}
      />

      <SellerCoverageStrip products={sortedProducts} />

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
          className="qa-ui-processing-panel qa-ui-tray-status mb-3 flex items-center justify-center gap-2.5 px-4 py-2.5 text-center text-[12px] font-medium"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-3.5 shrink-0 animate-spin opacity-70" aria-hidden />
          Updating results…
        </div>
      ) : null}

      <div className="qa-ref-results-grid-head">
        <p className="qa-ref-kicker">{INTEL_TERMS.intelligenceResults}</p>
        <p className="qa-ref-results-grid-head__count">{sortedProducts.length} intelligence assets in tray</p>
      </div>

      <div className={compactTray ? "mb-3 mt-3" : "mb-4 mt-4"}>
        <ShareSnapshotBar
          query={searchQuery}
          products={sortedProducts}
          intelligence={searchIntelligence}
        />
      </div>

      {sparseTray && onRunRelatedQuery && relatedQueries.length > 0 ? (
        <div className="qa-ui-live-ribbon mb-8">
          <p className="qa-ui-live-ribbon-label">Adjacent scans</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {relatedQueries.map((rq) => (
              <button
                key={rq}
                type="button"
                disabled={loading}
                onClick={() => onRunRelatedQuery(rq)}
                className="qa-ui-tray-adjacent-chip disabled:opacity-40"
              >
                {rq}
              </button>
            ))}
          </div>
        </div>
      ) : null}

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
        onSave={saveProduct}
        saved={detailProduct != null && savedLinks.has(detailProduct.link)}
        decisionBrief={detailCoherence?.decisionBrief ?? decisionBrief}
        marketContext={detailCoherence?.marketContext ?? marketContext}
        coherentDecision={detailCoherence}
        commerceCoverage={detailCommerceCoverage}
      />

      {mobilePerf ? (
        <div
          className={`qi-tray-atmosphere min-w-0 ${resultsGridClass} ${gridMax}`}
          data-tray-focus={trayFocusLink ? "true" : "false"}
        >
          {intelligenceRankedProducts.map((p, index) => {
            const rank = intelligenceSearchRankByLink.get(p.link) ?? rankByLink.get(p.link) ?? index;
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
                  decisionBrief={decisionBrief}
                  verdictSurface={verdictSurface}
                  marketContext={marketContext}
                  coherentDecision={displayCoherenceByLink.get(p.link) ?? null}
                  commerceCoverage={commerceCoverageByLink.get(p.link) ?? null}
                  universalProductDecision={universalByLink.get(p.link) ?? null}
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
            className={`qi-tray-atmosphere min-w-0 ${resultsGridClass} ${gridMax}`}
            data-tray-focus={trayFocusLink ? "true" : "false"}
          >
            {intelligenceRankedProducts.map((p, index) => {
              const rank = intelligenceSearchRankByLink.get(p.link) ?? rankByLink.get(p.link) ?? index;
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
                    decisionBrief={decisionBrief}
                    verdictSurface={verdictSurface}
                    marketContext={marketContext}
                    coherentDecision={displayCoherenceByLink.get(p.link) ?? null}
                    commerceCoverage={commerceCoverageByLink.get(p.link) ?? null}
                    universalProductDecision={universalByLink.get(p.link) ?? null}
                  />
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}

      <MarketSummaryBlock
        products={sortedProducts}
        searchIntelligence={searchIntelligence}
        marketComparison={marketComparison ?? null}
        marketCoverage={phase45TrayContext.marketCoverage}
        searchDominanceSummary={phase45TrayContext.searchDominanceSummary}
        marketSummaryV2={phase45TrayContext.marketSummaryV2}
        phase271Tray={phase271Tray}
      />

      {searchIntelligence && (
        <motion.div
          initial={reduceMotion || mobilePerf ? { opacity: 1, y: 0 } : { opacity: 0.88, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion || mobilePerf
              ? { duration: 0 }
              : { type: "spring", stiffness: 300, damping: 36 }
          }
          className={`qa-ref-intel-preview qa-ui-analyst-tray qa-ui-analyst-shell relative z-0 mt-6 min-w-0 overflow-hidden rounded-[1.5rem] ${compactTray ? "mb-6" : "mb-8"}`}
        >
          <div className="relative z-[1] min-w-0">
            <GlobalIntelligencePanel
              intel={searchIntelligence}
              displayLevel={intelligenceLevel}
              performanceMode={mobilePerf}
              compact
            />
          </div>
        </motion.div>
      )}

      {compareProducts.length > 0 ? (
        <div className="pointer-events-none h-20 sm:h-24" aria-hidden />
      ) : null}
    </section>
  );
}
