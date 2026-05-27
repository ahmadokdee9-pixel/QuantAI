"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Bookmark, CreditCard, Home, Sparkles } from "lucide-react";
import BetaShell from "@/components/beta/BetaShell";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/pricing", label: "Plans", icon: Sparkles },
  { href: "/billing", label: "Billing", icon: CreditCard },
] as const;

export default function BetaNav() {
  const pathname = usePathname();

  return (
    <header className="qbeta-nav">
      <BetaShell as="div" className="qbeta-nav-inner">
        <Link href="/" className="qbeta-brand">
          <span className="qbeta-brand-mark" aria-hidden>
            <Sparkles className="size-4" />
          </span>
          QuantAI
        </Link>
        <nav className="qbeta-nav-links" aria-label="Main">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`qbeta-nav-link ${active ? "qbeta-nav-link--active" : ""}`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon className="size-3.5 opacity-70" aria-hidden />
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </BetaShell>
    </header>
  );
}
