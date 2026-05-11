"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Bookmark, CreditCard, Home, Sparkles } from "lucide-react";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/pricing", label: "Plans", icon: Sparkles },
  { href: "/billing", label: "Billing", icon: CreditCard },
] as const;

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#020617]/85 backdrop-blur-[20px]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight text-white/95">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/25 to-violet-500/25 border border-white/10">
              <Sparkles className="size-4 text-cyan-200" aria-hidden />
            </span>
            QuantAI
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {nav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition ${
                    active
                      ? "bg-white/[0.1] text-white"
                      : "text-slate-400 hover:bg-white/[0.06] hover:text-white/90"
                  }`}
                >
                  <Icon className="size-3.5 opacity-70" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
