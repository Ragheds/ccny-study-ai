"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStoredValue } from "@/hooks/useStoredValue";
import { KEYS } from "@/lib/storage";
import type { AutoNote, AutoNotesStore } from "@/lib/autoNotes";
import { downloadPack } from "@/lib/offline/db";
export function AutoNotesPanel({ courseCode }: { courseCode: string }) {
  const router = useRouter();
  const [store, setStore] = useStoredValue<AutoNotesStore>(KEYS.NOTES_V2, {});
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const notes = [...(store[courseCode]?.autoNotes ?? [])].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt,
  );
  function update(id: string, patch: Partial<AutoNote> | null) {
    setStore((current) => {
      const course = current[courseCode];
      if (!course) return current;
      return {
        ...current,
        [courseCode]: {
          ...course,
          updatedAt: Date.now(),
          autoNotes: (course.autoNotes ?? []).flatMap((note) =>
            note.id === id ? (patch ? [{ ...note, ...patch }] : []) : [note],
          ),
        },
      };
    });
  }
  async function convert(note: AutoNote, view: string) {
    setBusy(true);
    try {
      if (!navigator.onLine)
        throw Error(
          "Needs internet to create new study questions. Your notes stay available.",
        );
      const form = new FormData();
      form.set("courseCode", courseCode);
      form.set("text", note.text);
      const response = await fetch("/api/packs/upload", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      await downloadPack(data.pack);
      router.push(
        `/offline?pack=${encodeURIComponent(data.pack.id)}#${view}`,
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not prepare study questions.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="mb-6 space-y-3 rounded-xl border p-4"
      aria-label="Automatic notes"
    >
      <h2 className="text-lg font-semibold">Notes from your tutor</h2>
      <p className="text-sm">
        Excerpts from what was taught, up to 5,000 characters each. Check with
        your professor before relying on AI. Editing changes your copy.
      </p>
      {!notes.length && (
        <p>No taught notes yet. Complete a tutor reply or a whiteboard step.</p>
      )}
      {notes.map((note) => (
        <article key={note.id} className="space-y-2 rounded-lg border p-3">
          <p className="text-xs">
            {note.pinned ? "Pinned · " : ""}
            {note.source} · source {note.sourceId}
          </p>
          <label className="block">
            Edit taught note
            <textarea
              value={note.text}
              onChange={(event) =>
                update(note.id, { text: event.target.value })
              }
              maxLength={5000}
              className="block min-h-28 w-full rounded-lg border p-2"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => update(note.id, { pinned: !note.pinned })}>
              {note.pinned ? "Unpin" : "Pin"}
            </button>
            <button onClick={() => update(note.id, null)}>Delete note</button>
            <button disabled={busy} onClick={() => convert(note, "cards")}>
              Turn into flashcards
            </button>
            <button disabled={busy} onClick={() => convert(note, "quiz")}>
              Turn into a quiz
            </button>
          </div>
        </article>
      ))}
      <p role="status">{status}</p>
    </section>
  );
}
