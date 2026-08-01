"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";
import {
  listLocalDecisionMemory,
  listLocalWatchedDecisions,
  scoreHistoryForLink,
} from "@/lib/decisionMemory/clientMemory";
import type { DecisionMemoryEpisode } from "@/lib/decisionMemory/types";
import WhatsChangedBadges from "@/components/decisionMemory/WhatsChangedBadges";
import DecisionHistorySection from "@/components/decisionMemory/DecisionHistorySection";
import { buildLivingDecisionThread } from "@/lib/livingDecision/timeline";
import {
  listLocalEpisodesForDecisionId,
  listLocalEpisodesForLink,
} from "@/lib/decisionMemory/clientMemory";
import type { LivingDecisionThread } from "@/lib/livingDecision/types";

type Props = {
  mode: "timeline" | "watchlist";
  signedIn?: boolean;
};

function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `€${Math.round(value)}`;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function decisionClass(decision: string): string {
  switch (decision) {
    case "BUY":
      return "text-emerald-200 border-emerald-400/25 bg-emerald-500/10";
    case "WAIT":
      return "text-amber-100 border-amber-400/25 bg-amber-500/10";
    case "AVOID":
      return "text-rose-100 border-rose-400/25 bg-rose-500/10";
    default:
      return "text-sky-100 border-sky-400/25 bg-sky-500/10";
  }
}

export default function DecisionTimelineList({ mode, signedIn = false }: Props) {
  const [items, setItems] = useState<DecisionMemoryEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLink, setExpandedLink] = useState<string | null>(null);
  const [history, setHistory] = useState<
    Array<{ confidence: number; createdAt: string; decision: string }>
  >([]);
  const [livingThread, setLivingThread] = useState<LivingDecisionThread | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        if (signedIn) {
          const qs = mode === "watchlist" ? "?watched=1" : "";
          const res = await fetch(`/api/intelligence/decision-memory${qs}`, {
            credentials: "same-origin",
          });
          const parsed = await readApiJson<{ items?: DecisionMemoryEpisode[] }>(res);
          if (!cancelled) {
            if (!isApiFailure(parsed) && Array.isArray(parsed.data?.items) && parsed.data.items.length) {
              setItems(parsed.data.items);
            } else {
              setItems(mode === "watchlist" ? listLocalWatchedDecisions() : listLocalDecisionMemory());
            }
          }
        } else if (!cancelled) {
          setItems(mode === "watchlist" ? listLocalWatchedDecisions() : listLocalDecisionMemory());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, signedIn]);

  async function openHistory(link: string, decisionId?: string | null) {
    if (expandedLink === link) {
      setExpandedLink(null);
      setHistory([]);
      setLivingThread(null);
      return;
    }
    setExpandedLink(link);
    const key = decisionId || link;
    if (signedIn) {
      const res = await fetch(
        `/api/intelligence/decision-memory?history=1&living=1&link=${encodeURIComponent(key)}`,
        { credentials: "same-origin" }
      );
      const parsed = await readApiJson<{
        history?: Array<{ confidence: number; createdAt: string; decision: string }>;
        thread?: LivingDecisionThread | null;
      }>(res);
      if (!isApiFailure(parsed) && parsed.data) {
        if (parsed.data.thread) setLivingThread(parsed.data.thread);
        if (Array.isArray(parsed.data.history) && parsed.data.history.length) {
          setHistory(parsed.data.history);
          return;
        }
      }
    }
    const localEps = decisionId
      ? listLocalEpisodesForDecisionId(decisionId)
      : listLocalEpisodesForLink(link);
    setLivingThread(buildLivingDecisionThread(localEps));
    setHistory(scoreHistoryForLink(link));
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-slate-400">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading decision memory…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-slate-400">
        {mode === "watchlist"
          ? "No watched decisions yet. Open Instant Decision and tap Watch Decision."
          : "No decisions recorded yet. Run a search to create your first Instant Decision episode."}
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => {
        const priceChanged =
          item.currentPrice != null &&
          item.price != null &&
          Math.round(item.currentPrice) !== Math.round(item.price);
        const decisionChanged =
          item.currentDecision && item.currentDecision !== item.decision;
        const confidenceChanged =
          item.currentConfidence != null &&
          item.confidence != null &&
          Math.round(item.currentConfidence) !== Math.round(item.confidence);

        return (
          <article
            key={item.id}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${decisionClass(item.decision)}`}
                  >
                    {item.decision}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-white">
                    {item.confidence != null ? `${Math.round(item.confidence)}%` : "—"}
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-slate-500">
                    {item.status || "Recorded"}
                  </span>
                  {item.decisionId ? (
                    <span className="text-[10px] uppercase tracking-wide text-slate-500">
                      ID {item.decisionId.slice(0, 8)}
                    </span>
                  ) : null}
                  {item.domain ? (
                    <span className="text-[10px] uppercase tracking-wide text-slate-500">
                      {item.domain}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-2 text-sm font-semibold text-white line-clamp-2">
                  {item.productTitle || "Untitled product"}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  {item.merchant || "Merchant"} · {formatDate(item.createdAt)}
                  {item.searchQuery ? ` · “${item.searchQuery}”` : ""}
                </p>
              </div>
              {item.productLink ? (
                <a
                  href={item.productLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-white"
                >
                  Listing
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              ) : null}
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 px-2.5 py-2">
                <dt className="text-slate-500">Price at decision</dt>
                <dd className="mt-0.5 font-semibold text-white">{formatPrice(item.price)}</dd>
              </div>
              <div
                className={`rounded-xl border px-2.5 py-2 ${
                  priceChanged
                    ? "border-cyan-400/30 bg-cyan-500/10"
                    : "border-white/[0.06] bg-black/20"
                }`}
              >
                <dt className="text-slate-500">Current price</dt>
                <dd className="mt-0.5 font-semibold text-white">
                  {formatPrice(item.currentPrice ?? item.price)}
                  {priceChanged ? " · changed" : ""}
                </dd>
              </div>
              <div
                className={`rounded-xl border px-2.5 py-2 ${
                  confidenceChanged
                    ? "border-amber-400/30 bg-amber-500/10"
                    : "border-white/[0.06] bg-black/20"
                }`}
              >
                <dt className="text-slate-500">Confidence now</dt>
                <dd className="mt-0.5 font-semibold text-white">
                  {item.currentConfidence != null
                    ? `${Math.round(item.currentConfidence)}%`
                    : "—"}
                </dd>
              </div>
              <div
                className={`rounded-xl border px-2.5 py-2 ${
                  decisionChanged
                    ? "border-violet-400/30 bg-violet-500/10"
                    : "border-white/[0.06] bg-black/20"
                }`}
              >
                <dt className="text-slate-500">Decision now</dt>
                <dd className="mt-0.5 font-semibold text-white">
                  {item.currentDecision || item.decision}
                </dd>
              </div>
            </dl>

            {item.changes?.length ? (
              <div className="mt-3">
                <WhatsChangedBadges changes={item.changes} />
              </div>
            ) : null}

            {item.reasons?.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slate-400">
                {item.reasons.slice(0, 3).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}

            {(mode === "watchlist" || item.watched) && (
              <div className="mt-3 border-t border-white/[0.06] pt-3">
                <button
                  type="button"
                  onClick={() => void openHistory(item.productLink, item.decisionId)}
                  className="text-xs font-semibold text-cyan-200 hover:text-white"
                >
                  {expandedLink === item.productLink
                    ? "Hide living timeline"
                    : "Open living timeline"}
                </button>
                {item.scoreTrend ? (
                  <p className="mt-1 text-xs text-slate-400">
                    Trend:{" "}
                    <span className="font-semibold text-white">{item.scoreTrend}</span>
                    {item.previousConfidence != null && item.currentConfidence != null
                      ? ` · ${Math.round(item.previousConfidence)}% → ${Math.round(item.currentConfidence)}%`
                      : null}
                  </p>
                ) : null}
                {expandedLink === item.productLink ? (
                  <div className="mt-2">
                    {livingThread ? <DecisionHistorySection thread={livingThread} /> : null}
                    {history.length > 0 ? (
                      <ol className="mt-2 grid gap-1">
                        {history.map((point) => (
                          <li
                            key={`${point.createdAt}-${point.confidence}`}
                            className="flex items-center justify-between rounded-lg bg-black/25 px-2 py-1.5 text-[11px] text-slate-300"
                          >
                            <span>
                              {point.decision} · {point.confidence}%
                            </span>
                            <span className="text-slate-500">{formatDate(point.createdAt)}</span>
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
