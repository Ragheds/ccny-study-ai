"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/majors", label: "Majors" },
  { href: "/courses", label: "Courses" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="border-b border-white/10 bg-black/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-bold tracking-tight hover:text-gray-300 transition"
        >
          CCNY Study AI
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/dashboard"
            className="ml-2 bg-white text-black text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-100 transition"
          >
            Open App →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span
            className={`block w-5 h-0.5 bg-white transition-transform ${menuOpen ? "rotate-45 translate-y-2" : ""}`}
          />
          <span
            className={`block w-5 h-0.5 bg-white transition-opacity ${menuOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`block w-5 h-0.5 bg-white transition-transform ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 px-6 py-4 flex flex-col gap-2">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}