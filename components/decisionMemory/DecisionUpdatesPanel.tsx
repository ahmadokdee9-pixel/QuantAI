"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Loader2 } from "lucide-react";
import { isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";
import {
  listLocalDecisionUpdates,
  markLocalUpdatesSeen,
  touchLocalVisit,
} from "@/lib/decisionMemory/clientMemory";
import type { DecisionUpdateItem } from "@/lib/decisionMemory/types";

type Props = {
  signedIn?: boolean;
  compact?: boolean;
};

export default function DecisionUpdatesPanel({ signedIn = false, compact = false }: Props) {
  const [items, setItems] = useState<DecisionUpdateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      touchLocalVisit();
      try {
        if (signedIn) {
          const res = await fetch("/api/intelligence/decision-updates", {
            credentials: "same-origin",
          });
          const parsed = await readApiJson<{ items?: DecisionUpdateItem[] }>(res);
          if (!cancelled) {
            if (!isApiFailure(parsed) && Array.isArray(parsed.data?.items)) {
              setItems(parsed.data.items);
            } else {
              setItems(listLocalDecisionUpdates());
            }
          }
        } else if (!cancelled) {
          setItems(listLocalDecisionUpdates());
        }
      } finally {
        if (!cancelled) {
          markLocalUpdatesSeen();
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Checking decision updates…
      </div>
    );
  }

  if (items.length === 0) {
    if (compact) return null;
    return (
      <section className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          What changed since your last visit
        </p>
        <p className="mt-2 text-sm text-slate-400">
          No decision changes yet. Run a search, open Instant Decision, and return later to see movement.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.06] ${compact ? "p-3.5" : "p-4 sm:p-5"}`}
      aria-label="What changed since your last visit"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200/75">
            What changed since your last visit
          </p>
          <h2 className="mt-1 text-base font-semibold text-white">
            {items.length} decision update{items.length === 1 ? "" : "s"}
          </h2>
        </div>
        <Activity className="size-4 text-cyan-200/80" aria-hidden />
      </div>
      <ul className="grid gap-2">
        {items.slice(0, compact ? 4 : 10).map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2.5"
          >
            <p className="text-sm font-medium text-white line-clamp-1">
              {item.productTitle || "Product decision"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-cyan-100/85">{item.summary}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {item.changes.map((change) => (
                <span
                  key={`${item.id}-${change.kind}-${change.label}`}
                  className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-100"
                >
                  {change.kind.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        <Link href="/decisions" className="font-semibold text-cyan-200 hover:text-white">
          Open decision timeline
        </Link>
        <Link href="/watchlist" className="font-semibold text-slate-300 hover:text-white">
          Watched decisions
        </Link>
      </div>
    </section>
  );
}
