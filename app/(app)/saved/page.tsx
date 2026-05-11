"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import TrustRibbon from "@/components/trust/TrustRibbon";
import { apiErrorText, isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";

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
            <h1 className="cockpit-display text-2xl text-white sm:text-3xl">Saved products</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Pulled from your account when Supabase is configured. Open any listing in a new tab or remove it
              from this list.
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
        <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {err}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="cockpit-glass-panel px-6 py-16 text-center">
          <p className="text-sm text-slate-400">Nothing saved yet.</p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium text-cyan-300 hover:underline">
            Analyze a product and tap Save on a card
          </Link>
        </div>
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
                  <p className="mt-1 text-xs text-slate-500">AI score · {item.ai_score}</p>
                )}
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
