"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { LayoutDashboard, Bookmark, CreditCard, Home, Sparkles } from "lucide-react";
import AmbientBackdrop from "@/components/cockpit/AmbientBackdrop";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/pricing", label: "Plans", icon: Sparkles },
  { href: "/billing", label: "Billing", icon: CreditCard },
] as const;

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#020617] text-slate-100">
      <AmbientBackdrop />
      <div className="relative z-10">
        <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#020617]/78 backdrop-blur-[24px] backdrop-saturate-150 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
          <div className="mx-auto flex max-w-6xl min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link
              href="/dashboard"
              className="flex shrink-0 items-center gap-2 text-[15px] font-semibold tracking-tight text-white/95"
            >
              <span className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-cyan-400/25 to-violet-500/25 shadow-[0_0_20px_-6px_rgba(34,211,238,0.35)]">
                <Sparkles className="size-4 text-cyan-200" aria-hidden />
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
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition duration-300 ${
                      active
                        ? "bg-white/[0.12] text-white shadow-[0_0_24px_-12px_rgba(34,211,238,0.25)]"
                        : "text-slate-400 hover:bg-white/[0.06] hover:text-white/92"
                    }`}
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
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
