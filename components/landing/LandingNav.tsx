"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Menu, Sparkles, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/#features", label: "AI picks" },
  { href: "/#alerts", label: "Alerts" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#quantai-trust", label: "Trust & AI" },
  { href: "/#compare", label: "Compare" },
  { href: "/pricing", label: "Plans" },
] as const;

export default function LandingNav() {
  const { isSignedIn } = useUser();
  const [open, setOpen] = useState(false);

  return (
    <header className="qa-chrome-header">
      <nav className="qa-content-wrap flex items-center justify-between gap-4 py-3.5 sm:py-4">
        <Link href="/" className="qa-chrome-brand group shrink-0 pr-2">
          <span className="qa-chrome-mark size-9">
            <Sparkles className="size-[18px] text-cyan-200" strokeWidth={1.5} aria-hidden />
          </span>
          <div className="leading-tight text-left">
            <span className="block text-[15px] font-semibold tracking-tight text-white/95">
              QuantAI
            </span>
            <span className="hidden sm:block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Neural buying intelligence
            </span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="qa-nav-pill"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <button
                type="button"
                className="qa-btn-ghost px-4 py-2"
              >
                Sign in
              </button>
            </SignInButton>
          )}
          <Link
            href="/dashboard"
            className="qa-btn-primary px-4 py-2"
          >
            Dashboard
          </Link>
        </div>

        <button
          type="button"
          className="qa-icon-btn lg:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open && (
        <div
          className="qa-scroll-touch border-t border-white/[0.06] bg-[#030712]/95 backdrop-blur-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-4 lg:hidden motion-safe:animate-[fadeIn_0.2s_ease-out]"
        >
          <div className="flex max-h-[min(70dvh,28rem)] flex-col gap-1 overflow-y-auto">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="min-h-11 rounded-xl px-3 py-3 text-sm font-medium text-white/75 hover:bg-white/[0.05] hover:text-white"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            {isSignedIn ? (
              <div className="flex items-center gap-2 px-3 py-2">
                <UserButton />
                <span className="text-xs text-white/45">Account</span>
              </div>
            ) : (
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button
                  type="button"
                  className="w-full rounded-full border border-white/12 py-2.5 text-sm font-medium text-white/85"
                >
                  Sign in
                </button>
              </SignInButton>
            )}
            <Link
              href="/dashboard"
              className="w-full text-center rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 py-2.5 text-sm font-semibold text-slate-950"
              onClick={() => setOpen(false)}
            >
              Dashboard
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
