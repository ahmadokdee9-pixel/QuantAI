"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Menu, Sparkles, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/#quantai-results-anchor", label: "Scan" },
  { href: "/#features", label: "Signals" },
  { href: "/#compare", label: "Compare" },
  { href: "/#quantai-trust", label: "Trust" },
  { href: "/pricing", label: "Access" },
] as const;

export default function OSNavigationRail() {
  const { isSignedIn } = useUser();
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside
        className="qx-os-rail qcc-os-rail pointer-events-none fixed inset-y-0 left-0 z-[80] hidden w-[4.25rem] flex-col border-r border-white/[0.06] lg:pointer-events-auto lg:flex xl:w-[4.75rem]"
        aria-label="QuantAI operating system navigation"
      >
        <div className="qcc-os-rail-inner flex h-full min-h-0 flex-col items-center py-5">
          <Link
            href="/"
            className="qx-os-rail-mark qcc-os-rail-mark mb-8 flex size-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]"
            title="QuantAI home"
          >
            <Sparkles className="size-[18px] text-slate-200/90" strokeWidth={1.5} aria-hidden />
          </Link>

          <nav className="flex flex-1 flex-col items-center gap-2">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="qx-os-rail-link qcc-os-rail-link flex w-full flex-col items-center gap-1 px-1 py-2.5 text-center"
                title={l.label}
              >
                <span className="qx-os-rail-link-bar qcc-os-rail-link-bar" aria-hidden />
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500/90">
                  {l.label}
                </span>
              </a>
            ))}
          </nav>

          <div className="mt-auto flex w-full flex-col items-center gap-3 pt-4">
            {isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button type="button" className="qcc-os-rail-cta text-[9px] font-semibold uppercase tracking-[0.12em]">
                  In
                </button>
              </SignInButton>
            )}
            <Link href="/dashboard" className="qcc-os-rail-cta-primary" title="Command center">
              CMD
            </Link>
          </div>
        </div>
      </aside>

      <header className="qcc-os-mobile-bar fixed inset-x-0 top-0 z-[75] flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
            <Sparkles className="size-4 text-slate-200" strokeWidth={1.5} aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight text-white/95">QuantAI</span>
        </Link>
        <button
          type="button"
          className="qcc-os-mobile-menu flex size-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>

      {open ? (
        <div className="qcc-os-mobile-drawer fixed inset-x-0 top-[3.25rem] z-[74] border-b border-white/[0.06] px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-3 text-sm font-medium text-slate-300/90 hover:bg-white/[0.04]"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex gap-2">
            {isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button type="button" className="qcc-os-rail-cta flex-1 py-2.5">
                  Sign in
                </button>
              </SignInButton>
            )}
            <Link href="/dashboard" className="qcc-os-rail-cta-primary flex-1 text-center py-2.5" onClick={() => setOpen(false)}>
              Command center
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
