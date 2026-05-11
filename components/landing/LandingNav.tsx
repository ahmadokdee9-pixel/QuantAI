"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Menu, Sparkles, X } from "lucide-react";
import { useState } from "react";
import FeedbackLauncher from "@/components/feedback/FeedbackLauncher";

const links = [
  { href: "/#features", label: "AI picks" },
  { href: "/#alerts", label: "Alerts" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#compare", label: "Compare" },
  { href: "/pricing", label: "Plans" },
] as const;

export default function LandingNav() {
  const { isSignedIn } = useUser();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#020617]/72 backdrop-blur-[24px] backdrop-saturate-150 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_12px_40px_-28px_rgba(0,0,0,0.65)]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 py-3.5 sm:py-4">
        <Link
          href="/"
          className="group flex items-center gap-2.5 shrink-0 rounded-xl pr-2 transition"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-500/25 border border-white/10 shadow-[0_0_24px_-4px_rgba(34,211,238,0.35)] transition group-hover:shadow-[0_0_32px_-2px_rgba(34,211,238,0.45)]">
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
              className="rounded-full px-3.5 py-2 text-[13px] font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white/90"
            >
              {l.label}
            </a>
          ))}
          <FeedbackLauncher variant="nav" className="ml-1" />
        </div>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <button
                type="button"
                className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-[13px] font-medium text-white/85 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                Sign in
              </button>
            </SignInButton>
          )}
          <Link
            href="/dashboard"
            className="rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 px-4 py-2 text-[13px] font-semibold text-slate-950 shadow-[0_0_24px_-4px_rgba(34,211,238,0.55)] transition hover:brightness-105 hover:shadow-[0_0_32px_-2px_rgba(34,211,238,0.5)]"
          >
            Dashboard
          </Link>
        </div>

        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80 lg:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open && (
        <div
          className="border-t border-white/[0.06] bg-[#030712]/95 backdrop-blur-xl px-4 py-4 lg:hidden motion-safe:animate-[fadeIn_0.2s_ease-out]"
        >
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-xl px-3 py-3 text-sm font-medium text-white/75 hover:bg-white/[0.05] hover:text-white"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <FeedbackLauncher variant="nav" className="w-full justify-center" />
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
