"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-400/40 bg-blue-400/15 text-sm font-black tracking-tight text-blue-100 shadow-[0_0_24px_rgba(96,165,250,0.18)]">
            CC
          </span>

          <span className="leading-tight">
            <span className="block text-base font-bold tracking-tight text-white">
              CCNY Study AI
            </span>
            <span className="hidden text-[11px] font-medium uppercase tracking-widest text-blue-300 sm:block">
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
                      ? "bg-white text-black"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="h-6 w-px bg-white/10" />

          <div className="flex items-center gap-1">
            {SETUP_LINKS.map((link) => {
              const isActive = isActivePath(pathname, link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "bg-blue-400/15 text-blue-100"
                      : "text-gray-500 hover:bg-white/5 hover:text-gray-200"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <button
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 text-white lg:hidden"
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
        <div className="border-t border-white/10 px-6 py-4 lg:hidden">
          <div className="mb-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-600">
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
                        ? "bg-white text-black"
                        : "bg-white/5 text-gray-300 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-600">
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
                        ? "bg-blue-400/15 text-blue-100"
                        : "bg-white/5 text-gray-400 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}