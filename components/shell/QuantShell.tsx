"use client";

import { CockpitProvider } from "@/components/cockpit/cockpitContext";
import CommandPalette from "@/components/cockpit/CommandPalette";
import FloatingIntelDock from "@/components/cockpit/FloatingIntelDock";

export default function QuantShell({ children }: { children: React.ReactNode }) {
  return (
    <CockpitProvider>
      <a
        href="#qa-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:inline-flex focus:rounded-full focus:border focus:border-white/15 focus:bg-[#0b1220]/95 focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-white focus:shadow-lg focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-cyan-400/50"
      >
        Skip to content
      </a>
      {children}
      <CommandPalette />
      <FloatingIntelDock />
    </CockpitProvider>
  );
}
