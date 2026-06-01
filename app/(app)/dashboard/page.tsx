"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, Brain, Loader2, Radar, Search, Sparkles, TrendingUp } from "lucide-react";
import type { SearchEntitlementsDTO } from "@/lib/subscription/entitlements";
import type { QuantPlanTier } from "@/lib/subscription/plans";
import TrustRibbon from "@/components/trust/TrustRibbon";
import EntitlementBanner from "@/components/subscription/EntitlementBanner";
import CockpitEmptyState from "@/components/empty/CockpitEmptyState";
import { QuantAnalyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";
import { isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";
import { logDevError } from "@/lib/log/devLog";
import { useCopilotSession } from "@/components/copilot/CopilotContext";
import { defaultCopilotSession } from "@/lib/copilot/sessionTypes";
import type { CopilotSessionPayload } from "@/lib/copilot/sessionTypes";
import { buildWatchlistEvolutionSignals } from "@/lib/intelligence/watchlistDealSignals";
import { buildSessionDigest } from "@/lib/liveSignals/sessionDigest";

type HistoryRow = { id?: string; query: string; result_count?: number; created_at?: string };
type WatchRow = {
  id?: string;
  product?: Record<string, unknown>;
  target_price?: number | null;
  created_at?: string;
};
type CompareHistoryRow = { id: string; payload: Record<string, unknown>; created_at: string };
type SavedRow = {
  id?: string;
  title: string | null;
  price: number | null;
  image: string | null;
  link: string;
  ai_score?: number | null;
  created_at?: string;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<QuantPlanTier>("free");
  const [entitlements, setEntitlements] = useState<SearchEntitlementsDTO | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [watchlist, setWatchlist] = useState<WatchRow[]>([]);
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [memoryLine, setMemoryLine] = useState<string | null>(null);
  const [compareHistory, setCompareHistory] = useState<CompareHistoryRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const dashboardTracked = useRef(false);
  const { setSession: setCopilotSession } = useCopilotSession();
  const entitlementsLevel = entitlements?.intelligenceLevel;

  const dashboardCopilotSession = useMemo((): CopilotSessionPayload | null => {
    if (loading) return null;
    return {
      ...defaultCopilotSession(),
      route: "dashboard",
      lastSearchQuery: memoryLine ?? history[0]?.query ?? "",
      savedSummaries: saved.map((s) => ({
        title: s.title ?? "Saved item",
        link: s.link,
        price: s.price,
      })),
      watchlistSummaries: watchlist.map((w) => {
        const prod = w.product as Record<string, unknown> | undefined;
        return {
          title: typeof prod?.title === "string" ? prod.title : "Watchlist item",
          link: typeof prod?.link === "string" ? prod.link : undefined,
          price: typeof prod?.price === "number" ? prod.price : null,
        };
      }),
      compareTrayLinks: [],
      subscriptionTier: tier,
      entitlementsLevel,
      memoryHints: memoryLine ? [memoryLine] : [],
      recentCompareHistory: compareHistory.slice(0, 5).map((c) => ({
        at: c.created_at,
        summary: `Saved compare snapshot (${c.id.slice(0, 8)})`,
      })),
    };
  }, [
    loading,
    memoryLine,
    history,
    saved,
    watchlist,
    tier,
    entitlementsLevel,
    compareHistory,
  ]);

  useEffect(() => {
    if (!dashboardCopilotSession) return;
    setCopilotSession(dashboardCopilotSession);
  }, [dashboardCopilotSession, setCopilotSession]);

  useEffect(() => {
    if (!dashboardTracked.current) {
      dashboardTracked.current = true;
      trackEvent(QuantAnalyticsEvents.DASHBOARD_VIEW, {});
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [subRes, hRes, wRes, sRes, mRes, cRes] = await Promise.all([
        fetch("/api/billing/subscription", { credentials: "same-origin" }),
        fetch("/api/intelligence/search-history", { credentials: "same-origin" }),
        fetch("/api/intelligence/watchlist", { credentials: "same-origin" }),
        fetch("/api/intelligence/saved-products", { credentials: "same-origin" }),
        fetch("/api/intelligence/user-memory", { credentials: "same-origin" }),
        fetch("/api/intelligence/compare-history", { credentials: "same-origin" }),
      ]);

      const [subP, hP, wP, sP, mP, cP] = await Promise.all([
        readApiJson<{ tier?: string; entitlements?: SearchEntitlementsDTO }>(subRes),
        readApiJson<{ items?: HistoryRow[] }>(hRes),
        readApiJson<{ items?: WatchRow[] }>(wRes),
        readApiJson<{ items?: SavedRow[] }>(sRes),
        readApiJson<{ memory?: Record<string, unknown> }>(mRes),
        readApiJson<{ items?: CompareHistoryRow[] }>(cRes),
      ]);

      if (subP.notJson) logDevError("dashboard-api", new Error(subP.error ?? "subscription not JSON"));
      if (!isApiFailure(subP) && subP.data) {
        const s = subP.data;
        if (typeof s.tier === "string") setTier(s.tier as QuantPlanTier);
        if (s.entitlements) setEntitlements(s.entitlements);
      }

      if (!isApiFailure(hP) && hP.data) {
        const h = hP.data;
        setHistory(Array.isArray(h.items) ? h.items : []);
      }

      if (!isApiFailure(wP) && wP.data) {
        const w = wP.data;
        setWatchlist(Array.isArray(w.items) ? w.items : []);
      }

      if (!isApiFailure(sP) && sP.data) {
        const sv = sP.data;
        setSaved(Array.isArray(sv.items) ? sv.items : []);
      }

      if (!isApiFailure(mP) && mP.data) {
        const mem = mP.data.memory ?? {};
        const last =
          typeof mem.lastQuery === "string"
            ? mem.lastQuery
            : typeof mem.lastCategory === "string"
              ? `Recent category signal: ${String(mem.lastCategory)}`
              : null;
        setMemoryLine(last);
      }

      if (!isApiFailure(cP) && cP.data) {
        const c = cP.data;
        setCompareHistory(Array.isArray(c.items) ? c.items : []);
      }
    } catch {
      setErr("Intelligence module sync incomplete.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const activitySummary = useMemo(() => {
    return [
      {
        label: "Memory shelf",
        count: saved.length,
        readyState: "Memory shelf ready",
        href: "/saved",
      },
      {
        label: "Price monitoring",
        count: watchlist.length,
        readyState: "Monitoring channel ready",
        href: "/dashboard#watchlist",
      },
      {
        label: "Query recall",
        count: history.length,
        readyState: "Recall channel ready",
        href: "/dashboard#searches",
      },
    ] as const;
  }, [saved.length, watchlist.length, history.length]);

  const digestLines = useMemo(
    () =>
      buildSessionDigest({
        savedCount: saved.length,
        watchlistCount: watchlist.length,
        historyQueries: history.map((h) => h.query),
        compareCount: compareHistory.length,
        memoryLine,
      }),
    [saved.length, watchlist.length, history, compareHistory.length, memoryLine]
  );

  return (
    <>
      <EntitlementBanner />

      <section className="qa-ref-ws-panel">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="qa-ref-ws-kicker qa-ref-ws-kicker--inline">
              <Brain className="size-3.5" aria-hidden />
              Commerce intelligence OS
            </p>
            <h1 className="qa-ref-ws-display max-w-3xl">
              Workspace persistence layer
            </h1>
            <p className="qa-ref-ws-lead max-w-2xl">
              Live signals from Search, Compare, and Governance propagate here—the same intelligence infrastructure, continuous operational state.
            </p>
            {memoryLine && (
              <p className="qa-ref-ws-signal">
                <strong>Live signal · </strong>
                {memoryLine}
              </p>
            )}
          </div>
          <Link href="/" className="qi-access-cta inline-flex items-center justify-center gap-2 px-6">
            Launch search console
            <Search className="size-4" aria-hidden />
          </Link>
        </div>
      </section>

      <section className="qa-ref-ws-panel qa-ref-ws-panel--compact">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="qa-ref-ws-kicker">Access clearance</p>
            <p className="qa-ref-ws-tier mt-1 capitalize">{tier} clearance</p>
            {entitlements && (
              <p className="qa-ref-ws-meta mt-2">
                Search throughput · <span className="tabular-nums font-semibold text-[#334155]">{entitlements.searchesPerDay}</span>
                {" · "}
                Intelligence depth ·{" "}
                <span className="capitalize font-semibold text-[#334155]">{entitlements.intelligenceLevel}</span>
              </p>
            )}
          </div>
          <div className="qa-ref-ws-actions">
            <Link href="/pricing" className="qi-access-cta qi-access-cta--ghost inline-flex items-center px-4">
              Access layers
            </Link>
            <Link href="/billing" className="qi-access-cta inline-flex items-center px-4">
              Clearance billing
            </Link>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="qa-ref-ws-loading">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          Loading intelligence modules…
        </div>
      ) : err ? (
        <div className="qa-ref-ws-alert flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>{err}</p>
          <button
            type="button"
            className="qa-ref-btn qa-ref-btn--ghost shrink-0"
            onClick={() => void loadDashboard()}
          >
            Retry sync
          </button>
        </div>
      ) : null}

      {!loading && !err ? (
        <section className="grid gap-4 md:grid-cols-3">
          {activitySummary.map((row) => (
            <Link key={row.label} href={row.href} className="qa-ref-ws-stat">
              <p className="qa-ref-ws-stat__label">{row.label}</p>
              <p
                className={`qa-ref-ws-stat__value${row.count === 0 ? " qa-ref-ws-stat__value--ready" : ""}`}
              >
                {row.count === 0 ? row.readyState : row.count}
              </p>
              <span className="qa-ref-ws-stat__action">
                Access module <ArrowRight className="size-3" aria-hidden />
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      {!loading && !err ? (
        <section className="qa-ref-ws-panel" aria-label="Session briefing">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="size-4 text-[#2a2668]" strokeWidth={1.5} aria-hidden />
            <h2 className="qa-ref-ws-title">Session briefing</h2>
          </div>
          <p className="qa-ref-ws-meta">
            Platform synthesis from workspace signal density—no synthetic urgency or crowd counters.
          </p>
          {digestLines.length > 0 ? (
            <ul className="qa-ref-ws-digest-list">
              {digestLines.map((line) => (
                <li key={line.id} className="qa-ref-ws-row">
                  <p className="qa-ref-ws-row__title text-sm font-medium">{line.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <CockpitEmptyState
              variant="embedded"
              moduleLabel="Session briefing module"
              readiness="Operational · Insufficient signal density"
              title="Briefing synthesis standing by"
              description="Workspace signals from Search, Compare, and monitoring modules consolidate here once density supports an executive session briefing."
              context={[
                "Synthesis derived from commerce OS signal state only",
                "No synthetic urgency or crowd-derived counters",
                "Density increases as intelligence modules receive ingest",
              ]}
              primaryLabel="Launch search console"
              primaryHref="/"
              secondaryLabel="Signal modules"
              secondaryHref="/dashboard"
              icon={<Sparkles className="size-6" strokeWidth={1.5} aria-hidden />}
            />
          )}
        </section>
      ) : null}

      <section id="watchlist" className="qa-ref-ws-panel scroll-mt-24">
        <div className="qa-ref-ws-section-head mb-6">
          <div>
            <h2 className="qa-ref-ws-title">Price monitoring</h2>
            <p className="qa-ref-ws-meta">
              {watchlist.length === 0
                ? "Monitoring channel ready · Signal channel for price-drop posture—linked to Search ingest and Compare validation."
                : "Signal channel for price-drop posture—linked to Search ingest and Compare validation."}
            </p>
          </div>
          <Link href="/" className="qa-ref-ws-link sm:shrink-0">
            Ingest from search
          </Link>
        </div>
        {watchlist.length === 0 ? (
          <CockpitEmptyState
            variant="embedded"
            moduleLabel="Price monitoring module"
            readiness="Armed · Awaiting listing ingest"
            title="Monitoring channel open"
            description="Price-drop intelligence activates when listings enter through the Search console. The channel remains armed across the commerce OS persistence layer."
            context={[
              "Target pricing posture attaches at Search save",
              "Merchant divergence signals surface once mesh coverage exists",
              "State propagates through Compare and Governance modules",
            ]}
            primaryLabel="Launch search console"
            primaryHref="/"
            secondaryLabel="Signal alerts"
            secondaryHref="/alerts"
            icon={<Radar className="size-6" strokeWidth={1.5} aria-hidden />}
          />
        ) : (
          <ul className="space-y-2">
            {watchlist.slice(0, 12).map((w) => {
              const p = w.product;
              const title =
                p && typeof p.title === "string" ? p.title : "Watched listing";
              const link = p && typeof p.link === "string" ? p.link : null;
              const signals = buildWatchlistEvolutionSignals({
                product: p ?? null,
                target_price: w.target_price ?? null,
              });
              return (
                <li
                  key={w.id ?? `${title}-${w.created_at ?? ""}`}
                  className="qa-ref-ws-row flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <span className="qa-ref-ws-row__title text-sm">{title}</span>
                    {signals.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {signals.map((s, i) => (
                          <li key={i} className="qa-ref-ws-row__meta [overflow-wrap:anywhere]">
                            {s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="qa-ref-ws-link sm:pt-0.5"
                    >
                      Open source
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section id="compare-history" className="qa-ref-ws-panel scroll-mt-24">
        <div className="qa-ref-ws-section-head mb-6">
          <div>
            <h2 className="qa-ref-ws-title">Verdict archive</h2>
            <p className="qa-ref-ws-meta">
              {compareHistory.length === 0
                ? "Archive channel ready · Compare lab snapshots indexed to the intelligence persistence layer."
                : "Compare lab snapshots indexed to the intelligence persistence layer."}
            </p>
          </div>
          <Link href="/" className="qa-ref-ws-link sm:shrink-0">
            Launch Compare lab
          </Link>
        </div>
        {compareHistory.length === 0 ? (
          <CockpitEmptyState
            variant="embedded"
            moduleLabel="Verdict archive module"
            readiness="Indexed · Awaiting Compare output"
            title="Archive channel ready"
            description="Verdict snapshots persist here after Compare lab stress-tests complete on the Search intelligence surface. The archive stays bound to the commerce OS state layer."
            context={[
              "Verdict rationale captured from Compare lab output",
              "Executive brief excerpts attach after first stress-test",
              "Archive compresses when product mesh coverage is sparse",
            ]}
            primaryLabel="Launch Compare lab"
            primaryHref="/"
            secondaryLabel="Compare posture"
            secondaryHref="/#compare"
            icon={<Sparkles className="size-6" strokeWidth={1.5} aria-hidden />}
          />
        ) : (
          <ul className="space-y-2">
            {compareHistory.slice(0, 10).map((row) => {
              const v = row.payload.verdict;
              let headline = "Compare verdict";
              if (v && typeof v === "object" && v !== null) {
                const o = v as { winnerTitle?: string; verdict?: string };
                if (typeof o.winnerTitle === "string") headline = o.winnerTitle;
                else if (typeof o.verdict === "string") headline = o.verdict.slice(0, 140);
              }
              const src =
                typeof row.payload.source === "string" ? row.payload.source : "";
              const when = row.created_at ? new Date(row.created_at).toLocaleString() : "";
              return (
                <li key={row.id} className="qa-ref-ws-row">
                  <p className="qa-ref-ws-row__title text-sm">{headline}</p>
                  <p className="qa-ref-ws-row__meta">
                    {when}
                    {src ? ` · ${src}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div id="searches" className="qa-ref-ws-panel scroll-mt-24 xl:col-span-2">
          <div className="qa-ref-ws-section-head mb-6">
            <div>
              <h2 className="qa-ref-ws-title">Query recall</h2>
              <p className="qa-ref-ws-meta">
                {history.length === 0
                  ? "Recall channel ready · Search console lineage available for rapid re-analysis."
                  : "Search console lineage available for rapid re-analysis."}
              </p>
            </div>
            <Link href="/" className="qa-ref-ws-link">
              Launch search console
            </Link>
          </div>
          {history.length === 0 ? (
            <CockpitEmptyState
              variant="embedded"
              moduleLabel="Query recall module"
              readiness="Linked · Awaiting Search ingest"
              title="Recall channel open"
              description="Queries captured from the Search intelligence console re-enter here for rapid re-analysis. The recall layer stays synchronized with live processing state."
              context={[
                "Query lineage retained in the commerce OS persistence layer",
                "Result counts and timing attach at Search capture",
                "Re-run restores live intelligence processing state",
              ]}
              primaryLabel="Launch search console"
              primaryHref="/"
              secondaryLabel="Memory shelf"
              secondaryHref="/saved"
              icon={<Search className="size-6" strokeWidth={1.5} aria-hidden />}
            />
          ) : (
            <ul className="space-y-2">
              {history.slice(0, 12).map((h) => (
                <li key={h.id ?? h.query}>
                  <Link href={`/?q=${encodeURIComponent(h.query)}`} className="qa-ref-ws-row qa-ref-ws-row--link">
                    <span className="truncate font-semibold">{h.query}</span>
                    <span className="qa-ref-ws-row__aside">
                      {h.result_count != null ? `${h.result_count} results` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="qa-ref-ws-panel">
          <h2 className="qa-ref-ws-title">System routing</h2>
          <p className="qa-ref-ws-meta">Direct access to intelligence surfaces across the commerce OS.</p>
          <div className="mt-6 space-y-2">
            <Link href="/saved" className="qa-ref-ws-row qa-ref-ws-row--link">
              <span className="flex items-center gap-2">
                <Bookmark className="qa-ref-ws-shortcut-icon size-4" aria-hidden />
                Memory shelf
              </span>
              <ArrowRight className="qa-ref-ws-shortcut-chevron size-4" aria-hidden />
            </Link>
            <Link href="/alerts" className="qa-ref-ws-row qa-ref-ws-row--link">
              <span className="flex items-center gap-2">
                <Sparkles className="qa-ref-ws-shortcut-icon size-4" aria-hidden />
                Signal alerts
              </span>
              <ArrowRight className="qa-ref-ws-shortcut-chevron size-4" aria-hidden />
            </Link>
            <Link href="/analytics" className="qa-ref-ws-row qa-ref-ws-row--link">
              <span className="flex items-center gap-2">
                <TrendingUp className="qa-ref-ws-shortcut-icon size-4" aria-hidden />
                Market analytics
              </span>
              <ArrowRight className="qa-ref-ws-shortcut-chevron size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section className="qa-ref-ws-panel">
        <h2 className="qa-ref-ws-title">Decision routing</h2>
        <p className="qa-ref-ws-lead mt-3">
          {saved.length >= 3
            ? "Shortlist density supports Compare stress-testing—return to Search, run Compare lab, and let the verdict layer validate finalists before commitment."
            : saved.length > 0
              ? "Ingest one or two more anchors from Search, then route through Compare on price, trust, and delivery posture in one pass."
              : "Launch Search, save resonant listings, and intelligence routing stays grounded in live signal state—not generic guidance."}
        </p>
      </section>

      <TrustRibbon variant="institutional" />
    </>
  );
}
