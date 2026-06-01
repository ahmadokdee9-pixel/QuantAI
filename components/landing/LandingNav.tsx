"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Bell, Menu, Plus, Sparkles, X } from "lucide-react";
import { useState } from "react";

export default function LandingNav() {
  const { isSignedIn } = useUser();
  const [open, setOpen] = useState(false);

  return (
    <header className="qa-ref-topbar">
      <div className="qa-ref-topbar__inner">
        <div className="qa-ref-topbar__greeting lg:hidden">
          <span className="qa-ref-sidebar__logo qa-ref-sidebar__logo--sm" aria-hidden>
            <Sparkles className="size-4 text-white" strokeWidth={1.75} />
          </span>
          <div>
            <p className="qa-ref-topbar__title">QuantAI</p>
            <p className="qa-ref-topbar__subtitle">Commerce Intelligence OS</p>
          </div>
        </div>

        <div className="qa-ref-topbar__actions">
          <button type="button" className="qa-ref-topbar__icon-btn" aria-label="Notifications">
            <Bell className="size-[18px]" strokeWidth={1.5} />
          </button>
          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <button type="button" className="qa-ref-btn qa-ref-btn--ghost">
                Sign in
              </button>
            </SignInButton>
          )}
          <Link href="/dashboard" className="qa-ref-btn qa-ref-btn--primary">
            <Plus className="size-4" aria-hidden />
            Workspace
          </Link>
          <button
            type="button"
            className="qa-ref-topbar__icon-btn lg:hidden"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="qa-ref-mobile-nav lg:hidden">
          <Link href="/" onClick={() => setOpen(false)}>Command Center</Link>
          <Link href="/how-it-works" onClick={() => setOpen(false)}>How it works</Link>
          <Link href="/#pricing" onClick={() => setOpen(false)}>Access Layers</Link>
          <Link href="/dashboard" onClick={() => setOpen(false)}>Workspace</Link>
          <Link href="/saved" onClick={() => setOpen(false)}>Watchlist</Link>
        </div>
      ) : null}
    </header>
  );
}
