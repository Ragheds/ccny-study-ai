"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

const PRIMARY_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard?tab=ai", label: "AI Tutor" },
  { href: "/notes", label: "Notes" },
  { href: "/progress", label: "Progress" },
];

const SETUP_LINKS = [
  { href: "/majors", label: "Majors" },
  { href: "/courses", label: "Course Catalog" },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href.includes("?")) return false;
  const path = href.split("?")[0];
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

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

          <div className="flex items-center gap-1">
            {SETUP_LINKS.map((link) => {
              const isActive = isActivePath(pathname, link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "bg-[var(--app-accent-soft)] text-[var(--app-accent)]"
                      : "text-[var(--app-muted)] hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <ThemeToggle />
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

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--app-muted)]">
              Setup
            </p>

            <div className="grid gap-2">
              {SETUP_LINKS.map((link) => {
                const isActive = isActivePath(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-[var(--app-accent-soft)] text-[var(--app-accent)]"
                        : "bg-[var(--app-surface-muted)] text-[var(--app-muted)] hover:text-[var(--app-text)]"
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
              Theme
            </p>
            <ThemeToggle />
          </div>
        </div>
      )}
    </nav>
  );
}
