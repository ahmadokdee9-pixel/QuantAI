"use client";

import LiveIntelligenceRail from "@/components/search/LiveIntelligenceRail";

type Props = {
  active: boolean;
  className?: string;
  searchQuery?: string;
};

export default function SearchStreamRibbon({ active, className = "", searchQuery = "" }: Props) {
  if (!active) return null;

  return <LiveIntelligenceRail live searchQuery={searchQuery} className={className} />;
}
