"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Sparkles, Trash2 } from "lucide-react";
import TrustRibbon from "@/components/trust/TrustRibbon";
import CockpitEmptyState from "@/components/empty/CockpitEmptyState";
import { apiErrorText, isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";
import { useCopilotSession } from "@/components/copilot/CopilotContext";
import { defaultCopilotSession } from "@/lib/copilot/sessionTypes";
import type { CopilotSessionPayload } from "@/lib/copilot/sessionTypes";
import { buildSavedItemInsights } from "@/lib/liveSignals/savedInsights";

type SavedRow = {
  id?: string;
  title: string | null;
  price: number | null;
  image: string | null;
  link: string;
  ai_score?: number | null;
  created_at?: string;
};

export default function SavedProductsPage() {
  const [items, setItems] = useState<SavedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const { setSession: setCopilotSession } = useCopilotSession();

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/intelligence/saved-products", { credentials: "same-origin" });
      const parsed = await readApiJson<{ items?: SavedRow[]; error?: string }>(res);
      if (!res.ok || isApiFailure(parsed)) {
        setErr(apiErrorText(parsed, "Could not load saved products."));
        setItems([]);
        return;
      }
      setItems(Array.isArray(parsed.data?.items) ? (parsed.data.items ?? []) : []);
    } catch {
      setErr("Could not load saved products.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const savedCopilotSession = useMemo((): CopilotSessionPayload | null => {
    if (loading) return null;
    return {
      ...defaultCopilotSession(),
      route: "saved",
      lastSearchQuery: "saved_products",
      savedSummaries: items.map((s) => ({
        title: s.title ?? "Saved item",
        link: s.link,
        price: s.price,
      })),
      memoryHints: ["context:saved_products_page"],
    };
  }, [loading, items]);

  useEffect(() => {
    if (!savedCopilotSession) return;
    setCopilotSession(savedCopilotSession);
  }, [savedCopilotSession, setCopilotSession]);

  async function remove(link: string) {
    try {
      const res = await fetch(
        `/api/intelligence/saved-products?link=${encodeURIComponent(link)}`,
        { method: "DELETE", credentials: "same-origin" }
      );
      const parsed = await readApiJson<{ error?: string }>(res);
      if (!res.ok || isApiFailure(parsed)) {
        setErr(apiErrorText(parsed, "Could not remove item."));
        return;
      }
      setItems((prev) => prev.filter((x) => x.link !== link));
      setErr(null);
    } catch {
      setErr("Could not remove item.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="cockpit-glass-panel p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="cockpit-display text-2xl text-white sm:text-3xl">Memory shelf</h1>
            <p className="cockpit-body mt-2 max-w-xl text-sm text-slate-400">
              Anchors QuantAI carries across sessions—Compare, Copilot, and your next scan all read this shelf.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-2.5 text-sm font-semibold text-slate-950"
            >
              Run new search
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-medium text-white/85"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      {err && (
        <p className="rounded-xl border border-amber-400/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-50/95">
          {err}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          Loading…
        </div>
      ) : items.length === 0 ? (
        <CockpitEmptyState
          title="Shelf is ready—add anchors from search"
          description="Save listings you might buy; QuantAI keeps them in memory for Compare, Copilot, and your next scan."
          primaryLabel="Open search"
          primaryHref="/"
          secondaryLabel="Dashboard"
          secondaryHref="/dashboard"
          icon={<Sparkles className="size-6 text-cyan-200/90" strokeWidth={1.5} aria-hidden />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.link}
              className="cockpit-glass-panel cockpit-card-lift flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
            >
              {item.image && (
                <div className="mx-auto size-24 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-white p-2 sm:mx-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt="" className="size-full object-contain" />
                </div>
              )}
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="font-medium leading-snug text-white/90 line-clamp-2">{item.title}</p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-emerald-300/90">
                  {item.price != null ? `€${item.price}` : "—"}
                </p>
                {item.ai_score != null && (
                  <p className="mt-1 text-[12px] text-slate-500">QI at save · {item.ai_score}</p>
                )}
                <ul className="mt-3 space-y-1.5 text-left">
                  {buildSavedItemInsights(item, items).map((ins) => (
                    <li
                      key={`${item.link}-${ins.headline}`}
                      className={`rounded-lg border border-white/[0.07] px-3 py-2 text-[12px] leading-snug ${
                        ins.tone === "positive"
                          ? "text-emerald-100/90"
                          : ins.tone === "watch"
                            ? "text-amber-100/90"
                            : "text-slate-400"
                      }`}
                    >
                      <span className="font-medium text-white/90">{ins.headline}</span>
                      <span className="mt-0.5 block text-slate-500">{ins.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap justify-center gap-2 sm:flex-col sm:justify-end">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Open listing
                  <ExternalLink className="size-3.5 opacity-70" aria-hidden />
                </a>
                <button
                  type="button"
                  onClick={() => void remove(item.link)}
                  className="inline-flex items-center justify-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-100 transition hover:bg-rose-500/20"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="mt-10">
          <TrustRibbon />
        </div>
      )}
    </div>
  );
}
