"use client";

import { useTheme } from "next-themes";
import { useHydrated } from "@/hooks/useStoredValue";

const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const activeTheme = hydrated ? theme ?? "system" : "system";

  return (
    <div
      className="grid grid-cols-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-1 text-xs font-semibold"
      aria-label="Theme selector"
    >
      {THEME_OPTIONS.map((option) => {
        const isActive = activeTheme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={`rounded-lg px-3 py-2 transition ${
              isActive
                ? "bg-[var(--app-text)] text-[var(--app-bg)] shadow-sm"
                : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
