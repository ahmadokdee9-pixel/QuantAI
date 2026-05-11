"use client";

import { CockpitProvider } from "@/components/cockpit/cockpitContext";
import CommandPalette from "@/components/cockpit/CommandPalette";
import FloatingIntelDock from "@/components/cockpit/FloatingIntelDock";

export default function QuantShell({ children }: { children: React.ReactNode }) {
  return (
    <CockpitProvider>
      {children}
      <CommandPalette />
      <FloatingIntelDock />
    </CockpitProvider>
  );
}
