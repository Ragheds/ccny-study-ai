"use client";

import { useEffect } from "react";

// This only fires if the ROOT layout itself throws (e.g. ThemeProvider,
// SupabaseAccountBridge, or Navbar crashing during render). It has to
// render its own <html>/<body> because the real layout is the thing that
// broke. app/error.tsx handles every normal in-page crash; this is the
// last-resort net underneath that.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fb",
          color: "#111827",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ maxWidth: 360, textAlign: "center", padding: "0 24px" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            CCNY Study AI hit a snag
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
            Something went wrong loading the app. Your saved courses and
            study data are untouched — reloading almost always fixes this.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              borderRadius: 12,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 600,
              background: "#111827",
              color: "#f5f7fb",
              border: "none",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}