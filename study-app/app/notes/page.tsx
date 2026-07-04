"use client";

import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStoredValue, useHydrated } from "@/hooks/useStoredValue";
import { SavedCourse, SavedMajor } from "@/lib/chatWorkspace";
import { KEYS, readStorageRaw } from "@/lib/storage";
import { StarburstLogo } from "@/components/StarburstLogo";

/* ── types ─────────────────────────────────────────────────────── */
type CourseNote = { text: string; summary: string; updatedAt: number };
// KEYS.NOTES_V2 → per-course store  (KEYS.NOTES is the old single-note key)
type NotesStore = Record<string, CourseNote>;
type Toast = { id: string; msg: string; type: "success" | "error" };

function isCourseNote(value: unknown): value is CourseNote {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof (value as CourseNote).text === "string" &&
      typeof (value as CourseNote).summary === "string" &&
      typeof (value as CourseNote).updatedAt === "number"
  );
}

/* ── markdown renderer (same palette as AITutor) ────────────────── */
function MD({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
      h1: ({ children }) => <h1 className="mb-3 mt-1 text-xl font-bold text-[var(--app-text)]">{children}</h1>,
      h2: ({ children }) => <h2 className="mb-2 mt-5 border-b border-[var(--app-border)] pb-1 text-sm font-bold uppercase tracking-wide text-[var(--app-text)] first:mt-0">{children}</h2>,
      h3: ({ children }) => <h3 className="mb-2 mt-4 text-sm font-bold text-[var(--app-text)] first:mt-0">{children}</h3>,
      p:  ({ children }) => <p className="mb-3 leading-[1.8] last:mb-0 text-[var(--app-text)]">{children}</p>,
      ul: ({ children }) => <ul className="mb-3 space-y-1.5 pl-5 last:mb-0" style={{ listStyleType: "disc" }}>{children}</ul>,
      ol: ({ children }) => <ol className="mb-3 space-y-1.5 pl-5 last:mb-0" style={{ listStyleType: "decimal" }}>{children}</ol>,
      li: ({ children }) => <li className="leading-[1.8] text-[var(--app-text)]">{children}</li>,
      strong: ({ children }) => <strong className="font-semibold text-[var(--app-text)]">{children}</strong>,
      code: ({ className, children }) => Boolean(className)
        ? <code className="block font-mono text-xs leading-relaxed">{children}</code>
        : <code className="rounded bg-[var(--app-surface)] px-1.5 py-0.5 font-mono text-xs" style={{ color: "#FF6B35" }}>{children}</code>,
      pre: ({ children }) => <pre className="mb-3 overflow-x-auto rounded-2xl bg-[var(--app-surface)] p-4 last:mb-0">{children}</pre>,
      blockquote: ({ children }) => <blockquote className="border-l-4 border-orange-400 pl-4 italic text-[var(--app-muted-strong)] my-3">{children}</blockquote>,
    }}>
      {content}
    </ReactMarkdown>
  );
}

/* ── toast ──────────────────────────────────────────────────────── */
function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, alignItems: "center", pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: t.type === "error" ? "#FEF2F2" : "#F0FDF4", border: `1px solid ${t.type === "error" ? "#FCA5A5" : "#86EFAC"}`, color: t.type === "error" ? "#991B1B" : "#166534", padding: "9px 18px", borderRadius: 12, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,.08)" }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function NotesPage() {
  const hydrated = useHydrated();
  const [major] = useStoredValue<SavedMajor | null>(KEYS.MAJOR, null);
  const [courses] = useStoredValue<SavedCourse[]>(KEYS.COURSES, []);

  const initialNotesFallback = (() => {
    if (!hydrated) return {} as NotesStore;

    try {
      const legacyRaw = readStorageRaw(KEYS.NOTES);
      if (!legacyRaw) return {} as NotesStore;

      const parsed = JSON.parse(legacyRaw) as unknown;
      if (!isCourseNote(parsed)) return {} as NotesStore;

      const courseCode = courses[0]?.code ?? "general";
      return { [courseCode]: parsed };
    } catch {
      return {} as NotesStore;
    }
  })();

  // ← FIXED: per-course notes (NOTES_V2) instead of one global blob
  const [notesStore, setNotesStore] = useStoredValue<NotesStore>(KEYS.NOTES_V2, initialNotesFallback);

  const [selCode, setSelCode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const addToast = (msg: string, type: "success" | "error" = "success") => {
    const id = `t_${Date.now()}`;
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 2200);
  };

  const selectedCourseCode =
    selCode && courses.some((course) => course.code === selCode)
      ? selCode
      : courses[0]?.code ?? "";

  const sel = courses.find((course) => course.code === selectedCourseCode) ?? courses[0] ?? null;
  const activeCourseCode = sel?.code ?? "";
  const note: CourseNote = notesStore[activeCourseCode] ?? { text: "", summary: "", updatedAt: 0 };

  const updateNote = (patch: Partial<CourseNote>) => {
    if (!activeCourseCode) return;
    setNotesStore((prev) => {
      const current = prev[activeCourseCode] ?? { text: "", summary: "", updatedAt: 0 };
      return {
        ...prev,
        [activeCourseCode]: { ...current, ...patch, updatedAt: Date.now() },
      };
    });
  };

  const saveNotes = () => {
    if (!activeCourseCode) return;
    updateNote({});
    addToast("Notes saved");
  };

  const clearNotes = () => {
    if (!activeCourseCode) return;
    updateNote({ text: "", summary: "" });
    addToast("Notes cleared");
  };

  /* ── AI summary (streams then saves complete text) ────────────── */
  const getSummary = async () => {
    if (!sel || !major || loading || !note.text.trim()) return;
    setLoading(true);
    setStreamingContent("");

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Please summarize these notes:\n\n${note.text.slice(0, 12000)}`,
          action: "summary",
          context: {
            major: major.name,
            majorCode: major.code,
            school: major.school,
            course: sel.name,
            courseCode: sel.code,
            courseSection: sel.section,
          },
        }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        // ← FIXED: stream shows live text instead of waiting for full response
        setStreamingContent(fullText);
      }

      updateNote({ summary: fullText });
      setStreamingContent("");
      addToast("Summary ready!");
    } catch {
      addToast("Failed to get summary. Try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
        <div className="mx-auto flex min-h-[420px] max-w-5xl items-center justify-center px-6 py-10">
          <div className="w-full max-w-xl rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 h-8 w-8 rounded-full border-2 border-orange-400 border-t-transparent" style={{ animation: "spin 0.8s linear infinite" }} />
            <h2 className="text-lg font-semibold">Loading your notes workspace…</h2>
            <p className="mt-2 text-sm text-[var(--app-muted)]">Your saved courses and notes are being restored.</p>
          </div>
        </div>
      </main>
    );
  }

  if (!major) {
    return (
      <div className="py-20 text-center text-[var(--app-muted)]">
        Set up your major first from the dashboard.
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <ToastContainer toasts={toasts} />

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
            <p className="text-sm text-[var(--app-muted)] mt-1">
              Write notes per course — get an AI summary instantly.
            </p>
          </div>

          {/* ← FIXED: per-course picker */}
          {courses.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {courses.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSelCode(c.code)}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold transition"
                  style={{
                    background: activeCourseCode === c.code ? c.color : "var(--app-surface)",
                    color: activeCourseCode === c.code ? "#fff" : "var(--app-muted)",
                    border: `1.5px solid ${activeCourseCode === c.code ? c.color : "var(--app-border)"}`,
                  }}
                >
                  {c.code}
                </button>
              ))}
            </div>
          )}
        </div>

        {courses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--app-border)] py-20 text-center">
            <p className="text-[var(--app-muted)]">Add courses first from the dashboard.</p>
          </div>
        ) : !sel ? null : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left — notes input */}
            <div className="space-y-4">
              <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] overflow-hidden">
                {/* header bar */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--app-border)]">
                  <div>
                    <span className="font-mono text-xs font-bold" style={{ color: sel.color }}>{sel.code}</span>
                    <span className="text-xs text-[var(--app-muted)] ml-2">{sel.name}</span>
                  </div>
                  {note.updatedAt > 0 && (
                    <span className="text-[11px] text-[var(--app-muted)]">
                      Saved {new Date(note.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                  )}
                </div>

                <textarea
                  ref={textRef}
                  placeholder={`Your ${sel.code} notes…\n\nPaste lecture notes, textbook summaries, key terms — anything you want the AI to summarize.`}
                  value={note.text}
                  onChange={e => updateNote({ text: e.target.value })}
                  className="w-full min-h-[340px] resize-none bg-transparent px-5 py-4 text-sm text-[var(--app-text)] leading-relaxed outline-none placeholder:text-[var(--app-muted)]"
                />

                {/* word count */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--app-border)]">
                  <span className="text-[11px] text-[var(--app-muted)]">
                    {note.text.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                  <div className="flex gap-2">
                    {note.text && (
                      <button type="button" onClick={clearNotes}
                        className="text-xs text-[var(--app-muted)] hover:text-red-500 transition px-2 py-1">
                        Clear
                      </button>
                    )}
                    <button type="button" onClick={saveNotes}
                      disabled={!note.text.trim()}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40"
                      style={{ background: "var(--app-surface-muted)", color: "var(--app-text)" }}>
                      Save
                    </button>
                    <button type="button" onClick={getSummary}
                      disabled={loading || !note.text.trim()}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg,#FF6B35,#F7931E)", boxShadow: "0 2px 10px rgba(255,107,53,.25)" }}>
                      {loading ? "Summarising…" : "AI Summary →"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — AI summary */}
            <div>
              <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] overflow-hidden h-full min-h-[420px] flex flex-col">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[var(--app-border)]">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{ background: "linear-gradient(135deg,#FF6B35,#F7931E)" }}>
                    <StarburstLogo size={11} white />
                  </div>
                  <span className="text-sm font-semibold">AI Summary</span>
                  {loading && (
                    <span className="ml-auto text-[11px] text-[var(--app-muted)]" style={{ animation: "pulse 1.4s ease-in-out infinite" }}>
                      Summarising…
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5">
                  {/* ← FIXED: ReactMarkdown renders ** and ## properly now */}
                  {loading && streamingContent ? (
                    <div className="text-sm leading-relaxed"><MD content={streamingContent} /></div>
                  ) : loading && !streamingContent ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-5 w-5 rounded-full border-2 border-orange-400 border-t-transparent" style={{ animation: "spin 0.8s linear infinite" }} />
                        <p className="text-xs text-[var(--app-muted)]">Reading your notes…</p>
                      </div>
                    </div>
                  ) : note.summary ? (
                    <div className="text-sm leading-relaxed"><MD content={note.summary} /></div>
                  ) : (
                    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 text-center">
                      <div className="text-3xl opacity-30">✏️</div>
                      <div>
                        <p className="text-sm font-medium text-[var(--app-text)]">No summary yet</p>
                        <p className="text-xs text-[var(--app-muted)] mt-1">
                          Add your notes on the left and click <strong>AI Summary →</strong>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {note.summary && !loading && (
                  <div className="border-t border-[var(--app-border)] px-5 py-3 flex justify-end gap-2">
                    <button type="button" onClick={getSummary} disabled={!note.text.trim()}
                      className="text-xs text-[var(--app-muted)] hover:text-[var(--app-text)] transition disabled:opacity-40">
                      Regenerate
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
      `}</style>
    </main>
  );
}
