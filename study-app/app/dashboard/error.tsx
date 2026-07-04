"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: "var(--app-bg)", color: "var(--app-text)" }}
    >
      <div className="text-center max-w-sm">
        <div
          className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
          style={{ background: "var(--app-surface-muted)", border: "1px solid var(--app-border)" }}
        >
          ⚠️
        </div>

        <h1 className="text-xl font-bold mb-2">Something went wrong</h1>

        <p className="text-sm mb-8" style={{ color: "var(--app-muted)" }}>
          An unexpected error occurred. Your study data is safe — just try
          refreshing the page.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold transition"
            style={{
              background: "var(--app-text)",
              color: "var(--app-bg)",
            }}
          >
            Try again
          </button>

          <button
            onClick={() => window.location.reload()}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold transition"
            style={{
              background: "var(--app-surface-muted)",
              color: "var(--app-muted-strong)",
              border: "1px solid var(--app-border)",
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    </main>
  );
}
