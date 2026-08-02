"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Loader2, Radio } from "lucide-react";
import { isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";
import { buildLocalDecisionFeed } from "@/lib/decisionFeed/clientFeed";
import type {
  DecisionFeedItem,
  DecisionFeedResponse,
  FeedDomainFilter,
  FeedPriority,
} from "@/lib/decisionFeed/types";
import { markLocalUpdatesSeen, touchLocalVisit } from "@/lib/decisionMemory/clientMemory";
import DecisionFeedCard from "@/components/decisionFeed/DecisionFeedCard";

const DOMAIN_FILTERS: Array<{ id: FeedDomainFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "product", label: "Products" },
  { id: "flight", label: "Flights" },
  { id: "hotel", label: "Hotels" },
  { id: "subscription", label: "Subscriptions" },
];

const PRIORITY_FILTERS: Array<{ id: "all" | FeedPriority; label: string }> = [
  { id: "all", label: "All priorities" },
  { id: "critical", label: "Critical" },
  { id: "important", label: "Important" },
  { id: "informational", label: "Informational" },
];

export default function DecisionFeedView() {
  const { isSignedIn } = useAuth();
  const [domain, setDomain] = useState<FeedDomainFilter>("all");
  const [priority, setPriority] = useState<"all" | FeedPriority>("all");
  const [feed, setFeed] = useState<DecisionFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(
    (nextDomain: FeedDomainFilter) => {
      startTransition(() => {
        void (async () => {
          setLoading(true);
          setError(null);
          touchLocalVisit();
          try {
            if (isSignedIn) {
              const res = await fetch(
                `/api/intelligence/decision-feed?domain=${encodeURIComponent(nextDomain)}&limit=80`,
                { credentials: "same-origin" }
              );
              const parsed = await readApiJson<DecisionFeedResponse>(res);
              if (!isApiFailure(parsed) && parsed.data?.items) {
                setFeed(parsed.data);
              } else {
                setFeed(buildLocalDecisionFeed({ domain: nextDomain }));
              }
            } else {
              setFeed(buildLocalDecisionFeed({ domain: nextDomain }));
            }
          } catch {
            setFeed(buildLocalDecisionFeed({ domain: nextDomain }));
            setError("Live feed sync soft-failed — showing local intelligence.");
          } finally {
            markLocalUpdatesSeen();
            setLoading(false);
          }
        })();
      });
    },
    [isSignedIn]
  );

  useEffect(() => {
    load(domain);
  }, [domain, load]);

  const visible: DecisionFeedItem[] = useMemo(() => {
    const items = feed?.items ?? [];
    if (priority === "all") return items;
    return items.filter((i) => i.priority === priority);
  }, [feed, priority]);

  return (
    <div className="cockpit-glass-panel qa-premium-surface p-6 sm:p-8">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/10">
        <Radio className="size-6 text-cyan-200" aria-hidden />
      </div>
      <h1 className="cockpit-display mt-6 text-2xl text-white sm:text-3xl">Decision Feed</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
        What changed since you were here — ranked so the biggest decision moves surface first.
      </p>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <Link href="/decisions" className="font-semibold text-cyan-200 hover:text-white">
          Decision timeline
        </Link>
        <Link href="/watchlist" className="font-semibold text-slate-300 hover:text-white">
          Watched decisions
        </Link>
        <Link href="/" className="font-semibold text-slate-300 hover:text-white">
          New search
        </Link>
      </div>

      <div className="qa-feed-filters mt-8" role="toolbar" aria-label="Feed domain filters">
        {DOMAIN_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`qa-feed-filter${domain === f.id ? " qa-feed-filter--active" : ""}`}
            onClick={() => setDomain(f.id)}
            aria-pressed={domain === f.id}
          >
            {f.label}
            {feed?.counts ? (
              <span className="qa-feed-filter__count">
                {f.id === "all" ? feed.counts.all : feed.counts[f.id]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="qa-feed-filters qa-feed-filters--priority mt-3" role="toolbar" aria-label="Priority filters">
        {PRIORITY_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`qa-feed-filter${priority === f.id ? " qa-feed-filter--active" : ""}`}
            onClick={() => setPriority(f.id)}
            aria-pressed={priority === f.id}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 text-xs text-amber-200/90">{error}</p> : null}

      {loading || pending ? (
        <div className="mt-10 flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Building your intelligence feed…
        </div>
      ) : visible.length === 0 ? (
        <section className="mt-10 rounded-2xl border border-white/[0.07] bg-black/20 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            What changed since your last visit
          </p>
          <p className="mt-2 text-sm text-slate-400">
            No material decision changes yet. Watch Instant Decisions, re-run searches, and return —
            QuantAI will rank every real move here.
          </p>
        </section>
      ) : (
        <section className="qa-feed-list mt-8" aria-label="Decision feed items">
          <p className="mb-4 text-xs text-slate-500">
            {visible.length} update{visible.length === 1 ? "" : "s"} · ranked by decision impact
          </p>
          <div className="grid gap-3">
            {visible.map((item) => (
              <DecisionFeedCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
