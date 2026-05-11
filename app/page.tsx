"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";
import SearchBox from "../components/SearchBox";
import LandingNav from "../components/landing/LandingNav";
import MarketingSections from "../components/landing/MarketingSections";
import { calculateAIScore } from "./api/search/lib/aiScoring";
import ProductResultsSurface from "../components/search/ProductResultsSurface";
import {
  applyResultsFilters,
  countActiveFilters,
  defaultResultsFilters,
} from "@/lib/resultsFilters";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { DealClusterDTO } from "@/lib/deals/types";
import {
  getFinalComposite,
  getHeuristicScore,
  sortByBestAIScore,
  sortByCompositeRank,
  sortByTrust,
  type QuantProduct,
} from "@/lib/shoppingScore";
import {
  ArrowRight,
  Bell,
  Loader2,
  Lock,
  Radar,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";

type SearchHistoryRow = {
  id?: string;
  query: string;
  result_count?: number;
  created_at?: string;
};

export default function Home() {
  const { isSignedIn } = useUser();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<QuantProduct[]>([]);
  const [dealClusters, setDealClusters] = useState<DealClusterDTO[]>([]);
  const [searchIntelligence, setSearchIntelligence] = useState<SearchIntelligenceDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("value");
  const [filters, setFilters] = useState(defaultResultsFilters());
  const [saved, setSaved] = useState<QuantProduct[]>([]);
  const [question, setQuestion] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [resultsKey, setResultsKey] = useState(0);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryRow[]>([]);

  const savedLinks = useMemo(
    () => new Set(saved.map((s) => s.link)),
    [saved]
  );

  const refreshSearchHistory = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await fetch("/api/intelligence/search-history", { credentials: "same-origin" });
      const data = (await res.json()) as { items?: SearchHistoryRow[] };
      if (res.ok && Array.isArray(data.items)) {
        setSearchHistory(data.items);
      }
    } catch {
      /* ignore */
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/intelligence/search-history", {
          credentials: "same-origin",
        });
        const data = (await res.json()) as { items?: SearchHistoryRow[] };
        if (!cancelled && res.ok && Array.isArray(data.items)) {
          setSearchHistory(data.items);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  function decision(score: number) {
    if (score >= 85) return "Buy now";
    if (score >= 70) return "Good choice";
    if (score >= 55) return "Compare first";
    return "Risky";
  }

  function decisionStyle(score: number) {
    if (score >= 85)
      return "text-emerald-200 border-emerald-400/25 bg-emerald-400/[0.12]";
    if (score >= 70)
      return "text-cyan-200 border-cyan-400/25 bg-cyan-400/[0.1]";
    if (score >= 55)
      return "text-amber-200 border-amber-400/25 bg-amber-400/[0.1]";
    return "text-rose-200 border-rose-400/25 bg-rose-400/[0.1]";
  }

  function whyImportant(p: QuantProduct) {
    const score = getHeuristicScore(p);

    if (score >= 85) {
      return "This is a strong buy right now. The product has a strong balance of price, rating, and store reliability.";
    }

    if (score >= 70) {
      return "This is a good option, but QuantAI recommends comparing it with cheaper alternatives before buying.";
    }

    if (score >= 55) {
      return "This product is average. It may be better to wait or check other options first.";
    }

    return "This option looks weak compared with other available results. Better to avoid or wait.";
  }

  function smartDecisionText(p: QuantProduct) {
    const score = getFinalComposite(p, sortedProducts);

    if (score >= 85) {
      return "QuantAI recommends buying this now. The price looks competitive, the rating is strong, and the store signal is reliable compared with other results.";
    }

    if (score >= 70) {
      return "This is a good buying option, but not perfect. Compare delivery, final checkout price, and similar products before making a final decision.";
    }

    if (score >= 55) {
      return "This product is acceptable, but the deal is not strong enough. Waiting or checking alternatives may give you better value.";
    }

    return "QuantAI does not recommend this option right now. The score is weak compared with other products in the search results.";
  }

  const filteredForSort = applyResultsFilters(products, filters);
  const sortedList = [...filteredForSort];
  let sortedProducts: QuantProduct[];
  switch (sort) {
    case "ai":
      sortedProducts = sortByBestAIScore(sortedList);
      break;
    case "cheap":
      sortedList.sort((a, b) => a.price - b.price);
      sortedProducts = sortedList;
      break;
    case "trust":
      sortedProducts = sortByTrust(sortedList);
      break;
    case "value":
    default:
      sortedProducts = sortByCompositeRank(sortedList);
      break;
  }

  const activeFilterCount = countActiveFilters(filters);

  const best = sortedProducts[0];

  async function search(overrideQuery?: string) {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;

    if (!isSignedIn) {
      setSearchError("Sign in to run a live product search.");
      return;
    }

    if (overrideQuery != null) {
      setQuery(overrideQuery);
    }

    setResultsKey((k) => k + 1);
    setFilters(defaultResultsFilters());
    setLoading(true);
    setProducts([]);
    setDealClusters([]);
    setSearchIntelligence(null);
    setSearchError(null);

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}`,
        { credentials: "same-origin" }
      );
      const data = (await res.json()) as {
        products?: QuantProduct[];
        dealClusters?: DealClusterDTO[];
        searchIntelligence?: SearchIntelligenceDTO | null;
        error?: string;
        retryAfter?: number;
      };

      if (res.status === 401) {
        setSearchError(data.error || "Please sign in to search.");
        return;
      }

      if (res.status === 429) {
        const wait = data.retryAfter ? ` Retry in ~${data.retryAfter}s.` : "";
        setSearchError((data.error || "Too many searches.") + wait);
        return;
      }

      if (!res.ok) {
        setSearchError(data.error || "Search failed. Try again.");
        return;
      }

      if (data.products && data.products.length > 0) {
        setProducts(data.products);
        setDealClusters(
          Array.isArray(data.dealClusters) ? data.dealClusters : []
        );
        setSearchIntelligence(
          data.searchIntelligence && typeof data.searchIntelligence === "object"
            ? data.searchIntelligence
            : null
        );
        void refreshSearchHistory();
      } else {
        setSearchError("No products found for this query.");
      }
    } catch (e) {
      setSearchError("Search failed. Check your connection and try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

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

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setSearchError(data.error || "Could not save this product.");
        setSaved(saved.filter((p) => p.link !== product.link));
      }
    } catch (e) {
      console.error(e);
      setSearchError("Could not save this product.");
      setSaved(saved.filter((p) => p.link !== product.link));
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
          },
          targetPrice: null,
        }),
      });
      const data = (await res.json()) as { error?: string; duplicate?: boolean };
      if (!res.ok) {
        setSearchError(data.error || "Watchlist is not available yet.");
        return;
      }
      if (data.duplicate) {
        setSearchError(null);
        return;
      }
      setSearchError(null);
    } catch {
      setSearchError("Could not add to watchlist.");
    }
  }

  const glassCard =
    "rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-[0_24px_80px_-32px_rgba(0,0,0,0.85)] backdrop-blur-2xl";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030712] text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(139,92,246,0.12),transparent_50%),radial-gradient(ellipse_60%_40%_at_0%_80%,rgba(52,211,153,0.08),transparent_45%)]" />
        <div className="absolute -top-40 left-1/2 h-[520px] w-[min(90vw,720px)] -translate-x-1/2 rounded-full bg-gradient-to-b from-cyan-500/20 via-violet-500/10 to-transparent blur-3xl animate-aurora" />
        <div
          className="absolute inset-0 opacity-[0.35] bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)] ai-grid-motion"
          aria-hidden
        />
      </div>

      <div className="relative z-10">
        <LandingNav />

        {/* Hero */}
        <section className="relative px-4 sm:px-6 pt-10 pb-16 sm:pt-14 sm:pb-24">
          <div className="mx-auto max-w-6xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-200/90 shadow-[0_0_40px_-12px_rgba(34,211,238,0.35)] backdrop-blur-xl motion-safe:animate-[fadeIn_0.6s_ease-out]">
              <span className="flex size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-soft-pulse" />
              Live shopping intelligence
            </div>

            <h1 className="mt-8 text-[2.5rem] sm:text-5xl lg:text-[3.5rem] font-semibold tracking-[-0.03em] leading-[1.08] text-white motion-safe:animate-[fadeIn_0.65s_ease-out]">
              Buy with clarity.
              <span className="mt-2 block bg-gradient-to-r from-cyan-200 via-white to-violet-200 bg-clip-text text-transparent font-semibold">
                Decide like you had a quant desk in your pocket.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg font-normal leading-relaxed text-slate-400 motion-safe:animate-[fadeIn_0.7s_ease-out]">
              QuantAI searches live listings, scores them as a set, and explains the tradeoffs—so
              you move from endless tabs to one confident next step.
            </p>

            {/* Search */}
            <div
              className={`mx-auto mt-10 max-w-3xl motion-safe:animate-[fadeIn_0.75s_ease-out] p-1 rounded-[1.35rem] bg-gradient-to-br from-white/[0.12] via-white/[0.04] to-transparent shadow-[0_32px_100px_-40px_rgba(34,211,238,0.25)]`}
            >
              <div
                className={`rounded-[1.25rem] border border-white/[0.08] bg-[#0a0f1f]/80 p-2 sm:p-2.5 backdrop-blur-2xl`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <div className="relative flex min-h-[52px] flex-1 items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 transition focus-within:border-cyan-400/30 focus-within:shadow-[0_0_0_1px_rgba(34,211,238,0.15)]">
                    <Search
                      className="size-5 shrink-0 text-cyan-300/50"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void search()}
                      placeholder="Search products — e.g. OLED TV, noise-canceling headphones…"
                      className="min-w-0 flex-1 bg-transparent py-3 text-[15px] font-normal text-white placeholder:text-slate-500 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void search()}
                    disabled={loading}
                    className="group relative inline-flex min-h-[52px] items-center justify-center gap-2 overflow-hidden rounded-2xl px-7 text-[15px] font-semibold text-slate-950 shadow-[0_0_40px_-8px_rgba(34,211,238,0.55)] transition enabled:hover:brightness-[1.03] enabled:hover:shadow-[0_0_48px_-6px_rgba(34,211,238,0.5)] disabled:opacity-60"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-500 transition group-hover:opacity-95" />
                    <span className="relative flex items-center gap-2">
                      {loading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          Scanning
                        </>
                      ) : (
                        <>
                          Analyze
                          <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
                        </>
                      )}
                    </span>
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                  {[
                    {
                      icon: Radar,
                      title: "Live listings",
                      sub: "Fresh results from the open web",
                    },
                    {
                      icon: TrendingUp,
                      title: "Transparent scoring",
                      sub: "Price, rating & store trust combined",
                    },
                    {
                      icon: Lock,
                      title: "Protected search",
                      sub: "Signed-in access & fair rate limits",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-3 rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-3 text-left"
                    >
                      <item.icon
                        className="size-4 shrink-0 text-cyan-300/70 mt-0.5"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                      <div>
                        <p className="text-[13px] font-medium text-white/85">{item.title}</p>
                        <p className="text-[11px] font-normal text-slate-500 mt-0.5 leading-snug">
                          {item.sub}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {isSignedIn && searchHistory.length > 0 && (
              <div className="mx-auto mt-8 max-w-3xl text-left">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                  Recent searches
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {searchHistory.slice(0, 10).map((h) => (
                    <button
                      key={h.id ?? `${h.query}-${h.created_at}`}
                      type="button"
                      onClick={() => void search(h.query)}
                      className="max-w-[220px] truncate rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-400/30 hover:text-white"
                      title={h.query}
                    >
                      {h.query}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                  Sign in to run live shopping search and unlock the AI assistant.
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

        {products.length > 0 && saved.length > 0 && (
          <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-6 space-y-6">
            <section className={`${glassCard} p-6 sm:p-8`}>
                <div className="flex items-center justify-between gap-4 mb-6">
                  <h2 className="text-lg font-semibold tracking-tight text-white/95">
                    Saved products
                  </h2>
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Session list
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {saved.map((item) => (
                    <div
                      key={item.link}
                      className="group flex flex-col rounded-2xl border border-white/[0.06] bg-black/25 p-4 transition hover:border-cyan-400/20 hover:shadow-[0_20px_50px_-28px_rgba(34,211,238,0.12)] sm:flex-row sm:items-center sm:gap-4"
                    >
                      {item.image && (
                        <img
                          src={item.image}
                          alt=""
                          className="mx-auto size-20 shrink-0 rounded-xl bg-white object-contain p-2 sm:mx-0"
                        />
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
                          onClick={() => setSaved(saved.filter((p) => p.link !== item.link))}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-rose-200/90 transition hover:bg-rose-500/10"
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

        {best && !loading && (
          <>
            <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-6">
              <div
                className={`relative overflow-hidden ${glassCard} p-6 sm:p-8 lg:p-10 before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-cyan-400/10 before:via-transparent before:to-violet-500/10`}
              >
                <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-cyan-400/10 blur-3xl" />
                <p className="relative text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300/90 mb-4">
                  Top pick (QI)
                </p>
                <div className="relative grid gap-8 md:grid-cols-[minmax(0,200px)_1fr_minmax(0,160px)] md:items-center">
                  {best.image && (
                    <div className="rounded-2xl border border-white/[0.08] bg-white p-4 shadow-inner">
                      <img
                        src={best.image}
                        alt=""
                        className="mx-auto h-40 w-full object-contain"
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-white/95 leading-snug">
                      {best.title}
                    </h2>
                    <p className="mt-1.5 text-sm font-medium text-slate-500">{best.store}</p>
                    <p className="mt-5 text-4xl sm:text-5xl font-semibold tracking-tight text-emerald-300/95">
                      €{best.price}
                    </p>
                    <p
                      className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${decisionStyle(getFinalComposite(best, sortedProducts))}`}
                    >
                      {decision(getFinalComposite(best, sortedProducts))}
                    </p>
                    <p className="mt-4 max-w-xl text-sm font-normal leading-relaxed text-slate-400">
                      {best.qiReason?.trim() || whyImportant(best)}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <a
                        href={best.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                      >
                        View offer
                      </a>
                      <button
                        type="button"
                        onClick={() => saveProduct(best)}
                        className="inline-flex items-center justify-center rounded-full border border-emerald-400/35 bg-emerald-400/15 px-6 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/25"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-black/30 p-6 text-center backdrop-blur-md">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      QI composite
                    </p>
                    <p className="mt-2 text-4xl font-semibold tabular-nums text-white/95">
                      {getFinalComposite(best, sortedProducts)}
                      <span className="text-lg font-medium text-slate-500">/100</span>
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-6">
              <div
                className={`${glassCard} p-6 sm:p-8 transition duration-500 hover:border-cyan-400/20 hover:shadow-[0_32px_90px_-36px_rgba(34,211,238,0.15)]`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="size-5 text-violet-300/80" strokeWidth={1.5} aria-hidden />
                  <h3 className="text-lg font-semibold tracking-tight text-white/95">
                    QuantAI decision
                  </h3>
                </div>
                <p className="text-sm sm:text-base font-normal leading-relaxed text-slate-400 max-w-3xl">
                  {smartDecisionText(best)}
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    "Price signal weighted against this result set.",
                    "Rating signal rewards consistently strong feedback.",
                    "Store signal boosts recognized retailers you can trust.",
                  ].map((t) => (
                    <div
                      key={t}
                      className="rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-3 text-xs font-normal leading-relaxed text-slate-500"
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-10">
              <div className={`${glassCard} border-violet-400/15 p-6 sm:p-8`}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-white/95">
                      AI assistant
                    </h3>
                    <p className="mt-1 text-sm font-normal text-slate-500 max-w-xl">
                      Ask QuantAI to compare options, pressure-test price, or explain store
                      trust—grounded in your current results.
                    </p>
                  </div>
                  <Bell className="size-6 text-violet-300/50 hidden sm:block shrink-0" strokeWidth={1.25} aria-hidden />
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    {
                      label: "Compare alternatives",
                      text: "QuantAI found cheaper alternatives with similar ratings. Compare price, store trust, and delivery before buying.",
                    },
                    {
                      label: "Should I buy now?",
                      text: "QuantAI recommends buying this product now. Price, rating, and trust score are currently strong.",
                    },
                    {
                      label: "Track price drop",
                      text: "QuantAI will track this product and notify you when the price becomes a stronger deal.",
                    },
                  ].map((b) => (
                    <button
                      key={b.label}
                      type="button"
                      onClick={() => setAiReply(b.text)}
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-white/85 transition hover:border-cyan-400/25 hover:bg-cyan-400/[0.06]"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <input
                    placeholder="Ask QuantAI anything…"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="min-h-[48px] flex-1 rounded-2xl border border-white/[0.08] bg-black/30 px-4 text-sm font-normal text-white placeholder:text-slate-500 outline-none backdrop-blur-md transition focus:border-cyan-400/35"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (!isSignedIn) {
                          setAiReply("Sign in to ask the AI assistant.");
                          return;
                        }

                        setAiReply("QuantAI is thinking…");

                        const res = await fetch("/api/ai-chat", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          credentials: "same-origin",
                          body: JSON.stringify({
                            question,
                            products: sortedProducts,
                          }),
                        });

                        const data = (await res.json()) as {
                          reply?: string;
                          highlights?: string[];
                          caution?: string;
                          error?: string;
                          detail?: string;
                          retryAfter?: number;
                        };

                        if (res.status === 429) {
                          const wait = data.retryAfter
                            ? ` Try again in ~${data.retryAfter}s.`
                            : "";
                          setAiReply((data.error || "Too many requests.") + wait);
                          return;
                        }

                        if (!res.ok) {
                          setAiReply(
                            data.error ||
                              data.detail ||
                              "QuantAI could not analyze this request."
                          );
                          return;
                        }

                        let out = data.reply || data.error || "No reply returned.";
                        if (data.highlights?.length) {
                          out += `\n\n${data.highlights.map((h) => `• ${h}`).join("\n")}`;
                        }
                        if (data.caution?.trim()) {
                          out += `\n\nCaution: ${data.caution.trim()}`;
                        }
                        setAiReply(out);
                      } catch {
                        setAiReply("QuantAI could not analyze this request.");
                      }
                    }}
                    className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-6 text-sm font-semibold text-slate-950 transition hover:brightness-105 sm:shrink-0"
                  >
                    Ask AI
                  </button>
                </div>
                {aiReply && (
                  <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-4 text-sm font-normal leading-relaxed text-cyan-50/95">
                    {aiReply}
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {(loading ||
          products.length > 0 ||
          (searchError != null && !loading)) && (
          <ProductResultsSurface
            key={resultsKey}
            products={products}
            sortedProducts={sortedProducts}
            dealClusters={dealClusters}
            searchIntelligence={searchIntelligence}
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
          />
        )}

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
              Scale from curious to power buyer
            </h2>
            <p className="mt-4 text-base text-slate-500 font-normal leading-relaxed">
              Start free, upgrade when you want deeper alerts, faster analysis, and premium
              decision tooling.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3 lg:gap-5 lg:items-stretch">
            <div
              className={`flex flex-col ${glassCard} p-8 transition duration-500 hover:border-white/15`}
            >
              <h3 className="text-lg font-semibold text-white/95">Free</h3>
              <p className="mt-1 text-sm text-slate-500">For trying QuantAI on real purchases.</p>
              <p className="mt-8 text-4xl font-semibold tracking-tight text-white/95">
                €0
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-400 flex-1">
                <li className="flex gap-2">
                  <CheckIcon /> Live AI search (signed in)
                </li>
                <li className="flex gap-2">
                  <CheckIcon /> Product scores & ranking
                </li>
                <li className="flex gap-2">
                  <CheckIcon /> Save products to your account
                </li>
              </ul>
              <button
                type="button"
                className="mt-8 w-full rounded-full border border-white/12 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06]"
              >
                Current plan
              </button>
            </div>

            <div
              className={`relative flex flex-col ${glassCard} border-cyan-400/25 p-8 shadow-[0_40px_100px_-40px_rgba(34,211,238,0.2)] transition duration-500 hover:border-cyan-400/40 lg:scale-[1.02] lg:z-[1]`}
            >
              <span className="absolute right-6 top-6 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-950">
                Most popular
              </span>
              <h3 className="text-lg font-semibold text-white/95">Pro</h3>
              <p className="mt-1 text-sm text-slate-500">For people who buy often—and hate regret.</p>
              <p className="mt-8 text-4xl font-semibold tracking-tight text-white/95">
                €19
                <span className="text-base font-medium text-slate-500">/mo</span>
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-300 flex-1">
                <li className="flex gap-2">
                  <CheckIcon /> Advanced AI analysis
                </li>
                <li className="flex gap-2">
                  <CheckIcon /> Real-time smart alerts
                </li>
                <li className="flex gap-2">
                  <CheckIcon /> Unlimited saved products
                </li>
                <li className="flex gap-2">
                  <CheckIcon /> Priority search throughput
                </li>
              </ul>
              <a
                href="https://buy.stripe.com/test_14k8wQ8uQ5xM9DWcMM"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 flex w-full items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_32px_-6px_rgba(34,211,238,0.45)] transition hover:brightness-105"
              >
                Upgrade to Pro
              </a>
            </div>

            <div
              className={`flex flex-col ${glassCard} p-8 transition duration-500 hover:border-white/15`}
            >
              <h3 className="text-lg font-semibold text-white/95">Business</h3>
              <p className="mt-1 text-sm text-slate-500">Teams that standardize how they buy.</p>
              <p className="mt-8 text-4xl font-semibold tracking-tight text-white/95">
                €99
                <span className="text-base font-medium text-slate-500">/mo</span>
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-400 flex-1">
                <li className="flex gap-2">
                  <CheckIcon /> Team dashboards
                </li>
                <li className="flex gap-2">
                  <CheckIcon /> Market analytics
                </li>
                <li className="flex gap-2">
                  <CheckIcon /> API access
                </li>
                <li className="flex gap-2">
                  <CheckIcon /> Priority support
                </li>
              </ul>
              <button
                type="button"
                className="mt-8 w-full rounded-full bg-white py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Contact sales
              </button>
            </div>
          </div>

          <div className="mx-auto mt-14 max-w-3xl">
            <div className={`${glassCard} p-6 sm:p-8`}>
              <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-4">
                Secondary search
              </p>
              <SearchBox />
            </div>
          </div>
        </section>

        <footer className="border-t border-white/[0.06] py-10 text-center">
          <p className="text-xs font-medium text-slate-600">
            © {new Date().getFullYear()} QuantAI · Shopping intelligence, not financial advice.
          </p>
          <p className="mt-2 text-[11px] text-slate-600/80 max-w-md mx-auto">
            AI outputs can be wrong; always verify price and seller at checkout.
          </p>
        </footer>
      </div>
    </main>
  );
}

function CheckIcon() {
  return (
    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
        <path
          d="M2 5l2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
