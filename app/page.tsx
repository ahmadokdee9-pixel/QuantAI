"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SignInButton, useUser } from "@clerk/nextjs";
import LandingNav from "../components/landing/LandingNav";
import PricingCards from "../components/subscription/PricingCards";
import DeferredBelowFold from "../components/home/DeferredBelowFold";
import HeroAmbientField from "../components/home/HeroAmbientField";
import HeroIntelligenceCanvas from "../components/home/HeroIntelligenceCanvas";
import CommandSidebar from "../components/layout/CommandSidebar";
import LivingIntelligencePresence from "../components/home/LivingIntelligencePresence";
import GlobalCommerceIntelligenceNetwork from "../components/home/GlobalCommerceIntelligenceNetwork";
import RetailerMarquee from "../components/home/RetailerMarquee";
import SearchStreamRibbon from "../components/loading/SearchStreamRibbon";
import SearchSignalCapsule from "@/components/system/SearchSignalCapsule";
import ActionFeedbackBanner, {
  type ActionFeedbackTone,
} from "@/components/system/ActionFeedbackBanner";
import { useCockpit } from "../components/cockpit/cockpitContext";
import { useCopilotSession } from "../components/copilot/CopilotContext";
import { calculateAIScore } from "./api/search/lib/aiScoring";
import ProductResultsSurface from "../components/search/ProductResultsSurface";
import HeroSearchCommand from "../components/search/HeroSearchCommand";
import DomainDecisionIndicator from "../components/search/DomainDecisionIndicator";
import UniversalDecisionCard from "../components/search/UniversalDecisionCard";
import DecisionUpdatesPanel from "@/components/decisionMemory/DecisionUpdatesPanel";
import {
  buildDecisionWriteFromUniversal,
  loadLivingDecisionThread,
  persistDecisionEpisode,
  persistDecisionWatch,
} from "@/lib/decisionMemory/recordClient";
import { classifyDecisionDomain } from "@/lib/universalDecision/router";
import type { DecisionDomain, UniversalDecision } from "@/lib/universalDecision/types";
import type { LivingDecisionThread } from "@/lib/livingDecision/types";
import EnterpriseFooter from "../components/layout/EnterpriseFooter";
import TrustRibbon from "@/components/trust/TrustRibbon";
import { INSTITUTIONAL, resolveInstitutionalState } from "../lib/ui/systemStateLanguage";
import {
  applyResultsFilters,
  countActiveFilters,
  defaultResultsFilters,
} from "@/lib/resultsFilters";
import {
  dedupeSearchTray,
} from "@/lib/intelligence/searchRankEnhance";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { SearchEntitlementsDTO } from "@/lib/subscription/entitlements";
import type { QuantPlanTier } from "@/lib/subscription/plans";
import type { DealClusterDTO } from "@/lib/deals/types";
import { buildDealIntelByLink } from "@/lib/intelligence/dealIntelligenceEngine";
import { extractHumanSearchIntent } from "@/lib/intelligence/searchIntentBrain";
import { loadMarketMemory, recordTrayPriceSnapshots } from "@/lib/intelligence/marketMemory";
import { parseCommerceSearchIntents } from "@/lib/intelligence/searchIntentV2";
import { sortByVerifiedDealRank } from "@/lib/intelligence/discountRank";
import { filterRecommendationTray } from "@/lib/ui/listingOutlierFilter";
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
import { parseSearchResponse } from "@/lib/api/parseSearchResponse";
import { readApiJson } from "@/lib/api/readJson";
import {
  readCommerceSessionMemoryFromBrowser,
  writeCommerceSessionMemoryToBrowser,
} from "@/lib/intelligence/commerceSessionStorage";
import { logDevError } from "@/lib/log/devLog";
import { toCopilotProductBrief } from "@/lib/copilot/mapProduct";
import type { CopilotSessionPayload } from "@/lib/copilot/sessionTypes";
import { appendLocalRecentSearch, readLocalSignals, recordInterestTag } from "@/lib/personalization/localSignals";
import { HERO_INPUT_PLACEHOLDERS, HERO_SEARCH_PROMPTS } from "@/lib/search/heroPrompts";
import { clientThrottleMessage, createClientSearchThrottle } from "@/lib/search/clientSearchThrottle";
import { useMobilePerf } from "@/lib/hooks/useMobilePerf";
import { ArrowRight } from "lucide-react";

/** Deterministic SSR + first client paint â€” no localStorage; must match hydration. */
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
  const { registerPrimarySearch, pulseIntelligence } = useCockpit();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<QuantProduct[]>([]);
  const [dealClusters, setDealClusters] = useState<DealClusterDTO[]>([]);
  const [searchIntelligence, setSearchIntelligence] = useState<SearchIntelligenceDTO | null>(null);
  const [searchMeta, setSearchMeta] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("value");
  const [filters, setFilters] = useState(defaultResultsFilters());
  const [saved, setSaved] = useState<QuantProduct[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  /** Save/watchlist notices — must not reuse searchError (hero capsule treats that as search failure). */
  const [actionNotice, setActionNotice] = useState<{
    message: string;
    tone: ActionFeedbackTone;
    onRetry?: () => void;
  } | null>(null);
  const [actionBusy, setActionBusy] = useState<"save" | "remove" | "watchlist" | null>(null);
  const [resultsKey, setResultsKey] = useState(0);
  const [marketMemoryTick, setMarketMemoryTick] = useState(0);
  const [subscriptionTier, setSubscriptionTier] = useState<QuantPlanTier | null>(null);
  const [searchEntitlements, setSearchEntitlements] = useState<SearchEntitlementsDTO | null>(null);
  const [compareTrayLinks, setCompareTrayLinks] = useState<string[]>([]);
  const [forcedDomain, setForcedDomain] = useState<DecisionDomain | null>(null);
  const [detectedDomain, setDetectedDomain] = useState<DecisionDomain | null>(null);
  const [domainConfidence, setDomainConfidence] = useState<number | null>(null);
  const [domainClarify, setDomainClarify] = useState<string | null>(null);
  const [universalDecision, setUniversalDecision] = useState<UniversalDecision | null>(null);
  const [watchingUniversal, setWatchingUniversal] = useState(false);
  const [livingPresenceEpoch, setLivingPresenceEpoch] = useState(0);
  const [universalLivingThread, setUniversalLivingThread] = useState<LivingDecisionThread | null>(
    null
  );
  const enabledDomains: DecisionDomain[] = ["product", "flight", "hotel", "subscription"];
  const [heroHintOptions, setHeroHintOptions] = useState<string[]>(() => [...SSR_HERO_HINT_SEED]);
  const bootedSearchFromUrl = useRef(false);
  const searchAbortRef = useRef<AbortController | null>(null);
  /** Skip duplicate in-flight requests for the same trimmed query (double-submit / double-tap). */
  const searchInflightQueryRef = useRef<string | null>(null);
  const clientSearchThrottleRef = useRef(createClientSearchThrottle());
  const [heroPlaceholderIdx, setHeroPlaceholderIdx] = useState(0);
  const [submitPulse, setSubmitPulse] = useState(false);
  const submitPulseTimerRef = useRef<number | null>(null);
  const { setSession: setCopilotSession } = useCopilotSession();

  const savedLinks = useMemo(
    () => new Set(saved.map((s) => s.link)),
    [saved]
  );

  const clearActionNotice = useCallback(() => setActionNotice(null), []);

  useEffect(() => {
    if (!actionNotice || actionNotice.tone !== "success") return;
    const id = window.setTimeout(() => setActionNotice(null), 5200);
    return () => window.clearTimeout(id);
  }, [actionNotice]);

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
    void search(q, { bypassClientThrottle: true });
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
    if (sort === "value" || !sort) {
      return applyResultsFilters(products, filters);
    }

    const filteredForSort = dedupeSearchTray(applyResultsFilters(products, filters));
    const sortedList = [...filteredForSort];
    let ranked: QuantProduct[];
    switch (sort) {
      case "ai":
        ranked = sortByBestAIScore(sortedList);
        break;
      case "cheap":
        sortedList.sort((a, b) => a.price - b.price);
        ranked = sortedList;
        break;
      case "trust":
        ranked = sortByTrust(sortedList);
        break;
      case "deals":
        ranked = sortByVerifiedDealRank(sortedList, query);
        break;
      default:
        ranked = filteredForSort;
    }
    return filterRecommendationTray(ranked);
  }, [products, filters, sort, query]);

  useEffect(() => {
    if (sortedProductsMemo.length === 0) return;
    if (typeof window === "undefined") return;
    recordTrayPriceSnapshots(sortedProductsMemo, query);
    const id = window.setTimeout(() => setMarketMemoryTick((n) => n + 1), 0);
    return () => window.clearTimeout(id);
  }, [sortedProductsMemo, query, resultsKey]);

  const marketMemoryState = useMemo(() => {
    void marketMemoryTick;
    void resultsKey;
    void query;
    if (typeof window === "undefined") return null;
    return loadMarketMemory();
  }, [marketMemoryTick, query, resultsKey]);

  const dealIntelByLink = useMemo(() => {
    const intents = parseCommerceSearchIntents(query);
    const human = query.trim() ? extractHumanSearchIntent(query) : null;
    return buildDealIntelByLink(sortedProductsMemo, intents, human ?? undefined, marketMemoryState ?? undefined);
  }, [sortedProductsMemo, query, marketMemoryState]);

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

  async function search(
    overrideQuery?: string,
    opts?: { bypassClientThrottle?: boolean; forcedDomain?: DecisionDomain | null }
  ) {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;

    if (!opts?.bypassClientThrottle) {
      const throttle = clientSearchThrottleRef.current.check();
      if (!throttle.allowed) {
        setSearchError(clientThrottleMessage(throttle.waitMs));
        trackEvent(QuantAnalyticsEvents.SEARCH_ERROR, { code: "client_throttle" });
        return;
      }
    }

    if (loading && searchInflightQueryRef.current === q) return;
    searchInflightQueryRef.current = q;

    if (overrideQuery != null) {
      setQuery(overrideQuery);
    }

    const domainForce =
      opts?.forcedDomain !== undefined ? opts.forcedDomain : forcedDomain;
    if (opts?.forcedDomain !== undefined) {
      setForcedDomain(opts.forcedDomain);
    }

    searchAbortRef.current?.abort();
    const ac = new AbortController();
    searchAbortRef.current = ac;

    setResultsKey((k) => k + 1);
    setFilters(defaultResultsFilters());
    trackEvent(QuantAnalyticsEvents.SEARCH_RUN, { queryLength: q.length });
    setLoading(true);
    setSearchError(null);
    setActionNotice(null);
    setUniversalDecision(null);
    setWatchingUniversal(false);
    setUniversalLivingThread(null);
    setDomainClarify(null);

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

    const classification = classifyDecisionDomain(q, { forcedDomain: domainForce });
    setDetectedDomain(classification.domain);
    setDomainConfidence(classification.confidence);

    if (classification.needsClarification && !domainForce) {
      setDomainClarify(classification.clarifyingQuestion);
      setProducts([]);
      setDealClusters([]);
      setSearchIntelligence(null);
      setSearchMeta(null);
      setLoading(false);
      searchInflightQueryRef.current = "";
      return;
    }

    // Non-product domains → universal decision API (real providers only).
    if (classification.domain !== "product") {
      try {
        const res = await fetch("/api/decision/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Requested-With": "quantai-web",
          },
          credentials: "same-origin",
          signal: ac.signal,
          body: JSON.stringify({
            query: q,
            forcedDomain: domainForce || classification.domain,
          }),
        });
        const parsed = await readApiJson<{
          success?: boolean;
          decision?: UniversalDecision | null;
          routedToProductPipeline?: boolean;
          classification?: { clarifyingQuestion?: string | null; needsClarification?: boolean };
        }>(res);
        if (searchAbortRef.current !== ac) return;

        const payload = parsed.data || {};

        if (payload.routedToProductPipeline) {
          // Fall through to product search below.
        } else if (payload.classification?.needsClarification) {
          setDomainClarify(payload.classification.clarifyingQuestion || classification.clarifyingQuestion);
          setProducts([]);
          setLoading(false);
          searchInflightQueryRef.current = "";
          return;
        } else if (payload.decision) {
          setUniversalDecision(payload.decision);
          setProducts([]);
          setDealClusters([]);
          setSearchIntelligence(null);
          setSearchMeta({ domain: classification.domain, universal: true });
          setSearchError(null);
          appendLocalRecentSearch(q);
          setHeroHintOptions(mergeHeroTrayHints());
          const write = buildDecisionWriteFromUniversal(payload.decision);
          if (write) {
            void (async () => {
              await persistDecisionEpisode(write, { signedIn: Boolean(isSignedIn) });
              const thread = await loadLivingDecisionThread({
                productLink: write.productLink,
                decisionId: write.decisionId,
                signedIn: Boolean(isSignedIn),
              });
              setUniversalLivingThread(thread);
              setLivingPresenceEpoch((n) => n + 1);
            })();
          }
          trackEvent(QuantAnalyticsEvents.SEARCH_SUCCESS, {
            resultCount: payload.decision.candidates?.length ?? 0,
            domain: classification.domain,
          });
          setLoading(false);
          searchInflightQueryRef.current = "";
          return;
        } else if (!res.ok) {
          setSearchError(apiErrorText(parsed, "Decision provider unavailable."));
          setLoading(false);
          searchInflightQueryRef.current = "";
          return;
        }
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
        setSearchError("Decision run failed. Try again.");
        setLoading(false);
        searchInflightQueryRef.current = "";
        return;
      }
    }

    try {
      const commerceMemory = readCommerceSessionMemoryFromBrowser();
      const searchUrl = "/api/search";
      const res = await fetch(searchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "quantai-web",
        },
        credentials: "same-origin",
        signal: ac.signal,
        body: JSON.stringify({ query: q, commerceMemory }),
      });
      if (process.env.NODE_ENV === "development") {
        console.debug("[search] API response", {
          requestUrl: searchUrl,
          responseUrl: res.url,
          status: res.status,
          contentType: res.headers.get("content-type"),
        });
      }
      const parsed = await readApiJson(res);
      if (parsed.notJson) {
        console.error("[search] Non-JSON response", {
          status: parsed.status,
          contentType: parsed.contentType,
          redirected: parsed.redirected,
          responseUrl: parsed.responseUrl,
          snippet: parsed.responseTextSnippet,
        });
      }
      const { envelope: root, payload: searchData, products: trayProducts } =
        parseSearchResponse<QuantProduct>(parsed);

      if (searchAbortRef.current !== ac) return;

      if (res.status === 401) {
        setProducts([]);
        setSearchError(apiErrorText(parsed, "Sign in required for field access."));
        trackEvent(QuantAnalyticsEvents.SEARCH_ERROR, { code: "unauthorized" });
        return;
      }

      if (res.status === 429) {
        const wait =
          root && typeof root.retryAfter === "number"
            ? ` Retry in ~${root.retryAfter}s.`
            : "";
        setProducts([]);
        setSearchError(apiErrorText(parsed, INSTITUTIONAL.trayRecalibrating) + wait);
        const ent429 = root?.entitlements;
        if (ent429) setSearchEntitlements(ent429 as SearchEntitlementsDTO);
        trackEvent(QuantAnalyticsEvents.SEARCH_ERROR, { code: "rate_limit" });
        return;
      }

      if (trayProducts.length > 0 && searchData) {
        setProducts(trayProducts);
        setSearchError(null);
        setSearchMeta(searchData.meta && typeof searchData.meta === "object" ? searchData.meta : null);
        const mem = searchData.meta?.commerceSessionMemory;
        if (mem != null && typeof mem === "object") {
          writeCommerceSessionMemoryToBrowser(mem);
        }
        setDealClusters(Array.isArray(searchData.dealClusters) ? (searchData.dealClusters as DealClusterDTO[]) : []);
        setSearchIntelligence(
          searchData.searchIntelligence && typeof searchData.searchIntelligence === "object"
            ? (searchData.searchIntelligence as SearchIntelligenceDTO)
            : null
        );
        if (searchData.entitlements && typeof searchData.entitlements === "object") {
          const ent = searchData.entitlements as SearchEntitlementsDTO;
          setSearchEntitlements(ent);
          if (ent.tier) setSubscriptionTier(ent.tier);
        }
        appendLocalRecentSearch(q);
        void refreshSavedFromServer();
        setHeroHintOptions(mergeHeroTrayHints());
        setLivingPresenceEpoch((n) => n + 1);
        trackEvent(QuantAnalyticsEvents.SEARCH_SUCCESS, { resultCount: trayProducts.length });
        return;
      }

      if (!res.ok || isApiFailure(parsed)) {
        setProducts([]);
        setDealClusters([]);
        setSearchIntelligence(null);
        setSearchMeta(null);
        setSearchError(apiErrorText(parsed, INSTITUTIONAL.signalInstability));
        trackEvent(QuantAnalyticsEvents.SEARCH_ERROR, { code: "http", status: res.status });
        return;
      }

      setProducts([]);
      setDealClusters([]);
      setSearchIntelligence(null);
      const metaEmpty =
        searchData?.meta && typeof searchData.meta === "object" ? searchData.meta : null;
      setSearchMeta(metaEmpty);
      const trayExpl = metaEmpty?.trayExplanation as
        | { headline?: string; supporting?: string; hints?: string[] }
        | null
        | undefined;
      setSearchError(
        typeof trayExpl?.headline === "string" && trayExpl.headline.trim()
          ? trayExpl.headline.trim()
          : INSTITUTIONAL.insufficientClarity
      );
      trackEvent(QuantAnalyticsEvents.SEARCH_ERROR, { code: "empty" });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setProducts([]);
      setDealClusters([]);
      setSearchIntelligence(null);
      setSearchMeta(null);
      setSearchError(INSTITUTIONAL.retailerInterruption);
      logDevError("search", e);
      trackEvent(QuantAnalyticsEvents.SEARCH_ERROR, { code: "exception" });
    } finally {
      if (searchAbortRef.current === ac) {
        setLoading(false);
        searchInflightQueryRef.current = null;
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
      setActionNotice({
        message: "Sign in to anchor products to your memory shelf.",
        tone: "info",
      });
      return;
    }

    if (saved.some((p) => p.link === product.link)) {
      setActionNotice({
        message: "This listing is already on your memory shelf.",
        tone: "info",
      });
      return;
    }

    const aiScore =
      product.qiComposite != null && Number.isFinite(product.qiComposite)
        ? product.qiComposite
        : calculateAIScore(product, sortedProducts).score;

    const previousSaved = saved;
    setSaved([...saved, product]);
    setActionBusy("save");

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
            ? `${apiErrorText(parsed, "Memory shelf limit reached.")} Review access layers to elevate clearance.`
            : apiErrorText(parsed, "Could not anchor this product to memory shelf.");
        setActionNotice({
          message: msg,
          tone: "error",
          onRetry: () => void saveProduct(product),
        });
        setSaved(previousSaved);
        trackEvent(QuantAnalyticsEvents.PRODUCT_SAVE_FAIL, {
          code: data?.code ?? "unknown",
        });
      } else {
        setActionNotice({
          message: "Product anchored to memory shelf.",
          tone: "success",
        });
        trackEvent(QuantAnalyticsEvents.PRODUCT_SAVE, { link: product.link });
        recordInterestTag("saved");
      }
    } catch (e) {
      logDevError("saveProduct", e);
      setActionNotice({
        message: "Could not anchor this product to memory shelf.",
        tone: "error",
        onRetry: () => void saveProduct(product),
      });
      setSaved(previousSaved);
      trackEvent(QuantAnalyticsEvents.PRODUCT_SAVE_FAIL, { code: "exception" });
    } finally {
      setActionBusy(null);
    }
  }

  async function removeSavedProduct(link: string) {
    if (!isSignedIn) return;
    const previousSaved = saved;
    setSaved((prev) => prev.filter((p) => p.link !== link));
    setActionBusy("remove");
    try {
      const res = await fetch(
        `/api/intelligence/saved-products?link=${encodeURIComponent(link)}`,
        { method: "DELETE", credentials: "same-origin" }
      );
      const parsed = await readApiJson<{ error?: string }>(res);
      if (!res.ok || isApiFailure(parsed)) {
        setSaved(previousSaved);
        const msg = apiErrorText(parsed, "Anchor removal failed.");
        setActionNotice({
          message: msg,
          tone: "error",
          onRetry: () => void removeSavedProduct(link),
        });
        return;
      }
      setActionNotice({
        message: "Anchor released from memory shelf.",
        tone: "success",
      });
      trackEvent(QuantAnalyticsEvents.PRODUCT_REMOVE_SAVE, { link });
    } catch (e) {
      logDevError("removeSavedProduct", e);
      setSaved(previousSaved);
      setActionNotice({
        message: "Anchor removal failed.",
        tone: "error",
        onRetry: () => void removeSavedProduct(link),
      });
    } finally {
      setActionBusy(null);
    }
  }

  async function addToWatchlist(product: QuantProduct) {
    if (!isSignedIn) {
      setActionNotice({
        message: "Sign in to activate price monitoring for this listing.",
        tone: "info",
      });
      return;
    }
    const targetPrice =
      product.qiBuyingDecision?.action === "WAIT_FOR_DROP" ||
      product.qiBuyingDecision?.action === "DISCOUNT_LIKELY_SOON" ||
      product.qiBuyingDecision?.action === "PREMIUM_PRICING"
        ? Math.max(1, Math.round(product.price * 0.92))
        : null;
    setActionBusy("watchlist");
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
          targetPrice,
          alertMode: targetPrice == null ? "discount" : "price_drop",
        }),
      });
      const parsed = await readApiJson<{ error?: string; duplicate?: boolean; code?: string }>(
        res
      );
      const data = parsed.data;
      if (!res.ok || isApiFailure(parsed)) {
        const msg =
          data?.code === "PLAN_WATCHLIST_LIMIT"
            ? `${apiErrorText(parsed, "Price monitoring limit reached.")} Review access layers to elevate clearance.`
            : apiErrorText(parsed, "Price monitoring channel could not be activated.");
        setActionNotice({
          message: msg,
          tone: "error",
          onRetry: () => void addToWatchlist(product),
        });
        trackEvent(QuantAnalyticsEvents.WATCHLIST_ADD_FAIL, {
          code: data?.code ?? "http",
        });
        return;
      }
      if (data?.duplicate) {
        setActionNotice({
          message: "This listing is already on the price monitoring channel.",
          tone: "info",
        });
        return;
      }
      setActionNotice({
        message: "Decision watched — tracking in Watchlist and Decision timeline.",
        tone: "success",
      });
      trackEvent(QuantAnalyticsEvents.WATCHLIST_ADD, { link: product.link });
    } catch (e) {
      logDevError("addToWatchlist", e);
      setActionNotice({
        message: "Price monitoring channel could not be activated.",
        tone: "error",
        onRetry: () => void addToWatchlist(product),
      });
      trackEvent(QuantAnalyticsEvents.WATCHLIST_ADD_FAIL, { code: "exception" });
    } finally {
      setActionBusy(null);
    }
  }

  const heroSearchState = useMemo(
    () =>
      searchError && !loading && products.length === 0
        ? resolveInstitutionalState(searchError)
        : null,
    [searchError, loading, products.length]
  );

  return (
    <main className="qa-ref-os qa-ref-os--phase7 qa-ref-os--decision-system qa-ref-os--intel-authority qa-ref-os--intel-v1 relative min-h-screen overflow-x-hidden">
      <CommandSidebar />

      <div className="qa-ref-shell">
        <LandingNav />

        {actionNotice ? (
          <div className="qa-ref-section qa-ref-section--tight">
            <ActionFeedbackBanner
              message={actionNotice.message}
              tone={actionNotice.tone}
              onRetry={actionNotice.onRetry}
              onDismiss={clearActionNotice}
              className="mx-auto max-w-[54rem]"
            />
          </div>
        ) : null}

        <div className="qa-ref-workspace">
        {/* Hero + Command */}
        <section className="qa-ref-hero qa-ref-hero--canvas">
          <HeroAmbientField />

          <div className="qa-ref-hero__canvas">
            <div className="qa-ref-hero__surface">
              <div className="qa-ref-hero__surface-ambient" aria-hidden />
              <div className="qa-ref-hero__surface-scan" aria-hidden />
              <div className="qa-ref-hero__surface-depth" aria-hidden />

              <header className="qa-ref-hero__row qa-ref-hero__row--exec">
                <h1 className="qa-ref-hero__exec-title">Living Decision Intelligence</h1>
                <p className="qa-ref-hero__exec-lead">
                  Observing evidence. Reasoning quietly. Remembering outcomes.
                  Updating as reality moves.
                </p>
              </header>

              <div className="qa-ref-hero__row qa-ref-hero__row--metrics">
                <LivingIntelligencePresence
                  variant="nodes"
                  refreshKey={`${products.length}-${universalDecision?.memoryIdentity ?? ""}-${livingPresenceEpoch}`}
                />
              </div>

              <div className="qa-ref-hero__vein" aria-hidden>
                <span className="qa-ref-hero__vein-line" />
                <span className="qa-ref-hero__vein-node" />
              </div>

              <div className="qa-ref-hero__row qa-ref-hero__row--search">
                <div className="qa-ref-hero__search-panel">
                  <div className="qa-ref-hero__console-head">
                    <span className="qa-ref-hero__console-pulse" aria-hidden />
                    <LivingIntelligencePresence
                      variant="console"
                      refreshKey={`${products.length}-${universalDecision?.memoryIdentity ?? ""}-${livingPresenceEpoch}`}
                    />
                  </div>
                  <HeroSearchCommand
                    query={query}
                    onQueryChange={(v) => {
                      setQuery(v);
                      if (forcedDomain) setForcedDomain(null);
                    }}
                    onSubmit={() => void search()}
                    onSubmitPreset={(preset) => void search(preset)}
                    loading={loading}
                    submitPulse={submitPulse}
                    placeholder={HERO_INPUT_PLACEHOLDERS[heroPlaceholderIdx] ?? HERO_INPUT_PLACEHOLDERS[0]}
                    hintOptions={heroHintOptions}
                    registerInput={registerPrimarySearch}
                    mobilePerf={mobilePerf}
                  />

                  <DomainDecisionIndicator
                    domain={detectedDomain}
                    confidence={domainConfidence}
                    enabledDomains={enabledDomains}
                    clarifyingQuestion={domainClarify}
                    onCorrectDomain={(d) => void search(undefined, { forcedDomain: d, bypassClientThrottle: true })}
                    onConfirmClarification={(d) =>
                      void search(undefined, { forcedDomain: d, bypassClientThrottle: true })
                    }
                  />

                  {loading ? (
                    <div className="qa-ref-processing qa-ref-hero__search-processing">
                      <SearchStreamRibbon active={loading} searchQuery={query} />
                    </div>
                  ) : null}

                  {heroSearchState ? (
                    <SearchSignalCapsule
                      state={heroSearchState}
                      onAction={() => void search()}
                      className="qa-ref-hero__search-processing"
                    />
                  ) : null}

                </div>

                {!isSignedIn && (
                  <div className="qa-ref-guest-banner qa-ref-hero__guest">
                    <p>Quiet mode — sign in to keep memory across sessions.</p>
                    <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                      <button type="button" className="qa-ref-btn qa-ref-btn--ghost">
                        Sign in
                      </button>
                    </SignInButton>
                  </div>
                )}
              </div>

              <div className="qa-ref-hero__vein" aria-hidden>
                <span className="qa-ref-hero__vein-line" />
                <span className="qa-ref-hero__vein-node" />
              </div>

              <div className="qa-ref-hero__row qa-ref-hero__row--map">
                <HeroIntelligenceCanvas />
              </div>
            </div>
          </div>
        </section>

        <div className="qa-ref-flow-line qa-ref-flow-line--down" aria-hidden />

        {products.length === 0 && !loading ? (
          <section className="qa-ref-section qa-ref-section--tight">
            <RetailerMarquee />
          </section>
        ) : null}

        {(loading ||
          products.length > 0 ||
          (searchError != null && !loading)) && (
          <div className="qa-ref-flow-line qa-ref-flow-line--down qa-ref-flow-line--results" aria-hidden />
        )}

        {saved.length > 0 && (
          <section className="qa-ref-section">
            <div className="qa-ref-card">
                <div className="qa-ref-card__header">
                  <h2 className="qa-ref-h3">Saved products</h2>
                  <span className="qa-ref-kicker">Private shelf</span>
                </div>
                <div className="qa-dna-grid qa-dna-grid--2">
                  {saved.map((item) => (
                    <article key={item.link} className="qa-dna-surface qa-dna-surface--tile group sm:flex sm:items-center sm:gap-4">
                      {item.image ? (
                        <div className="qa-dna-media-thumb relative mx-auto size-20 shrink-0 sm:mx-0">
                          <Image
                            src={item.image}
                            alt=""
                            fill
                            sizes="80px"
                            className="object-contain p-2"
                            unoptimized
                          />
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1 text-center sm:text-left">
                        <p className="qa-dna-tile-title line-clamp-2">{item.title}</p>
                        <p className="qa-dna-tile-price mt-1">€{item.price}</p>
                        <p className="qa-dna-meta">{item.store}</p>
                      </div>
                      <div className="qa-dna-tile-actions">
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="qa-ui-btn-secondary">
                          Inspect
                        </a>
                        <button
                          type="button"
                          onClick={() => void removeSavedProduct(item.link)}
                          className="qa-ui-btn-ghost"
                          disabled={actionBusy === "remove"}
                          aria-busy={actionBusy === "remove"}
                        >
                          {actionBusy === "remove" ? "Releasing…" : "Remove"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
            </div>
          </section>
        )}

        {loading ? (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 mb-3">
            <div className="qa-living-skeleton" aria-hidden>
              <div className="qa-living-skeleton__row" />
              <div className="qa-living-skeleton__row qa-living-skeleton__row--short" />
            </div>
            <LivingIntelligencePresence variant="strip" refreshKey={livingPresenceEpoch} />
          </div>
        ) : null}

        {!loading && (products.length > 0 || universalDecision) ? (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 mb-4">
            <LivingIntelligencePresence
              variant="strip"
              refreshKey={`${livingPresenceEpoch}-${universalDecision?.generatedAt ?? ""}`}
            />
            <DecisionUpdatesPanel signedIn={Boolean(isSignedIn)} compact />
          </div>
        ) : null}

        {!loading && universalDecision ? (
          <div className="qa-universal-decision-anchor qa-instant-decision-anchor">
            <UniversalDecisionCard
              decision={universalDecision}
              watching={watchingUniversal}
              livingThread={universalLivingThread}
              onWatch={() => {
                const write = buildDecisionWriteFromUniversal(universalDecision);
                if (!write) return;
                setWatchingUniversal(true);
                void persistDecisionWatch(write.productLink, {
                  signedIn: Boolean(isSignedIn),
                  episode: { ...write, watched: true },
                });
              }}
            />
          </div>
        ) : null}

        {(loading ||
          products.length > 0 ||
          (searchError != null && !loading && !universalDecision)) && (
          <ProductResultsSurface
            products={products}
            sortedProducts={sortedProducts}
            dealClusters={dealClusters}
            searchIntelligence={searchIntelligence}
            intelligenceLevel={
              searchEntitlements?.intelligenceLevel ?? (isSignedIn ? "full" : "summary")
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
            searchMeta={searchMeta}
          />
        )}

        <DeferredBelowFold>
          <div className="qa-ref-flow-line qa-ref-flow-line--down" aria-hidden />

          <section className="qa-ref-section qa-ref-section--gcin qa-ref-flow-node">
            <GlobalCommerceIntelligenceNetwork />
          </section>

          <div className="qa-ref-flow-line qa-ref-flow-line--down" aria-hidden />

          <section
            id="pricing"
            className="qa-ref-section qa-ref-section--pricing scroll-mt-24 qa-ref-flow-node"
          >
            <div className="qa-ref-section-intro qa-ref-section-intro--intel-layers">
              <p className="qa-ref-kicker">Access</p>
              <h2 className="qa-ref-h2">Deeper continuity when it matters</h2>
              <p className="qa-ref-lead qa-ref-lead--narrow">
                Stronger memory, clearer confirmation thresholds, and quieter confidence as
                decisions grow more consequential.
              </p>
              <Link href="/pricing" className="qa-ref-link mt-4 inline-flex items-center gap-2">
                View access levels
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>

            <PricingCards currentTier={subscriptionTier} className="mt-6" />
          </section>

          <section className="qa-ref-section qa-ref-section--intel-notice" id="quantai-trust">
            <TrustRibbon variant="institutional" />
          </section>
        </DeferredBelowFold>

        <EnterpriseFooter />
        </div>
      </div>
    </main>
  );
}

