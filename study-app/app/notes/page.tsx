"use client";

import { useState } from "react";
import { useHydrated, useStoredValue } from "@/hooks/useStoredValue";
import { SavedMajor } from "@/lib/chatWorkspace";
import { KEYS } from "@/lib/storage";

type NotesEntry = {
  text: string;
  summary: string;
  updatedAt: number;
};

const EMPTY_NOTES: NotesEntry = { text: "", summary: "", updatedAt: 0 };

function StarburstLogo({ size = 28, white = false }: { size?: number; white?: boolean }) {
  const fill = white ? "#fff" : "url(#og)";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {!white && (
        <defs>
          <linearGradient id="og" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF6B35" />
            <stop offset="1" stopColor="#F7931E" />
          </linearGradient>
        </defs>
      )}
      <rect x="14" y="1" width="4" height="30" rx="2" fill={fill} />
      <rect x="14" y="1" width="4" height="30" rx="2" fill={fill} transform="rotate(60 16 16)" />
      <rect x="14" y="1" width="4" height="30" rx="2" fill={fill} transform="rotate(120 16 16)" />
    </svg>
  );
}

export default function NotesPage() {
  const hydrated = useHydrated();
  const [major] = useStoredValue<SavedMajor | null>(KEYS.MAJOR, null);
  const [entry, setEntry] = useStoredValue<NotesEntry>(KEYS.NOTES, EMPTY_NOTES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const summarize = async () => {
    const text = entry.text.trim();
    if (!text || loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          action: "summary",
          context: major
            ? { major: major.name, majorCode: major.code, school: major.school }
            : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to summarize notes.");
      }

      setEntry((current) => ({
        ...current,
        summary: data.response ?? "",
        updatedAt: Date.now(),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to summarize notes.");
    } finally {
      setLoading(false);
    }
  };

  const clearNotes = () => {
    if (typeof window !== "undefined" && !window.confirm("Clear these notes and their summary?")) {
      return;
    }
    setEntry(EMPTY_NOTES);
    setError("");
  };

  if (!hydrated) {
    return <main className="min-h-screen bg-[var(--app-bg)]" />;
  }

  return (
    <main className="flex min-h-screen flex-col" style={{ background: "var(--app-bg)", color: "var(--app-text)" }}>
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{
                background: "linear-gradient(135deg,#FF6B35,#F7931E)",
                boxShadow: "0 2px 8px rgba(255,107,53,.28)",
              }}
            >
              <StarburstLogo size={14} white />
            </div>
            <h1 className="text-2xl font-bold text-[var(--app-text)]">Notes</h1>
          </div>
          <p className="text-sm text-[var(--app-muted)] ml-11">
            Paste your lecture notes and get an AI-generated summary. Saved automatically to your account.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
          <textarea
            value={entry.text}
            onChange={(event) =>
              setEntry((current) => ({ ...current, text: event.target.value }))
            }
            placeholder="Paste your lecture or reading notes here…"
            className="h-64 w-full resize-none rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
          />

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={summarize}
              disabled={loading || !entry.text.trim()}
              className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #FF6B35, #F7931E)" }}
            >
              {loading ? "Summarizing…" : "Summarize Notes"}
            </button>

            {(entry.text || entry.summary) && (
              <button
                type="button"
                onClick={clearNotes}
                className="text-xs font-semibold text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
            {error}
          </div>
        )}

        {entry.summary && (
          <div className="mt-6 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b border-[var(--app-border)] px-5 py-4">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{
                  background: "linear-gradient(135deg,#FF6B35,#F7931E)",
                  boxShadow: "0 1px 6px rgba(255,107,53,.28)",
                }}
              >
                <StarburstLogo size={13} white />
              </div>
              <p className="text-sm font-semibold text-[var(--app-text)]">AI Summary</p>
            </div>

            <div className="px-5 py-5">
              <p className="text-sm leading-[1.8] text-[var(--app-text)] whitespace-pre-wrap">{entry.summary}</p>
            </div>

            <div className="border-t border-[var(--app-border)] px-5 py-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--app-muted)]">
                Original Notes
              </p>
              <p className="text-sm text-[var(--app-muted-strong)] whitespace-pre-wrap leading-relaxed line-clamp-4">
                {entry.text}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}