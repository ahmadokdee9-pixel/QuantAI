"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Loader2, Search } from "lucide-react";

type ShoppingHit = {
  title: string;
  store: string;
  price: number;
  displayPrice?: string;
  rating?: number | string;
  link?: string;
};

export default function SearchBox() {
  const { isSignedIn } = useUser();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ShoppingHit[]>([]);

  async function handleSearch() {
    if (!query.trim()) return;

    if (!isSignedIn) {
      setError("Sign in to search live shopping results.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ query }),
      });

      const data = (await res.json()) as {
        products?: ShoppingHit[];
        error?: string;
        retryAfter?: number;
      };

      if (res.status === 401) {
        setError(data.error || "Please sign in.");
        return;
      }

      if (res.status === 429) {
        const wait = data.retryAfter ? ` Retry in ~${data.retryAfter}s.` : "";
        setError((data.error || "Too many searches.") + wait);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Search failed.");
        return;
      }

      setResults(data.products || []);
      if (!data.products?.length) {
        setError("No products found for this query.");
      }
    } catch {
      setError("Search failed. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="relative flex min-h-[48px] flex-1 items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/25 px-4 transition focus-within:border-cyan-400/30">
          <Search className="size-4 shrink-0 text-cyan-300/45" strokeWidth={1.5} aria-hidden />
          <input
            className="min-w-0 flex-1 bg-transparent py-2 text-sm font-normal text-white placeholder:text-slate-500 outline-none"
            placeholder="Try another product query…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>

        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-6 text-sm font-semibold text-slate-950 transition enabled:hover:brightness-105 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Searching
            </>
          ) : (
            "Search"
          )}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="text-sm font-medium text-amber-100/95 rounded-2xl border border-amber-400/25 bg-amber-500/[0.08] px-3 py-2.5"
        >
          {error}
        </p>
      )}

      <div className="space-y-2">
        {results.map((item, index) => (
          <div
            key={`${item.link ?? item.title}-${index}`}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-left transition hover:border-white/12"
          >
            <h3 className="text-sm font-semibold text-white/90">{item.title}</h3>

            <p className="text-xs font-normal text-slate-500 mt-2 leading-relaxed">
              {item.store}
              {item.displayPrice
                ? ` · ${item.displayPrice}`
                : item.price
                  ? ` · €${item.price}`
                  : ""}
              {item.rating != null && item.rating !== "N/A"
                ? ` · ★ ${item.rating}`
                : ""}
            </p>

            {item.link && item.link !== "#" && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-xs font-semibold text-cyan-300/90 hover:text-cyan-200 transition"
              >
                View offer →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
