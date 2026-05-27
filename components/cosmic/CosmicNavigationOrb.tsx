"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Menu, Sparkles, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/#quantai-results-anchor", label: "Galaxy" },
  { href: "/#qa-live-ribbon", label: "Ribbon" },
  { href: "/#compare", label: "Compare" },
  { href: "/#quantai-trust", label: "Trust" },
  { href: "/pricing", label: "Clearance" },
] as const;

export default function CosmicNavigationOrb() {
  const { isSignedIn } = useUser();
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside
        className="qa-intelligence-rail qa-unified-rail qc-nav-orb fixed inset-y-0 left-0 z-[80] hidden w-16 flex-col lg:flex"
        aria-label="QuantAI intelligence rail"
      >
        <div className="flex h-full min-h-0 flex-col items-center py-5">
          <span className="qa-intelligence-rail-label hidden xl:block" aria-hidden>
            QuantAI
          </span>
          <Link
            href="/"
            className="qc-nav-orb-mark mb-6 flex size-11 items-center justify-center"
            title="QuantAI home"
          >
            <Sparkles className="size-[18px] text-[#6E7BFF]" strokeWidth={1.25} aria-hidden />
          </Link>

          <nav className="flex flex-1 flex-col items-center gap-1">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="qc-nav-orb-link" title={l.label}>
                <span className="qc-nav-orb-link-glow" aria-hidden />
                <span>{l.label}</span>
              </a>
            ))}
          </nav>

          <div className="mt-auto flex w-full flex-col items-center gap-3 pt-4">
            {isSignedIn ? <UserButton /> : null}
            {!isSignedIn ? (
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button type="button" className="qc-nav-orb-signin">
                  In
                </button>
              </SignInButton>
            ) : null}
            <Link href="/dashboard" className="qc-nav-orb-cmd" title="Command center">
              CMD
            </Link>
          </div>
        </div>
      </aside>

      <header className="qc-nav-mobile fixed inset-x-0 top-0 z-[75] flex items-center justify-between gap-3 border-b border-violet-200/50 bg-white/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="qc-nav-orb-mark flex size-9 items-center justify-center">
            <Sparkles className="size-4 text-violet-600" strokeWidth={1.5} aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight text-zinc-800">QuantAI</span>
        </Link>
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-xl border border-violet-200/60 bg-white/80 text-zinc-700"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>

      {open ? (
        <div className="fixed inset-x-0 top-[3.25rem] z-[74] border-b border-violet-200/50 bg-white/90 px-4 py-4 backdrop-blur-xl lg:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-xl px-3 py-3 text-sm font-medium text-zinc-700 hover:bg-violet-50"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      ) : null}
    </>
  );
}
