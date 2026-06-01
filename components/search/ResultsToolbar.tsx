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
      className="qa-ui-tray-console qa-os-toolbar sticky top-[3.25rem] z-30 -mx-4 mb-8 touch-manipulation px-4 py-3 sm:-mx-6 sm:px-6"
    >
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="cockpit-overline flex items-center gap-1.5">
            <SlidersHorizontal className="size-3.5 opacity-60" aria-hidden />
            Tray controls
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="qa-ui-tray-control min-h-11"
          >
            <option value="value">Best value (QI composite)</option>
            <option value="deals">Smart deals (verified discounts)</option>
            <option value="ai">Best model layer</option>
            <option value="cheap">Lowest price</option>
            <option value="trust">Most trusted store</option>
          </select>

          <button
            type="button"
            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
            className="qa-ui-tray-control inline-flex min-h-11 touch-manipulation items-center gap-2"
            aria-expanded={filterPanelOpen}
          >
            <Filter className="size-4 opacity-80" aria-hidden />
            Filters
            {activeFilterCount > 0 && (
              <span className="qa-ui-tray-filter-badge">{activeFilterCount}</span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onClearFilters}
              className="qa-ui-btn-ghost inline-flex items-center gap-1 px-3 py-2 text-[12px]"
            >
              <X className="size-3.5" aria-hidden />
              Clear
            </button>
          )}
        </div>

        <p className="text-[12px] font-medium text-slate-500 lg:text-right">
          <span className="tabular-nums text-slate-700">{resultCount}</span> live nodes · Compare lane · 3 max
        </p>
      </div>

      <AnimatePresence initial={false}>
        {filterPanelOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 grid gap-3 border-t border-[var(--qui-border)] pt-4 sm:grid-cols-2 lg:grid-cols-5">
              <label className="block">
                <span className="qa-ui-type-label mb-1.5 block">Min €</span>
                <input
                  type="number"
                  min={0}
                  value={filters.minPrice}
                  onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))}
                  placeholder="0"
                  className="qa-ui-tray-control w-full min-h-11 touch-manipulation"
                />
              </label>
              <label className="block">
                <span className="qa-ui-type-label mb-1.5 block">Max €</span>
                <input
                  type="number"
                  min={0}
                  value={filters.maxPrice}
                  onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
                  placeholder="∞"
                  className="qa-ui-tray-control w-full min-h-11 touch-manipulation"
                />
              </label>
              <label className="block sm:col-span-2 lg:col-span-1">
                <span className="qa-ui-type-label mb-1.5 block">Brand / keyword</span>
                <input
                  type="search"
                  value={filters.brand}
                  onChange={(e) => setFilters((f) => ({ ...f, brand: e.target.value }))}
                  placeholder="In title…"
                  className="qa-ui-tray-control w-full min-h-11 touch-manipulation"
                />
              </label>
              <label className="block">
                <span className="qa-ui-type-label mb-1.5 block">Min rating</span>
                <select
                  value={filters.minRating}
                  onChange={(e) => setFilters((f) => ({ ...f, minRating: e.target.value }))}
                  className="qa-ui-tray-control w-full min-h-11 touch-manipulation"
                >
                  <option value="">Any</option>
                  <option value="3">3+</option>
                  <option value="3.5">3.5+</option>
                  <option value="4">4+</option>
                  <option value="4.5">4.5+</option>
                </select>
              </label>
              <label className="block">
                <span className="qa-ui-type-label mb-1.5 block">Min store trust</span>
                <select
                  value={filters.minTrust}
                  onChange={(e) => setFilters((f) => ({ ...f, minTrust: e.target.value }))}
                  className="qa-ui-tray-control w-full min-h-11 touch-manipulation"
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
