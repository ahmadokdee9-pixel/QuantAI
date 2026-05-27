"use client";

import type { ReactNode } from "react";

type Props = {
  rail: ReactNode;
  children: ReactNode;
};

/**
 * Command-center page shell — OS rail + main intelligence stage.
 * Visual structure only.
 */
export default function CommandCenterLayout({ rail, children }: Props) {
  return (
    <div className="qcc-os-root relative min-h-screen">
      {rail}
      <div className="qcc-os-main relative min-h-screen min-w-0">{children}</div>
    </div>
  );
}
