"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  live?: boolean;
};

/** Spatial intelligence scan zone — not a product grid section. */
export default function ClassifiedScanField({ children, live = false }: Props) {
  return (
    <section
      className={`qx-scan-field ${live ? "qx-scan-field--live" : ""}`}
      aria-label="Classified intelligence scan field"
    >
      <div className="qx-scan-field-atmosphere" aria-hidden />
      <div className="qx-scan-field-inner qx-scan-terminal">{children}</div>
    </section>
  );
}
