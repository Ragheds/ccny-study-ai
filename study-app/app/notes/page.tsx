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
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Notes</h1>
        <p className="text-[var(--app-muted)] mb-8">
          Paste your lecture or reading notes below and get an AI-generated summary.
          Your notes are saved automatically to this account.
        </p>

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
          <textarea
            value={entry.text}
            onChange={(event) =>
              setEntry((current) => ({ ...current, text: event.target.value }))
            }
            placeholder="Paste your notes here..."
            className="h-64 w-full resize-none rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
          />

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={summarize}
              disabled={loading || !entry.text.trim()}
              className="rounded-2xl bg-[var(--app-text)] px-5 py-3 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Summarizing..." : "Summarize Notes"}
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
          <div className="mt-8 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
            <h2 className="font-bold mb-3">AI Summary</h2>
            <p className="text-sm text-[var(--app-text)] whitespace-pre-wrap leading-relaxed">
              {entry.summary}
            </p>

            <div className="mt-6 border-t border-[var(--app-border)] pt-4">
              <h3 className="text-sm font-semibold text-[var(--app-muted)] mb-2">
                Original Notes
              </h3>
              <p className="text-sm text-[var(--app-muted-strong)] whitespace-pre-wrap leading-relaxed">
                {entry.text}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}