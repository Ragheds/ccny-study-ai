"use client";

import { useState } from "react";
import { useStoredValue } from "@/hooks/useStoredValue";
import { KEYS } from "@/lib/storage";
import { STUDY_MODES, type StudyMode } from "@/lib/studyMode";
import { saveStudyPreference } from "@/lib/supabase/studyMode";

export function StudyModeControl({ hasCourses }: { hasCourses: boolean }) {
  const [mode, setMode] = useStoredValue<StudyMode | null>(KEYS.STUDY_MODE, null);
  const [dismissed, setDismissed] = useStoredValue(KEYS.STUDY_MODE_DISMISSED, false);
  const [manualOpen, setManualOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const open = manualOpen || (hasCourses && !mode && !dismissed);
  const current = STUDY_MODES.find((item) => item.id === mode);

  async function choose(next: StudyMode | null) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await saveStudyPreference(next, true);
      setMode(next);
      setDismissed(true);
      setManualOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't save your preference.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setManualOpen(true)}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-xs font-semibold text-[var(--app-text)] transition hover:border-[var(--app-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]"
        aria-label={`Study mode: ${current?.label ?? "choose a style"}. Change study mode`}>
        <span aria-hidden="true">{current?.emoji ?? "✦"}</span>
        <span>{current?.label ?? "Study style"}</span>
        <span aria-hidden="true" className="text-[var(--app-muted)]">⌄</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center" onMouseDown={(event) => {
          if (event.target === event.currentTarget && manualOpen) setManualOpen(false);
        }}>
          <div role="dialog" aria-modal="true" aria-labelledby="study-mode-title"
            onKeyDown={(event) => { if (event.key === "Escape" && manualOpen) setManualOpen(false); }}
            className="w-full max-w-md rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-2xl sm:p-7">
            <div className="mb-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--app-accent)]">Your default, your choice</p>
              <h2 id="study-mode-title" className="text-2xl font-semibold text-[var(--app-text)]">How do you like to learn?</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--app-muted-strong)]">Pick a starting style. You can switch any time, and every study tool stays available.</p>
            </div>
            <div className="space-y-2">
              {STUDY_MODES.map((item, index) => (
                <button key={item.id} type="button" disabled={busy} autoFocus={index === 0}
                  onClick={() => void choose(item.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition hover:bg-[var(--app-surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--app-accent)] disabled:opacity-60 ${mode === item.id ? "border-[var(--app-accent)] bg-[var(--app-accent-soft)]" : "border-[var(--app-border)]"}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-surface-muted)] text-xl" aria-hidden="true">{item.emoji}</span>
                  <span><strong className="block text-sm text-[var(--app-text)]">{item.label}</strong><span className="text-xs text-[var(--app-muted-strong)]">{item.description}</span></span>
                </button>
              ))}
            </div>
            {error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}
            <button type="button" disabled={busy} onClick={() => void choose(null)}
              className="mt-4 w-full rounded-xl px-3 py-2 text-sm font-medium text-[var(--app-muted-strong)] transition hover:bg-[var(--app-surface-muted)] disabled:opacity-60">
              Skip for now
            </button>
          </div>
        </div>
      )}
    </>
  );
}
