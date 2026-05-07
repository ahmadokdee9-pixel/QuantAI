"use client";

import { useState } from "react";

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  async function handleSearch() {
    if (!query.trim()) return;

    setLoading(true);

    const res = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    const data = await res.json();

    setResults(data.products || []);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
          placeholder="Search market news..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <button
          onClick={handleSearch}
          className="rounded-xl bg-cyan-400 px-5 py-3 text-black font-bold"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      <div className="space-y-3">
        {results.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <h3 className="text-white font-bold">
              {item.title}
            </h3>

            <p className="text-gray-300 text-sm mt-2">
              {item.snippet}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}