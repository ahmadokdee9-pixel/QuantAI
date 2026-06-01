"use client";

import { useRef, useState } from "react";
import { clientThrottleMessage, createClientSearchThrottle } from "@/lib/search/clientSearchThrottle";
import { Loader2, Search } from "lucide-react";
import { apiErrorText, isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";
import {
  readCommerceSessionMemoryFromBrowser,
  writeCommerceSessionMemoryToBrowser,
} from "@/lib/intelligence/commerceSessionStorage";

type ShoppingHit = {
  title: string;
  store: string;
  price: number;
  displayPrice?: string;
  rating?: number | string;
  link?: string;
};

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ShoppingHit[]>([]);
  const clientSearchThrottleRef = useRef(createClientSearchThrottle());

  async function handleSearch() {
    if (!query.trim()) return;

    const throttle = clientSearchThrottleRef.current.check();
    if (!throttle.allowed) {
      setError(clientThrottleMessage(throttle.waitMs));
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
          Accept: "application/json",
          "X-Requested-With": "quantai-web",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          query,
          commerceMemory: readCommerceSessionMemoryFromBrowser(),
        }),
      });

      type SearchEnvelope = {
        success?: boolean;
        data?: { products?: ShoppingHit[]; meta?: Record<string, unknown> };
        message?: string;
        error?: string;
        retryAfter?: number;
      };
      const parsed = await readApiJson<SearchEnvelope>(res);
      if (parsed.notJson) {
        console.error("[search-box] Non-JSON response", {
          status: parsed.status,
          contentType: parsed.contentType,
          redirected: parsed.redirected,
          responseUrl: parsed.responseUrl,
          snippet: parsed.responseTextSnippet,
        });
      }
      const envelope = parsed.data;
      const searchData =
        envelope && typeof envelope === "object" && envelope.data && typeof envelope.data === "object"
          ? envelope.data
          : null;

      if (res.status === 401) {
        setError(apiErrorText(parsed, "Please sign in."));
        return;
      }

      if (res.status === 429) {
        const wait =
          envelope && typeof envelope.retryAfter === "number"
            ? ` Retry in ~${envelope.retryAfter}s.`
            : "";
        setError(apiErrorText(parsed, "Too many searches.") + wait);
        return;
      }

      if (!res.ok || isApiFailure(parsed)) {
        setError(apiErrorText(parsed, "Search failed."));
        return;
      }

      setResults(searchData?.products || []);
      const mem = searchData?.meta?.commerceSessionMemory;
      if (mem != null && typeof mem === "object") {
        writeCommerceSessionMemoryToBrowser(mem);
      }
      if (!searchData?.products?.length) {
        setError("No products found for this query.");
      }
    } catch {
      setError("Search failed. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-stretch">
        <div className="relative flex min-h-[48px] min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/30 px-3.5 transition-[border-color,box-shadow] duration-300 focus-within:border-cyan-400/30 focus-within:shadow-[0_0_0_1px_rgba(34,211,238,0.14)]">
          <Search className="size-4 shrink-0 text-cyan-400/35" strokeWidth={1.5} aria-hidden />
          <input
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm font-medium text-white placeholder:text-slate-500/70 placeholder:font-normal outline-none"
            placeholder="Refine a tray query — brand, budget, or risk posture…"
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

      {error ? (
        <p className="rounded-xl border border-amber-300/45 bg-amber-50 px-3 py-2 text-xs text-amber-900">{error}</p>
      ) : null}

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
