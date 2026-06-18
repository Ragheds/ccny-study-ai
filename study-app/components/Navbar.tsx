"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { useStoredValue } from "@/hooks/useStoredValue";
import { AccountProfile } from "@/lib/account";
import { KEYS } from "@/lib/storage";

const PRIMARY_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard?tab=ai", label: "AI Tutor" },
  { href: "/notes", label: "Notes" },
  { href: "/progress", label: "Progress" },
  { href: "/dashboard/account", label: "Settings" },
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
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [account, setAccount] = useStoredValue<AccountProfile | null>(KEYS.ACCOUNT, null);
  const accountHref = account ? "/dashboard/account" : "/login";
  const accountLabel = account ? "Account" : "Sign in";
  const isHome = pathname === "/";
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const scrollHomeToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openDashboardHome = () => {
    window.dispatchEvent(new Event("ccny-dashboard-home"));
  };
  const closeMenus = () => {
    setMenuOpen(false);
    setProfileMenuOpen(false);
  };
  const handleLogout = () => {
    setAccount(null);
    closeMenus();
    router.push("/");
  };

  if (isAuthPage) return null;

  if (isHome) {
    return (
      <nav className="home-nav-shell fixed left-1/2 top-4 z-50 w-[calc(100%-3rem)] max-w-[36rem] -translate-x-1/2 rounded-[1.7rem] border px-3 py-2 text-white backdrop-blur-xl sm:top-5 sm:w-[78%] sm:px-4 sm:py-2.5 lg:w-[calc(100%-2rem)] lg:max-w-6xl lg:rounded-[2rem] lg:px-7 lg:py-3">
        <div className="relative flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={scrollHomeToTop}
            className="flex items-center gap-3 text-left"
            aria-label="Scroll to top"
          >
            <BrandMark size="sm" variant="home" priority />
            <span className="text-sm font-black tracking-normal sm:text-base lg:text-lg">CCNY Study AI</span>
          </button>

          <span className="home-nav-haze hidden md:block" aria-hidden="true" />

          <Link
            href={account ? "/dashboard" : "/signup"}
            className="rounded-2xl border border-white/[0.22] bg-white/[0.08] px-4 py-2 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:bg-white/[0.13] sm:px-5 sm:py-2.5"
          >
            {account ? "Dashboard" : "Start now"}
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--app-border)] bg-[var(--app-nav)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <Link
          href="/dashboard"
          onClick={openDashboardHome}
          className="group flex items-center gap-3 transition-opacity duration-200 hover:opacity-80 active:opacity-60"
          aria-label="Open dashboard home"
        >
          <BrandMark size="md" variant="app" />

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

          {account ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((value) => !value)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActivePath(pathname, accountHref)
                    ? "bg-[var(--app-text)] text-[var(--app-bg)]"
                    : "text-[var(--app-muted-strong)] hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]"
                }`}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--app-accent-soft)] text-[11px] font-black text-[var(--app-accent)]">
                  {account.initials}
                </span>
                <span className="max-w-32 truncate">{account.name}</span>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2 shadow-xl">
                  <Link
                    href="/dashboard/account"
                    onClick={closeMenus}
                    className="block rounded-xl px-3 py-2 text-sm font-semibold text-[var(--app-muted-strong)] transition hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]"
                  >
                    Account Settings
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                isActivePath(pathname, accountHref)
                  ? "bg-[var(--app-text)] text-[var(--app-bg)]"
                  : "text-[var(--app-muted-strong)] hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]"
              }`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--app-accent-soft)] text-[11px] font-black text-[var(--app-accent)]">
                SI
              </span>
              {accountLabel}
            </Link>
          )}
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

            {account ? (
              <div>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((value) => !value)}
                  className="flex w-full items-center gap-3 rounded-lg bg-[var(--app-surface-muted)] px-4 py-3 text-left text-sm font-medium text-[var(--app-muted-strong)] transition hover:text-[var(--app-text)]"
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--app-accent-soft)] text-xs font-black text-[var(--app-accent)]">
                    {account.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-[var(--app-text)]">
                      {account.name}
                    </span>
                    <span className="block truncate text-xs text-[var(--app-muted)]">
                      {account.email}
                    </span>
                  </span>
                </button>

                {profileMenuOpen && (
                  <div className="mt-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2 shadow-sm">
                    <Link
                      href="/dashboard/account"
                      onClick={closeMenus}
                      className="block rounded-xl px-3 py-2 text-sm font-semibold text-[var(--app-muted-strong)] transition hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]"
                    >
                      Account
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                onClick={closeMenus}
                className="flex items-center gap-3 rounded-lg bg-[var(--app-surface-muted)] px-4 py-3 text-sm font-medium text-[var(--app-muted-strong)] transition hover:text-[var(--app-text)]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--app-accent-soft)] text-xs font-black text-[var(--app-accent)]">
                  SI
                </span>
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
