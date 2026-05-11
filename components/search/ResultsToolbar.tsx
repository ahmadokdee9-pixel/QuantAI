"use client";

import type { Dispatch, SetStateAction } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, SlidersHorizontal, X } from "lucide-react";
import type { ResultsFiltersState } from "@/lib/resultsFilters";

type Props = {
  sort: string;
  setSort: (v: string) => void;
  filters: ResultsFiltersState;
  setFilters: Dispatch<SetStateAction<ResultsFiltersState>>;
  filterPanelOpen: boolean;
  setFilterPanelOpen: (v: boolean) => void;
  resultCount: number;
  activeFilterCount: number;
  onClearFilters: () => void;
};

export default function ResultsToolbar({
  sort,
  setSort,
  filters,
  setFilters,
  filterPanelOpen,
  setFilterPanelOpen,
  resultCount,
  activeFilterCount,
  onClearFilters,
}: Props) {
  return (
    <motion.div
      layout
      className="sticky top-[3.25rem] z-30 -mx-4 px-4 py-3.5 sm:-mx-6 sm:px-6 mb-8 border-b border-white/[0.07] bg-[#030712]/78 backdrop-blur-[28px] backdrop-saturate-150 supports-[backdrop-filter]:bg-[#030712]/55 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.9),0_0_48px_-36px_rgba(34,211,238,0.08)]"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="cockpit-overline flex items-center gap-1.5 text-slate-500">
            <SlidersHorizontal className="size-3.5 text-cyan-400/50" aria-hidden />
            Tray controls
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="min-h-11 rounded-2xl border border-white/12 bg-white/[0.07] px-4 py-2.5 text-[13px] font-medium text-white/92 outline-none transition hover:border-cyan-400/28 focus:border-cyan-400/45 focus:ring-2 focus:ring-cyan-400/15"
          >
            <option value="value">Best value (QI composite)</option>
            <option value="ai">Best model layer</option>
            <option value="cheap">Lowest price</option>
            <option value="trust">Most trusted store</option>
          </select>

          <button
            type="button"
            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-2.5 text-[13px] font-medium text-slate-200 transition hover:border-cyan-400/25 hover:bg-white/[0.08]"
            aria-expanded={filterPanelOpen}
          >
            <Filter className="size-4 text-cyan-300/80" aria-hidden />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-cyan-400/25 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-cyan-100">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 rounded-2xl border border-white/10 px-3 py-2 text-[12px] font-medium text-slate-400 transition hover:border-rose-400/25 hover:bg-rose-500/10 hover:text-rose-200"
            >
              <X className="size-3.5" aria-hidden />
              Clear
            </button>
          )}
        </div>

        <p className="text-[12px] font-medium text-slate-500 lg:text-right">
          <span className="tabular-nums text-slate-200">{resultCount}</span> live nodes · Compare lane ·
          3 max
        </p>
      </div>

      <AnimatePresence initial={false}>
        {filterPanelOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 grid gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-2 lg:grid-cols-5">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Min €
                </span>
                <input
                  type="number"
                  min={0}
                  value={filters.minPrice}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, minPrice: e.target.value }))
                  }
                  placeholder="0"
                  className="w-full rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-[13px] text-white outline-none transition focus:border-cyan-400/40"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Max €
                </span>
                <input
                  type="number"
                  min={0}
                  value={filters.maxPrice}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, maxPrice: e.target.value }))
                  }
                  placeholder="∞"
                  className="w-full rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-[13px] text-white outline-none transition focus:border-cyan-400/40"
                />
              </label>
              <label className="block sm:col-span-2 lg:col-span-1">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Brand / keyword
                </span>
                <input
                  type="search"
                  value={filters.brand}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, brand: e.target.value }))
                  }
                  placeholder="In title…"
                  className="w-full rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-[13px] text-white outline-none transition focus:border-cyan-400/40"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Min rating
                </span>
                <select
                  value={filters.minRating}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, minRating: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-[13px] text-white outline-none transition focus:border-cyan-400/40"
                >
                  <option value="">Any</option>
                  <option value="3">3+</option>
                  <option value="3.5">3.5+</option>
                  <option value="4">4+</option>
                  <option value="4.5">4.5+</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Min store trust
                </span>
                <select
                  value={filters.minTrust}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, minTrust: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-[13px] text-white outline-none transition focus:border-cyan-400/40"
                >
                  <option value="">Any</option>
                  <option value="55">55+</option>
                  <option value="65">65+</option>
                  <option value="75">75+</option>
                  <option value="85">85+</option>
                </select>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
