"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bookmark,
  GitCompare,
  LayoutDashboard,
  Radar,
  Search,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Command Layer", icon: LayoutDashboard },
  { href: "/#pricing", label: "Clearance Architecture", icon: Sparkles },
  { href: "/how-it-works", label: "Intelligence Infrastructure", icon: Radar },
  { href: "/saved", label: "Signal Operations", icon: Bookmark },
  { href: "/#quantai-trust", label: "Governance Layer", icon: Activity },
  { href: "/dashboard", label: "Persistence Layer", icon: BarChart3 },
] as const;

export default function CommandSidebar() {
  const pathname = usePathname();

  return (
    <aside className="qa-ref-sidebar hidden lg:flex" aria-label="Command navigation">
      <div className="qa-ref-sidebar__brand">
        <span className="qa-ref-sidebar__logo" aria-hidden>
          <Sparkles className="size-[18px] text-white" strokeWidth={1.75} />
        </span>
        <div>
          <p className="qa-ref-sidebar__name">QuantAI</p>
          <p className="qa-ref-sidebar__tag">Commerce Intelligence OS</p>
        </div>
      </div>

      <nav className="qa-ref-sidebar__nav">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : href.startsWith("/#")
                ? false
                : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`qa-ref-sidebar__link ${active ? "qa-ref-sidebar__link--active" : ""}`}
            >
              <Icon className="size-[18px] shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="qa-ref-sidebar__status">
        <p className="qa-ref-sidebar__status-title">Infrastructure telemetry</p>
        <ul className="qa-ref-sidebar__status-list">
          <li><span>Signal mesh heartbeat</span><strong>Stable</strong></li>
          <li><span>Coverage mesh</span><strong>420+ markets</strong></li>
          <li><span>Inference latency</span><strong>&lt;2s</strong></li>
        </ul>
      </div>

      <div className="qa-ref-sidebar__quick">
        <p className="qa-ref-sidebar__status-title">Launch controls</p>
        <Link href="/#pricing" className="qa-ref-sidebar__quick-link">
          <Zap className="size-3.5" aria-hidden /> Elevate clearance
        </Link>
        <Link href="/dashboard" className="qa-ref-sidebar__quick-link">
          <Search className="size-3.5" aria-hidden /> Open persistence layer
        </Link>
        <Link href="/saved" className="qa-ref-sidebar__quick-link">
          <GitCompare className="size-3.5" aria-hidden /> Signal operations
        </Link>
      </div>
    </aside>
  );
}
