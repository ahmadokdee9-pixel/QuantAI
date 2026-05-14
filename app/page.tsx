"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SignInButton, useUser } from "@clerk/nextjs";
import AmbientBackdrop from "../components/cockpit/AmbientBackdrop";
import LandingNav from "../components/landing/LandingNav";
import MarketingSections from "../components/landing/MarketingSections";
import PricingCards from "../components/subscription/PricingCards";
import TrustRibbon from "../components/trust/TrustRibbon";
import QuantAITransparencySection from "../components/trust/QuantAITransparencySection";
import DeferredBelowFold from "../components/home/DeferredBelowFold";
import SearchStreamRibbon from "../components/loading/SearchStreamRibbon";
import { useCockpit } from "../components/cockpit/cockpitContext";
import { useCopilotSession } from "../components/copilot/CopilotContext";
import { calculateAIScore } from "./api/search/lib/aiScoring";
import ProductResultsSurface from "../components/search/ProductResultsSurface";
import HeroSearchCommand from "../components/search/HeroSearchCommand";
import {
  applyResultsFilters,
  countActiveFilters,
  defaultResultsFilters,
} from "@/lib/resultsFilters";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { SearchEntitlementsDTO } from "@/lib/subscription/entitlements";
import type { QuantPlanTier } from "@/lib/subscription/plans";
import type { DealClusterDTO } from "@/lib/deals/types";
import { buildDealIntelByLink } from "@/lib/intelligence/dealIntelligenceEngine";
import { parseCommerceSearchIntents } from "@/lib/intelligence/searchIntentV2";
import { sortByVerifiedDealRank } from "@/lib/intelligence/discountRank";
import {
  dedupeSearchTray,
  sortByCompositeRankEnhanced,
} from "@/lib/intelligence/searchRankEnhance";
import {
  getStoreTrustScore,
  sortByBestAIScore,
  sortByTrust,
  type QuantProduct,
} from "@/lib/shoppingScore";
import {
  quantProductFromSavedRow,
  type SavedProductAPIRow,
} from "@/lib/commerce/quantProductFromSaved";
import { QuantAnalyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";
import { apiErrorText, isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";
import { logDevError } from "@/lib/log/devLog";
import { toCopilotProductBrief } from "@/lib/copilot/mapProduct";
import type { CopilotSessionPayload } from "@/lib/copilot/sessionTypes";
import { appendLocalRecentSearch, readLocalSignals, recordInterestTag } from "@/lib/personalization/localSignals";
import { HERO_INPUT_PLACEHOLDERS, HERO_SEARCH_PROMPTS } from "@/lib/search/heroPrompts";
import { useMobilePerf } from "@/lib/hooks/useMobilePerf";
import { useReducedMotion, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

/** Deterministic SSR + first client paint — no localStorage; must match hydration. */
const SSR_HERO_HINT_SEED: readonly string[] = HERO_SEARCH_PROMPTS;

function mergeHeroTrayHints(): string[] {
  const recent = readLocalSignals().recentSearches.slice(0, 8);
  const merged = [...recent, ...HERO_SEARCH_PROMPTS];
  const seen = new Set<string>();
  return merged.filter((x) => {
    const t = x.trim();
    if (!t) return false;
    const k = t.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 18);
}

export default function Home() {
  const { isSignedIn } = useUser();
  const mobilePerf = useMobilePerf();
  const reduceHeroMotion = useReducedMotion();
  const { registerPrimarySearch, pulseIntelligence } = useCockpit();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<QuantProduct[]>([]);
  const [dealClusters, setDealClusters] = useState<DealClusterDTO[]>([]);
  const [searchIntelligence, setSearchIntelligence] = useState<SearchIntelligenceDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("value");
  const [filters, setFilters] = useState(defaultResultsFilters());
  const [saved, setSaved] = useState<QuantProduct[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [resultsKey, setResultsKey] = useState(0);
  const [subscriptionTier, setSubscriptionTier] = useState<QuantPlanTier | null>(null);
  const [searchEntitlements, setSearchEntitlements] = useState<SearchEntitlementsDTO | null>(null);
  const [compareTrayLinks, setCompareTrayLinks] = useState<string[]>([]);
  const [heroHintOptions, setHeroHintOptions] = useState<string[]>(() => [...SSR_HERO_HINT_SEED]);
  const bootedSearchFromUrl = useRef(false);
  const searchAbortRef = useRef<AbortController | null>(null);
  /** Skip duplicate in-flight requests for the same trimmed query (double-submit / double-tap). */
  const searchInflightQueryRef = useRef<string | null>(null);
  const [heroPlaceholderIdx, setHeroPlaceholderIdx] = useState(0);
  const [submitPulse, setSubmitPulse] = useState(false);
  const submitPulseTimerRef = useRef<number | null>(null);
  const { setSession: setCopilotSession } = useCopilotSession();

  const savedLinks = useMemo(
    () => new Set(saved.map((s) => s.link)),
    [saved]
  );

  const refreshSavedFromServer = useCallback(async () => {
    try {
      const res = await fetch("/api/intelligence/saved-products", { credentials: "same-origin" });
      const parsed = await readApiJson<{ items?: SavedProductAPIRow[] }>(res);
      const body = parsed.data;
      if (isApiFailure(parsed) || !body) return;
      startTransition(() => setSaved((body.items ?? []).map(quantProductFromSavedRow)));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    void refreshSavedFromServer();
  }, [isSignedIn, refreshSavedFromServer]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q")?.trim();
    if (q) startTransition(() => setQuery(q));
  }, []);

  useEffect(() => {
    if (!isSignedIn || bootedSearchFromUrl.current) return;
    const q = new URLSearchParams(window.location.search).get("q")?.trim();
    if (!q) return;
    bootedSearchFromUrl.current = true;
    startTransition(() => setQuery(q));
    void search(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once when auth resolves
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn) {
      startTransition(() => {
        setSubscriptionTier(null);
        setSearchEntitlements(null);
        setSaved([]);
      });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/billing/subscription", { credentials: "same-origin" });
        const parsed = await readApiJson<{
          tier?: string;
          entitlements?: SearchEntitlementsDTO;
        }>(res);
        if (cancelled || isApiFailure(parsed) || !parsed.data) return;
        const data = parsed.data;
        if (typeof data.tier === "string") {
          setSubscriptionTier(data.tier as QuantPlanTier);
        }
        if (data.entitlements && typeof data.entitlements === "object") {
          setSearchEntitlements(data.entitlements);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  useEffect(() => {
    if (mobilePerf || loading || !searchIntelligence) return;
    pulseIntelligence();
  }, [mobilePerf, loading, searchIntelligence, pulseIntelligence]);

  const sortedProductsMemo = useMemo(() => {
    const filteredForSort = dedupeSearchTray(applyResultsFilters(products, filters));
    const sortedList = [...filteredForSort];
    switch (sort) {
      case "ai":
        return sortByBestAIScore(sortedList);
      case "cheap":
        sortedList.sort((a, b) => a.price - b.price);
        return sortedList;
      case "trust":
        return sortByTrust(sortedList);
      case "deals":
        return sortByVerifiedDealRank(sortedList, query);
      case "value":
      default:
        return sortByCompositeRankEnhanced(sortedList, query);
    }
  }, [products, filters, sort, query]);

  const dealIntelByLink = useMemo(() => {
    const intents = parseCommerceSearchIntents(query);
    return buildDealIntelByLink(sortedProductsMemo, intents);
  }, [sortedProductsMemo, query]);

  const searchIntelHeadline = searchIntelligence?.finalHeadline;
  const searchIntelBody = searchIntelligence?.finalBody;

  const homeCopilotSession = useMemo((): CopilotSessionPayload => {
    return {
      route: "home",
      lastSearchQuery: query,
      products: sortedProductsMemo.map((p) => toCopilotProductBrief(p, dealIntelByLink.get(p.link))),
      savedSummaries: saved.map((s) => ({
        title: s.title,
        link: s.link,
        price: s.price,
      })),
      watchlistSummaries: [],
      compareTrayLinks,
      subscriptionTier: subscriptionTier ?? "free",
      entitlementsLevel: searchEntitlements?.intelligenceLevel,
      memoryHints: [`sort:${sort}`],
      searchIntelligenceExcerpt:
        searchIntelHeadline != null || searchIntelBody != null
          ? { finalHeadline: searchIntelHeadline, finalBody: searchIntelBody }
          : null,
      recentCompareHistory: [],
    };
  }, [
    query,
    sortedProductsMemo,
    dealIntelByLink,
    saved,
    compareTrayLinks,
    subscriptionTier,
    searchEntitlements?.intelligenceLevel,
    sort,
    searchIntelHeadline,
    searchIntelBody,
  ]);

  useEffect(() => {
    setCopilotSession(homeCopilotSession);
  }, [homeCopilotSession, setCopilotSession]);

  const sortedProducts = sortedProductsMemo;

  const activeFilterCount = countActiveFilters(filters);

  async function search(overrideQuery?: string) {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;

    if (loading && searchInflightQueryRef.current === q) return;
    searchInflightQueryRef.current = q;

    if (overrideQuery != null) {
      setQuery(overrideQuery);
    }

    searchAbortRef.current?.abort();
    const ac = new AbortController();
    searchAbortRef.current = ac;

    setResultsKey((k) => k + 1);
    setFilters(defaultResultsFilters());
    trackEvent(QuantAnalyticsEvents.SEARCH_RUN, { queryLength: q.length });
    setLoading(true);
    setSearchError(null);

    if (submitPulseTimerRef.current != null) {
      window.clearTimeout(submitPulseTimerRef.current);
      submitPulseTimerRef.current = null;
    }
    setSubmitPulse(true);
    submitPulseTimerRef.current = window.setTimeout(() => {
      setSubmitPulse(false);
      submitPulseTimerRef.current = null;
    }, 580);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}`,
        { credentials: "same-origin", signal: ac.signal }
      );
      type SearchRoot = {
        success?: boolean;
        data?: {
          products?: QuantProduct[];
          dealClusters?: DealClusterDTO[];
          searchIntelligence?: SearchIntelligenceDTO | null;
          entitlements?: SearchEntitlementsDTO;
          meta?: Record<string, unknown>;
        };
        message?: string;
        error?: string;
        retryAfter?: number;
        code?: string;
        entitlements?: SearchEntitlementsDTO;
      };
      const parsed = await readApiJson<SearchRoot>(res);
      const root = parsed.data;
      const searchData =
        root && typeof root === "object" && root.data && typeof root.data === "object"
          ? root.data
          : null;

      if (searchAbortRef.current !== ac) return;

      if (res.status === 401) {
        setSearchError(apiErrorText(parsed, "Please sign in to search."));
        trackEvent(QuantAnalyticsEvents.SEARCH_ERROR, { code: "unauthorized" });
        return;
      }

      if (res.status === 429) {
        const wait =
          root && typeof root.retryAfter === "number"
            ? ` Retry in ~${root.retryAfter}s.`
            : "";
        setSearchError(apiErrorText(parsed, "Too many searches.") + wait);
        const ent429 = root?.entitlements;
        if (ent429) setSearchEntitlements(ent429);
        trackEvent(QuantAnalyticsEvents.SEARCH_ERROR, { code: "rate_limit" });
        return;
      }

      if (!res.ok || isApiFailure(parsed)) {
        setSearchError(apiErrorText(parsed, "Search failed. Try again."));
        trackEvent(QuantAnalyticsEvents.SEARCH_ERROR, { code: "http", status: res.status });
        return;
      }

      if (searchData?.products && searchData.products.length > 0) {
        setProducts(searchData.products);
        setDealClusters(
          Array.isArray(searchData.dealClusters) ? searchData.dealClusters : []
        );
        setSearchIntelligence(
          searchData.searchIntelligence && typeof searchData.searchIntelligence === "object"
            ? searchData.searchIntelligence
            : null
        );
        if (searchData.entitlements) {
          setSearchEntitlements(searchData.entitlements);
          if (searchData.entitlements.tier) setSubscriptionTier(searchData.entitlements.tier);
        }
        appendLocalRecentSearch(q);
        void refreshSavedFromServer();
        setHeroHintOptions(mergeHeroTrayHints());
        trackEvent(QuantAnalyticsEvents.SEARCH_SUCCESS, {
          resultCount: searchData.products.length,
        });
      } else {
        setProducts([]);
        setDealClusters([]);
        setSearchIntelligence(null);
        setSearchError("No products found for this query.");
        trackEvent(QuantAnalyticsEvents.SEARCH_ERROR, { code: "empty" });
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setSearchError("Search failed. Check your connection and try again.");
      logDevError("search", e);
      trackEvent(QuantAnalyticsEvents.SEARCH_ERROR, { code: "exception" });
    } finally {
      if (searchAbortRef.current === ac) {
        setLoading(false);
      }
    }
  }

  const searchRef = useRef(search);
  searchRef.current = search;

  useEffect(() => {
    const handler = (ev: Event) => {
      const ce = ev as CustomEvent<{ q?: string }>;
      const qq = ce.detail?.q;
      if (typeof qq === "string" && qq.trim()) void searchRef.current(qq.trim());
    };
    window.addEventListener("quantai:try-search", handler);
    return () => window.removeEventListener("quantai:try-search", handler);
  }, []);

  useEffect(() => {
    // Client-only: merge recent tray memory into hero hints after hydration (initial state matches SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeroHintOptions(mergeHeroTrayHints());
    const id = window.setInterval(() => {
      setHeroPlaceholderIdx((i) => (i + 1) % HERO_INPUT_PLACEHOLDERS.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, []);

  async function saveProduct(product: QuantProduct) {
    if (!isSignedIn) {
      setSearchError("Sign in to save products to your account.");
      return;
    }

    if (saved.some((p) => p.link === product.link)) {
      return;
    }

    const aiScore =
      product.qiComposite != null && Number.isFinite(product.qiComposite)
        ? product.qiComposite
        : calculateAIScore(product, sortedProducts).score;

    setSaved([...saved, product]);

    try {
      const res = await fetch("/api/search/save-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          product_id: product.id,
          title: product.title,
          price: product.price,
          image: product.image,
          link: product.link,
          ai_score: aiScore,
        }),
      });

      const parsed = await readApiJson<{ error?: string; code?: string }>(res);
      if (!res.ok || isApiFailure(parsed)) {
        const data = parsed.data;
        const msg =
          data?.code === "PLAN_SAVED_LIMIT"
            ? `${apiErrorText(parsed, "Saved limit reached.")} Upgrade on the pricing page.`
            : apiErrorText(parsed, "Could not save this product.");
        setSearchError(msg);
        setSaved(saved.filter((p) => p.link !== product.link));
        trackEvent(QuantAnalyticsEvents.PRODUCT_SAVE_FAIL, {
          code: data?.code ?? "unknown",
        });
      } else {
        trackEvent(QuantAnalyticsEvents.PRODUCT_SAVE, { link: product.link });
        recordInterestTag("saved");
      }
    } catch (e) {
      logDevError("saveProduct", e);
      setSearchError("Could not save this product.");
      setSaved(saved.filter((p) => p.link !== product.link));
      trackEvent(QuantAnalyticsEvents.PRODUCT_SAVE_FAIL, { code: "exception" });
    }
  }

  async function removeSavedProduct(link: string) {
    if (!isSignedIn) return;
    setSaved((prev) => prev.filter((p) => p.link !== link));
    try {
      const res = await fetch(
        `/api/intelligence/saved-products?link=${encodeURIComponent(link)}`,
        { method: "DELETE", credentials: "same-origin" }
      );
      if (!res.ok) {
        await refreshSavedFromServer();
      } else {
        trackEvent(QuantAnalyticsEvents.PRODUCT_REMOVE_SAVE, { link });
      }
    } catch {
      await refreshSavedFromServer();
    }
  }

  async function addToWatchlist(product: QuantProduct) {
    if (!isSignedIn) {
      setSearchError("Sign in to use the watchlist foundation.");
      return;
    }
    try {
      const res = await fetch("/api/intelligence/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          product: {
            title: product.title,
            link: product.link,
            price: product.price,
            store: product.store,
            image: product.image,
            qiComposite: product.qiComposite,
            watchBaseline: {
              capturedAt: new Date().toISOString(),
              listingPrice: product.price,
              trustPrior: getStoreTrustScore(product.store),
              qiComposite: product.qiComposite ?? null,
            },
          },
          targetPrice: null,
        }),
      });
      const parsed = await readApiJson<{ error?: string; duplicate?: boolean; code?: string }>(
        res
      );
      const data = parsed.data;
      if (!res.ok || isApiFailure(parsed)) {
        setSearchError(
          data?.code === "PLAN_WATCHLIST_LIMIT"
            ? `${apiErrorText(parsed, "Watchlist limit reached.")} See pricing to upgrade.`
            : apiErrorText(parsed, "Watchlist is not available yet.")
        );
        trackEvent(QuantAnalyticsEvents.WATCHLIST_ADD_FAIL, {
          code: data?.code ?? "http",
        });
        return;
      }
      if (data?.duplicate) {
        setSearchError(null);
        return;
      }
      setSearchError(null);
      trackEvent(QuantAnalyticsEvents.WATCHLIST_ADD, { link: product.link });
    } catch {
      setSearchError("Could not add to watchlist.");
      trackEvent(QuantAnalyticsEvents.WATCHLIST_ADD_FAIL, { code: "exception" });
    }
  }

  const glassCard = "cockpit-glass-card";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#020617] text-slate-100">
      <AmbientBackdrop lite={mobilePerf} />

      <div className="relative z-10">
        <LandingNav />

        {/* Hero */}
        <section
          className={`relative px-4 sm:px-6 ${
            products.length > 0 ? "pt-14 pb-16 sm:pt-16 sm:pb-20" : "pt-16 pb-28 sm:pt-20 sm:pb-36"
          }`}
        >
          <div className="mx-auto max-w-7xl text-center">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300/95 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.5)] backdrop-blur-xl motion-safe:animate-[fadeIn_0.6s_ease-out]">
              <span className="relative flex size-1.5 rounded-full bg-emerald-400/90 shadow-[0_0_8px_rgba(52,211,153,0.45)]">
                <span className="absolute inset-0 motion-reduce:animate-none animate-ping rounded-full bg-emerald-400/25" />
              </span>
              Live shopping intelligence
            </div>

            <h1 className="cockpit-display mt-12 text-[2.55rem] font-bold leading-[1.06] sm:text-5xl lg:text-[3.55rem] text-white motion-safe:animate-[fadeIn_0.65s_ease-out]">
              <span className="block text-white">Search in plain language. Buy with confidence.</span>
              <span className="mt-4 block cockpit-gradient-text font-bold tracking-[-0.04em]">
                QuantAI turns messy shopping searches into ranked buying decisions.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-[15px] font-semibold leading-snug tracking-[-0.02em] text-slate-200/95 sm:text-[16px] motion-safe:animate-[fadeIn_0.66s_ease-out]">
              Built to surface sharper buying decisions than ordinary search—live listings, ranked for trust and
              value.
            </p>

            <p className="cockpit-body mx-auto mt-5 max-w-2xl text-[15px] sm:text-[16px] text-slate-400/95 motion-safe:animate-[fadeIn_0.7s_ease-out]">
              Ask for any product, budget, store, risk, or discount. QuantAI reads product, budget, trust, and deal
              intent in one calm scan.
            </p>

            {/* Search — hero instrument */}
            <motion.div
              className="cockpit-search-aurora cockpit-search-aurora--premium hero-search-instrument mx-auto mt-10 max-w-3xl sm:mt-14 sm:max-w-[52rem] motion-safe:animate-[fadeIn_0.75s_ease-out] rounded-[1.5rem] p-px shadow-[0_36px_100px_-48px_rgba(15,23,42,0.92),0_0_80px_-48px_rgba(34,211,238,0.12)]"
              data-loading={loading ? "true" : "false"}
              animate={
                reduceHeroMotion || mobilePerf
                  ? undefined
                  : { opacity: loading ? 1 : [0.94, 1, 0.97, 1] }
              }
              transition={
                reduceHeroMotion || mobilePerf || loading
                  ? undefined
                  : { duration: 6.2, repeat: Infinity, ease: "easeInOut" }
              }
            >
              <div className="hero-search-shell relative rounded-[1.45rem] border border-white/[0.08] bg-[#040b16]/94 px-3.5 py-5 sm:p-6 backdrop-blur-[40px]">
                {loading && !mobilePerf && (
                  <div
                    className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_200deg_at_50%_50%,transparent_0deg,rgba(34,211,238,0.05)_130deg,transparent_260deg)] motion-reduce:animate-none animate-spin opacity-35"
                    style={{ animationDuration: "6.5s" }}
                    aria-hidden
                  />
                )}
                <HeroSearchCommand
                  query={query}
                  onQueryChange={setQuery}
                  onSubmit={() => void search()}
                  onSubmitPreset={(preset) => void search(preset)}
                  loading={loading}
                  submitPulse={submitPulse}
                  placeholder={HERO_INPUT_PLACEHOLDERS[heroPlaceholderIdx] ?? HERO_INPUT_PLACEHOLDERS[0]}
                  hintOptions={heroHintOptions}
                  registerInput={registerPrimarySearch}
                  mobilePerf={mobilePerf}
                />

                <div className="relative z-[1] mt-6 min-h-[4rem] sm:mt-7 sm:min-h-[3.75rem]">
                  {loading ? (
                    <div className="max-w-2xl">
                      <SearchStreamRibbon active={loading} />
                    </div>
                  ) : (
                    <p className="px-0.5 text-left text-[12px] font-normal leading-relaxed tracking-[-0.01em] text-slate-500/88">
                      Your ranked tray and reasoning appear below. Compare pins stay put while you refine the search.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {searchError && !loading && (
              <p
                role="alert"
                className="mx-auto mt-8 max-w-lg rounded-2xl border border-amber-400/25 bg-amber-500/[0.08] px-4 py-3 text-center text-sm font-medium text-amber-100/95 backdrop-blur-md"
              >
                {searchError}
              </p>
            )}

            {!isSignedIn && (
              <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 backdrop-blur-md sm:flex-row sm:justify-center">
                <p className="text-center text-sm font-normal text-slate-400">
                  Sign in to run live search, save products, and sync your tray.
                </p>
                <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                  <button
                    type="button"
                    className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    Sign in
                  </button>
                </SignInButton>
              </div>
            )}
          </div>
        </section>

        {saved.length > 0 && (
          <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-6 space-y-6">
            <section className={`${glassCard} p-6 sm:p-8`}>
                <div className="flex items-center justify-between gap-4 mb-6">
                  <h2 className="text-lg font-semibold tracking-tight text-white/95">
                    Saved products
                  </h2>
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Synced account
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {saved.map((item) => (
                    <div
                      key={item.link}
                      className="group flex flex-col rounded-2xl border border-white/[0.06] bg-black/25 p-4 transition hover:border-cyan-400/20 hover:shadow-[0_20px_50px_-28px_rgba(34,211,238,0.12)] sm:flex-row sm:items-center sm:gap-4"
                    >
                      {item.image && (
                        <div className="relative mx-auto size-20 shrink-0 overflow-hidden rounded-xl bg-white sm:mx-0">
                          <Image
                            src={item.image}
                            alt=""
                            fill
                            sizes="80px"
                            className="object-contain p-2"
                            unoptimized
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 text-center sm:text-left">
                        <p className="font-medium text-white/90 line-clamp-2">{item.title}</p>
                        <p className="mt-1 text-lg font-semibold text-emerald-300/90">
                          €{item.price}
                        </p>
                        <p className="text-xs text-slate-500">{item.store}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap justify-center gap-2 sm:mt-0 sm:flex-col sm:justify-end">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-100"
                        >
                          View
                        </a>
                        <button
                          type="button"
                          onClick={() => void removeSavedProduct(item.link)}
                          className="min-h-11 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-rose-200/90 transition hover:bg-rose-500/10"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
          </div>
        )}

        {(loading ||
          products.length > 0 ||
          (searchError != null && !loading)) && (
          <ProductResultsSurface
            products={products}
            sortedProducts={sortedProducts}
            dealClusters={dealClusters}
            searchIntelligence={searchIntelligence}
            intelligenceLevel={
              searchEntitlements?.intelligenceLevel ?? (isSignedIn ? "summary" : "full")
            }
            loading={loading}
            sort={sort}
            setSort={setSort}
            filters={filters}
            setFilters={setFilters}
            activeFilterCount={activeFilterCount}
            onClearFilters={() => setFilters(defaultResultsFilters())}
            saveProduct={saveProduct}
            savedLinks={savedLinks}
            resultsKey={resultsKey}
            searchError={searchError}
            addToWatchlist={addToWatchlist}
            searchQuery={query}
            onRetrySearch={() => void search()}
            onCompareTrayChange={setCompareTrayLinks}
            dealIntelByLink={dealIntelByLink}
            onRunRelatedQuery={(q) => void search(q)}
          />
        )}

        <DeferredBelowFold>
          <MarketingSections />

          {/* Pricing */}
          <section
            id="pricing"
            className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28 scroll-mt-24 border-t border-white/[0.06]"
          >
          <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-300/80 mb-4">
              QuantAI plans
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white/95">
              Intelligence that keeps pace with you
            </h2>
            <p className="cockpit-body mt-4 text-base text-slate-500">
              Start where you are—move up when you want more runway and a deeper read on every scan.
            </p>
            <Link
              href="/pricing"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-cyan-300 hover:text-cyan-200"
            >
              Open full pricing page
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <PricingCards currentTier={subscriptionTier} />

        </section>

        <div className="mx-auto w-full min-w-0 max-w-6xl px-4 sm:px-6 pb-8">
          <QuantAITransparencySection />
          <TrustRibbon />
        </div>
        </DeferredBelowFold>

        <footer className="border-t border-white/[0.06] py-10 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
            <Link href="/pricing" className="hover:text-cyan-300">
              Pricing
            </Link>
            <Link href="/dashboard" className="hover:text-cyan-300">
              Dashboard
            </Link>
            <Link href="/#how-it-works" className="hover:text-cyan-300">
              How it works
            </Link>
            <Link href="/billing" className="hover:text-cyan-300">
              Billing
            </Link>
          </div>
          <p className="mt-6 text-xs font-medium text-slate-600">
            © {new Date().getFullYear()} QuantAI · Shopping intelligence, not financial advice.
          </p>
          <p className="cockpit-body mx-auto mt-2 w-full min-w-0 max-w-xl px-4 text-[11px] leading-relaxed text-slate-600/85 [overflow-wrap:anywhere]">
            Outputs are probabilistic—treat every score as decision support, not a guarantee. Verify listings before
            you pay.
          </p>
        </footer>
      </div>
    </main>
  );
}

