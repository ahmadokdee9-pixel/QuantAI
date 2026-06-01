"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { LayoutDashboard, Bookmark, CreditCard, Home, Sparkles } from "lucide-react";
import AmbientBackdrop from "@/components/cockpit/AmbientBackdrop";
import EnterpriseFooter from "@/components/layout/EnterpriseFooter";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Workspace", icon: LayoutDashboard },
  { href: "/saved", label: "Memory shelf", icon: Bookmark },
  { href: "/pricing", label: "Access layers", icon: Sparkles },
  { href: "/billing", label: "Clearance", icon: CreditCard },
] as const;

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <div className="qa-page-canvas relative min-h-screen overflow-x-hidden">
      <AmbientBackdrop />
      <div className="relative z-10">
        <header className="qa-chrome-header z-40">
          <div className="qa-content-wrap flex min-w-0 flex-wrap items-center justify-between gap-3 py-3">
            <Link href="/dashboard" className="qa-chrome-brand shrink-0">
              <span className="qa-chrome-mark size-8">
                <Sparkles className="size-4" aria-hidden />
              </span>
              QuantAI
            </Link>
            <nav className="qa-scroll-touch flex min-w-0 max-w-full flex-1 flex-nowrap items-center justify-end gap-1 overflow-x-auto overflow-y-visible overscroll-x-contain py-0.5 text-[13px] sm:max-w-none sm:flex-none sm:justify-end sm:overflow-visible sm:py-0">
              {nav.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== "/" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`qa-nav-pill ${active ? "qa-nav-pill--active" : ""}`}
                  >
                    <motion.span
                      className="inline-flex items-center gap-1.5"
                      whileHover={reduceMotion ? undefined : { y: -1 }}
                      transition={{ type: "spring", stiffness: 420, damping: 28 }}
                    >
                      <Icon className="size-3.5 opacity-75" aria-hidden />
                      {label}
                    </motion.span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>
        <main className="qa-content-wrap qa-ref-workspace qa-ref-workspace-intel py-8 sm:py-10">{children}</main>
        <div className="qa-content-wrap">
          <EnterpriseFooter />
        </div>
      </div>
    </div>
  );
}
