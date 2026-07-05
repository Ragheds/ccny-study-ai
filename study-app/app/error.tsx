"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

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
      <div className="max-w-sm text-center">
        <BrandMark size="lg" variant="app" className="mx-auto mb-6" />

        <h1 className="mb-2 text-xl font-bold">Something went wrong</h1>

        <p className="mb-8 text-sm" style={{ color: "var(--app-muted)" }}>
          An unexpected error occurred. Your study data is saved locally and
          nothing was lost — try again or head back to your dashboard.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold transition hover:opacity-90"
            style={{ background: "var(--app-text)", color: "var(--app-bg)" }}
          >
            Try again
          </button>

          <Link
            href="/dashboard"
            className="rounded-xl border px-6 py-2.5 text-sm font-semibold transition"
            style={{
              background: "var(--app-surface-muted)",
              color: "var(--app-muted-strong)",
              borderColor: "var(--app-border)",
            }}
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}