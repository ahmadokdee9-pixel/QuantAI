"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";

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
      <div className="flex gap-2">
        <input
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
          placeholder="Search products (e.g. wireless earbuds)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />

        <button
          type="button"
          onClick={handleSearch}
          className="rounded-xl bg-cyan-400 px-5 py-3 text-black font-bold shrink-0"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-amber-200 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {results.map((item, index) => (
          <div
            key={`${item.link ?? item.title}-${index}`}
            className="rounded-xl border border-white/10 bg-white/5 p-4 text-left"
          >
            <h3 className="text-white font-bold">{item.title}</h3>

            <p className="text-gray-300 text-sm mt-2">
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
                rel="noreferrer"
                className="inline-block mt-3 text-cyan-300 text-sm font-semibold hover:text-cyan-200"
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
