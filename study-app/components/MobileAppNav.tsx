"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Home", icon: "⌂" },
  { href: "/dashboard?tab=notes", label: "Notes", icon: "▤" },
  { href: "/progress", label: "Progress", icon: "◫" },
  { href: "/dashboard/account", label: "Account", icon: "◯" },
] as const;

export function MobileAppNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <nav aria-label="App navigation" className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(4rem+env(safe-area-inset-bottom))] grid-cols-4 border-t border-[var(--app-border)] bg-[var(--app-nav)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      {LINKS.map((item) => {
        const active = item.href === "/dashboard"
          ? pathname === "/dashboard" && !searchParams.has("tab")
          : item.href.includes("?tab=notes")
            ? pathname === "/dashboard" && searchParams.get("tab") === "notes"
            : pathname === item.href;
        return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
          className={`flex min-w-0 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition focus-visible:outline-2 focus-visible:outline-[var(--app-accent)] ${active ? "text-[var(--app-accent)]" : "text-[var(--app-muted-strong)]"}`}>
          <span className="text-lg leading-none" aria-hidden="true">{item.icon}</span>{item.label}
        </Link>;
      })}
    </nav>
  );
}
