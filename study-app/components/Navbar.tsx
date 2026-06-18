"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStoredValue } from "@/hooks/useStoredValue";
import { AccountProfile } from "@/lib/account";
import { KEYS } from "@/lib/storage";

const PRIMARY_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard?tab=ai", label: "AI Tutor" },
  { href: "/notes", label: "Notes" },
  { href: "/progress", label: "Progress" },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href.includes("?")) return false;
  const path = href.split("?")[0];
  if (path === "/") return pathname === "/";
  if (path === "/dashboard") {
    return pathname === "/dashboard" || /^\/dashboard\/(?!account$)[^/]+$/.test(pathname);
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [account] = useStoredValue<AccountProfile | null>(KEYS.ACCOUNT, null);
  const accountHref = account ? "/dashboard/account" : "/login";
  const accountLabel = account ? "Account" : "Sign in";

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--app-border)] bg-[var(--app-nav)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-400/40 bg-[var(--app-accent-soft)] text-sm font-black tracking-tight text-[var(--app-accent)] shadow-[0_0_24px_rgba(37,99,235,0.16)]">
            CC
          </span>

          <span className="leading-tight">
            <span className="block text-base font-bold tracking-tight text-[var(--app-text)]">
              CCNY Study AI
            </span>
            <span className="hidden text-[11px] font-medium uppercase tracking-widest text-[var(--app-accent)] sm:block">
              Course-aware workspace
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-4 lg:flex">
          <div className="flex items-center gap-1">
            {PRIMARY_LINKS.map((link) => {
              const isActive = isActivePath(pathname, link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-[var(--app-text)] text-[var(--app-bg)]"
                      : "text-[var(--app-muted-strong)] hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="h-6 w-px bg-[var(--app-border)]" />

          <Link
            href={accountHref}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              isActivePath(pathname, accountHref)
                ? "bg-[var(--app-text)] text-[var(--app-bg)]"
                : "text-[var(--app-muted-strong)] hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]"
            }`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--app-accent-soft)] text-[11px] font-black text-[var(--app-accent)]">
              {account?.initials ?? "SI"}
            </span>
            {accountLabel}
          </Link>
        </div>

        <button
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg border border-[var(--app-border)] text-[var(--app-text)] lg:hidden"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          <span
            className={`block h-0.5 w-5 bg-current transition-transform ${
              menuOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-5 bg-current transition-opacity ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-5 bg-current transition-transform ${
              menuOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-[var(--app-border)] px-6 py-4 lg:hidden">
          <div className="mb-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--app-muted)]">
              Workspace
            </p>

            <div className="grid gap-2">
              {PRIMARY_LINKS.map((link) => {
                const isActive = isActivePath(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-[var(--app-text)] text-[var(--app-bg)]"
                        : "bg-[var(--app-surface-muted)] text-[var(--app-muted-strong)] hover:text-[var(--app-text)]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--app-muted)]">
              Account
            </p>

            <Link
              href={accountHref}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg bg-[var(--app-surface-muted)] px-4 py-3 text-sm font-medium text-[var(--app-muted-strong)] transition hover:text-[var(--app-text)]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--app-accent-soft)] text-xs font-black text-[var(--app-accent)]">
                {account?.initials ?? "SI"}
              </span>
              {accountLabel}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
