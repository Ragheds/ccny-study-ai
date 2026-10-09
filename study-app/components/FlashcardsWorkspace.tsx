"use client";

import { ChangeEvent, Dispatch, SetStateAction, useState } from "react";
import { StarburstLogo } from "@/components/StarburstLogo";
import { useStoredValue } from "@/hooks/useStoredValue";
import { SavedCourse, SavedMajor } from "@/lib/chatWorkspace";
import {
  addFlashcardSet,
  clearActiveFlashcardSet,
  createFlashcardSet,
  deleteFlashcardSet,
  EMPTY_FLASHCARD_STORE,
  FLASHCARD_TARGET_COUNT,
  FlashcardSet,
  formatFlashcardDate,
  getActiveFlashcardSet,
  getCourseFlashcardSets,
  groupFlashcardSetsByDate,
  normalizeFlashcardStore,
  parseFlashcardsFromText,
  renameFlashcardSet,
  selectFlashcardSet,
} from "@/lib/flashcards";
import { KEYS } from "@/lib/storage";

/* ── types ─────────────────────────────────────────────────────────── */
type FlashcardsWorkspaceProps = {
  major: SavedMajor;
  courses: SavedCourse[];
  activeCourseCode?: string | null;
};
type Toast = { id: string; msg: string; type: "success" | "error" };

/* ── constants ─────────────────────────────────────────────────────── */
const FOCUS_WORD_LIMIT = 10;

function createToastId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `t_${crypto.randomUUID()}`;
  }
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function queueToast(
  setToasts: Dispatch<SetStateAction<Toast[]>>,
  msg: string,
  type: Toast["type"] = "success"
) {
  const id = createToastId();
  setToasts((prev) => [...prev, { id, msg, type }]);
  window.setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 2200);
}

function limitFocusWords(value: string): string {
  const normalized = value.replace(/\s+/g, " ").replace(/^\s+/, "");
  const words = normalized.match(/\S+/g) ?? [];
  if (words.length <= FOCUS_WORD_LIMIT) return normalized;
  let wordCount = 0;
  let previousWasSpace = true;
  for (let index = 0; index < normalized.length; index++) {
    const isSpace = normalized[index] === " ";
    if (!isSpace && previousWasSpace) {
      wordCount++;
      if (wordCount > FOCUS_WORD_LIMIT) return normalized.slice(0, index).trimEnd();
    }
    previousWasSpace = isSpace;
  }
  return normalized;
}

function getWordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function buildFlashcardPrompt(course: SavedCourse, focus: string, uploadedText: string): string {
  const cleanFocus = focus.trim();
  const cleanMaterial = uploadedText.trim();
  const focusLine = cleanFocus
    ? `Required focus/topic for every flashcard: ${cleanFocus}.`
    : "No specific unit was provided, so cover the most important course concepts.";
  if (cleanMaterial) {
    return `Use the uploaded course material as the primary source for the flashcards.\n${focusLine}\n\nUploaded material:\n${cleanMaterial.slice(0, 14000)}\n\nCreate exactly ${FLASHCARD_TARGET_COUNT} front/back flashcards for ${course.name} (${course.code}).`;
  }
  return `${focusLine}\n\nCreate exactly ${FLASHCARD_TARGET_COUNT} front/back flashcards for ${course.name} (${course.code}) using the course context.`;
}

function getCourseFocusExamples(course: SavedCourse): Array<{ lead: string; rest: string }> {
  const n = course.name.toLowerCase();
  const topic = n.includes("comput") ? "computing foundations" : n.includes("program") ? "programming basics" : n.includes("data") ? "data concepts" : n.includes("calculus") ? "calculus examples" : n.includes("english") || n.includes("writing") ? "essay structure" : `${course.code} unit`;
  const concept = n.includes("comput") ? "Computational Science" : n.includes("program") ? "program control flow" : n.includes("data") ? "data modeling" : n.includes("calculus") ? "limits and derivatives" : n.includes("biology") ? "cellular processes" : n.includes("chem") ? "chemical bonding" : course.name;
  return [
    { lead: "focus", rest: `on the ${topic} part in the PDF I uploaded` },
    { lead: "explain", rest: `the meaning of ${concept}` },
  ];
}

/* ── PDF extraction via CDN pdf.js (same util as AITutor) ─────────── */
async function extractPDFText(file: File): Promise<string> {
  if (!(window as unknown as Record<string, unknown>)["pdfjsLib"]) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        (window as unknown as Record<string, { GlobalWorkerOptions: { workerSrc: string } }>)[
          "pdfjsLib"
        ].GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  const pdfjs = (window as unknown as Record<string, unknown>)["pdfjsLib"] as {
    getDocument: (opts: { data: ArrayBuffer }) => {
      promise: Promise<{
        numPages: number;
        getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str: string }> }> }>;
      }>;
    };
  };
  const ab = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: ab }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((x) => x.str).join(" ") + "\n";
  }
  return text.trim();
}

/* ── toast helper ──────────────────────────────────────────────────── */
function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, alignItems: "center", pointerEvents: "none" }}>
      {toasts.map((t) => (
        <div key={t.id} style={{ background: t.type === "error" ? "#FEF2F2" : "#F0FDF4", border: `1px solid ${t.type === "error" ? "#FCA5A5" : "#86EFAC"}`, color: t.type === "error" ? "#991B1B" : "#166534", padding: "9px 18px", borderRadius: 12, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,.08)" }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ── Flashcard study view ──────────────────────────────────────────── */
function FlashcardStudyView({ set, onBack, onDelete }: { set: FlashcardSet; onBack: () => void; onDelete: () => void }) {
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const card = set.cards[cardIndex];
  const total = set.cards.length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-[var(--app-muted)] hover:text-[var(--app-text)] transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back
        </button>
        <div className="flex items-center gap-2">
          {/* Inline delete confirm — no window.confirm() */}
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--app-muted)]">Delete set?</span>
              <button type="button" onClick={() => { onDelete(); setConfirmDelete(false); }} className="text-xs font-semibold text-red-500 hover:text-red-600 transition">Delete</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-[var(--app-muted)] hover:text-[var(--app-text)] transition">Cancel</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs text-[var(--app-muted)] hover:border-red-300 hover:text-red-500 transition">
              Delete set
            </button>
          )}
        </div>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-[var(--app-text)]">{set.title}</h2>
        <p className="text-xs text-[var(--app-muted)] mt-1">{cardIndex + 1} / {total} · {formatFlashcardDate(set.createdAt)}</p>
      </div>

      {/* Card */}
<div className="flex-1 flex items-center justify-center px-4">
  <div
    onClick={() => setFlipped((v) => !v)}
    className="w-full max-w-xl min-h-[220px] cursor-pointer select-none"
    style={{ perspective: "1200px" }}
  >
    <div
      className="relative w-full h-full min-h-[220px]"
      style={{
        transformStyle: "preserve-3d",
        transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
      }}
    >
      {/* Front */}
      <div
        className="absolute inset-0 rounded-3xl border border-[var(--app-border)] p-8 flex flex-col items-center justify-center gap-4 text-center"
        style={{
          backfaceVisibility: "hidden",
          background: "var(--app-surface)",
          color: "var(--app-text)",
          boxShadow: "0 2px 12px rgba(0,0,0,.06)",
        }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest opacity-50">Front</span>
        <p className="text-lg font-medium leading-relaxed">{card?.front}</p>
        <span className="text-[11px] opacity-40">Click to reveal answer</span>
      </div>

      {/* Back */}
      <div
        className="absolute inset-0 rounded-3xl border border-[var(--app-border)] p-8 flex flex-col items-center justify-center gap-4 text-center"
        style={{
          backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          background: "var(--app-text)",
          color: "var(--app-bg)",
          boxShadow: "0 8px 32px rgba(0,0,0,.16)",
        }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest opacity-50">Back</span>
        <p className="text-lg font-medium leading-relaxed">{card?.back}</p>
        <span className="text-[11px] opacity-40">Click to see question</span>
      </div>
    </div>
  </div>
</div>

      {/* Nav */}
      <div className="flex items-center justify-center gap-6 py-6">
        <button type="button" disabled={cardIndex === 0} onClick={() => { setCardIndex((i) => i - 1); setFlipped(false); }}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--app-border)] text-[var(--app-muted)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)] disabled:opacity-30">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="flex gap-1.5">
          {set.cards.map((_, i) => (
            <button key={i} type="button" onClick={() => { setCardIndex(i); setFlipped(false); }}
              className="h-2 rounded-full transition-all"
              style={{ width: i === cardIndex ? 20 : 8, background: i === cardIndex ? "var(--app-text)" : "var(--app-border)" }} />
          ))}
        </div>
        <button type="button" disabled={cardIndex === total - 1} onClick={() => { setCardIndex((i) => i + 1); setFlipped(false); }}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--app-border)] text-[var(--app-muted)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)] disabled:opacity-30">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );
}

/* ── Main export ───────────────────────────────────────────────────── */
export function FlashcardsWorkspace({ major, courses, activeCourseCode }: FlashcardsWorkspaceProps) {
  const [rawStore, setRawStore] = useStoredValue(KEYS.FLASHCARDS, EMPTY_FLASHCARD_STORE);
  const store = normalizeFlashcardStore(rawStore);

  // Persisted upload draft (survives tab switches + refreshes)
  const [uploadDraft, setUploadDraft] = useStoredValue<{ text: string; fileName: string }>(
    KEYS.UPLOAD_DRAFT, { text: "", fileName: "" }
  );

  const [focus, setFocus] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [, setShowUpload] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isExtractingPDF, setIsExtractingPDF] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (msg: string, type: Toast["type"] = "success") => {
    queueToast(setToasts, msg, type);
  };

  const sel = courses.find(c => c.code === activeCourseCode) ?? courses[0] ?? null;
  const sets = sel ? getCourseFlashcardSets(store, sel.code) : [];
  const activeSet = sel ? getActiveFlashcardSet(store, sel.code) : null;
  const groups = groupFlashcardSetsByDate(sets);

  /* ── file upload ─────────────────────────────────────────────────── */
  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setIsExtractingPDF(true);
      try {
        const text = await extractPDFText(file);
        setUploadDraft({ text, fileName: file.name });
        addToast(`PDF loaded — ${Math.round(text.length / 1000)}k chars extracted`);
        setShowUpload(false);
      } catch {
        addToast("Couldn't read PDF. Try pasting the text instead.", "error");
      } finally {
        setIsExtractingPDF(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = ev => {
        const text = ev.target?.result as string;
        setUploadDraft({ text, fileName: file.name });
        addToast(`File loaded — ${Math.round(text.length / 1000)}k chars`);
        setShowUpload(false);
      };
      reader.readAsText(file);
    }
  };

  const clearUpload = () => setUploadDraft({ text: "", fileName: "" });

  /* ── generate flashcards (streams full response then parses) ──────── */
  const generate = async () => {
    if (!sel || loading) return;
    setLoading(true);
    setProgress("Generating flashcards…");

    try {
      const prompt = buildFlashcardPrompt(sel, focus, uploadDraft.text);
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          action: "flashcards",
          context: { major: major.name, majorCode: major.code, school: major.school, course: sel.name, courseCode: sel.code, courseSection: sel.section },
        }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      // Collect streaming chunks into full text before parsing
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let raw       = "";
      let dotCount  = 0;
      const dots    = ["Thinking.", "Thinking..", "Thinking..."];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        // Animate progress dots
        dotCount = (dotCount + 1) % 3;
        setProgress(dots[dotCount] + ` (${Math.round(raw.length / 1000)}k chars received)`);
      }

      const cards = parseFlashcardsFromText(raw);
      if (cards.length === 0) throw new Error("No flashcards parsed. Try being more specific.");

      const newSet = createFlashcardSet(sel, major, cards, prompt, {
        focus: focus.trim(),
        materialName: uploadDraft.fileName || undefined,
        materialIncluded: Boolean(uploadDraft.text.trim()),
      });

      setRawStore(addFlashcardSet(store, newSet));
      setFocus("");
      clearUpload();
      addToast(`${cards.length} cards generated!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      addToast(msg, "error");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  /* ── rename, delete ──────────────────────────────────────────────── */
  const beginRename = (set: FlashcardSet) => { setEditingSetId(set.id); setEditingTitle(set.title); };
  const submitRename = () => {
    if (!editingSetId) return;
    setRawStore(renameFlashcardSet(store, editingSetId, editingTitle));
    setEditingSetId(null); setEditingTitle("");
    addToast("Set renamed");
  };
  const removeSet = (setId: string) => {
    setRawStore(deleteFlashcardSet(store, setId));
    setConfirmDeleteId(null);
    addToast("Set deleted");
  };

  /* ── examples ────────────────────────────────────────────────────── */
  const examples = sel ? getCourseFocusExamples(sel) : [];

  /* ── render ─────────────────────────────────────────────────────── */
  if (!sel || courses.length === 0) {
    return <div className="py-20 text-center text-[var(--app-muted)]">Add courses to use Flashcards.</div>;
  }

  if (activeSet) {
    return (
      <div style={{ height: "calc(100dvh - 200px)" }}>
        <ToastContainer toasts={toasts} />
        <FlashcardStudyView
          set={activeSet}
          onBack={() => setRawStore(clearActiveFlashcardSet(store, sel.code))}
          onDelete={() => { removeSet(activeSet.id); setRawStore(clearActiveFlashcardSet(store, sel.code)); }}
        />
      </div>
    );
  }

  return (
    <div className="flex gap-6 flex-col lg:flex-row" style={{ minHeight: "calc(100dvh - 200px)" }}>
      <ToastContainer toasts={toasts} />

      {/* ── Generate panel ──────────────────────────────────────── */}
      <div className="lg:w-[340px] shrink-0 space-y-4">
        {/* Focus input */}
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 space-y-3">
          <p className="text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wide">Focus topic</p>
          <div className="relative">
            <input
              placeholder="e.g. limits and derivatives…"
              value={focus}
              onChange={e => setFocus(limitFocusWords(e.target.value))}
              disabled={loading}
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-2.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)] disabled:opacity-60"
            />
            {focus && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--app-muted)]">
                {getWordCount(focus)}/{FOCUS_WORD_LIMIT}
              </span>
            )}
          </div>
          {!focus && examples.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {examples.map((ex, i) => (
                <button key={i} type="button" onClick={() => setFocus(limitFocusWords(`${ex.lead} ${ex.rest}`))}
                  className="rounded-xl border border-dashed border-[var(--app-border)] px-3 py-2 text-left text-xs text-[var(--app-muted)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]">
                  <span className="font-semibold">{ex.lead}</span> {ex.rest}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Upload material */}
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wide">Attach material</p>
            {uploadDraft.fileName && (
              <button type="button" onClick={clearUpload} className="text-xs text-red-400 hover:text-red-500 transition">Clear</button>
            )}
          </div>
          {uploadDraft.fileName ? (
            <div className="flex items-center gap-2 rounded-xl bg-[var(--app-surface-muted)] px-3 py-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21.44 11.05L12.25 20.24a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="text-xs text-[var(--app-text)] truncate">{uploadDraft.fileName}</span>
              <span className="ml-auto shrink-0 text-[11px] text-[var(--app-muted)]">{Math.round(uploadDraft.text.length / 1000)}k chars</span>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-[var(--app-border)] px-3 py-2.5 text-xs text-[var(--app-muted)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21.44 11.05L12.25 20.24a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {/* ← FIXED: now accepts .pdf as well as .txt */}
                Choose .txt or .pdf
                <input type="file" accept=".txt,.pdf" onChange={handleFile} className="hidden" disabled={loading} />
              </label>
              {isExtractingPDF && <p className="text-center text-xs text-[var(--app-muted)]">Extracting PDF…</p>}
              <textarea
                placeholder="…or paste notes here"
                value={uploadDraft.text}
                onChange={e => setUploadDraft({ text: e.target.value, fileName: e.target.value ? "pasted notes" : "" })}
                disabled={loading}
                className="h-20 w-full resize-none rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-2.5 text-xs text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)] disabled:opacity-60"
              />
            </div>
          )}
        </div>

        {/* Generate button */}
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold transition disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#FF6B35,#F7931E)", color: "#fff", boxShadow: "0 4px 14px rgba(255,107,53,.32)" }}
        >
          {loading ? (
  <span className="flex items-center justify-center gap-2">
    <span className="generating-icon"><StarburstLogo size={16} white /></span>
    {progress || "Generating…"}
  </span>
) : (
  `Generate ${FLASHCARD_TARGET_COUNT} Flashcards`
)}
        </button>
      </div>

      {/* ── Sets list ────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {sets.length === 0 ? (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-[var(--app-border)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg,#FF6B35,#F7931E)" }}>
              <StarburstLogo size={20} white />
            </div>
            <div className="text-center">
              <p className="font-semibold text-[var(--app-text)]">No flashcard sets yet</p>
              <p className="mt-1 text-sm text-[var(--app-muted)]">Generate your first set using the panel on the left.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map(group => (
              <div key={group.label}>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--app-muted)]">{group.label}</p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.sets.map(set => {
                    const isEditing = set.id === editingSetId;
                    const isConfirming = set.id === confirmDeleteId;
                    return (
                      <div key={set.id} className="group relative rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 transition hover:border-[var(--app-border-strong)] hover:shadow-sm">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <input value={editingTitle} onChange={e => setEditingTitle(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") submitRename(); if (e.key === "Escape") setEditingSetId(null); }}
                              autoFocus className="min-w-0 flex-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none" />
                            <button type="button" onClick={submitRename} className="rounded-lg bg-[var(--app-text)] px-2 py-1 text-xs font-semibold text-[var(--app-bg)]">Save</button>
                          </div>
                        ) : (
                          <>
                            <button type="button" onClick={() => setRawStore(selectFlashcardSet(store, set.id, sel.code))} className="block w-full text-left">
                              <p className="font-semibold text-sm text-[var(--app-text)] leading-snug">{set.title}</p>
                              <p className="mt-1 text-[11px] text-[var(--app-muted)]">{set.cards.length} cards · {formatFlashcardDate(set.createdAt)}</p>
                              {set.materialIncluded && (
                                <span className="mt-2 inline-block rounded-full bg-[var(--app-surface-muted)] px-2 py-0.5 text-[10px] text-[var(--app-muted)]">📎 {set.materialName ?? "material"}</span>
                              )}
                            </button>
                            {/* Inline confirm delete — no window.confirm() */}
                            <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              {isConfirming ? (
                                <div className="flex items-center gap-1.5 rounded-lg bg-[var(--app-surface-muted)] px-2 py-1">
                                  <span className="text-[11px] text-[var(--app-muted)]">Delete?</span>
                                  <button type="button" onClick={() => removeSet(set.id)} className="text-[11px] font-semibold text-red-500 hover:text-red-600">Yes</button>
                                  <button type="button" onClick={() => setConfirmDeleteId(null)} className="text-[11px] text-[var(--app-muted)] hover:text-[var(--app-text)]">No</button>
                                </div>
                              ) : (
                                <>
                                  <button type="button" onClick={() => beginRename(set)} title="Rename"
                                    className="rounded-lg p-1.5 text-[var(--app-muted)] transition hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                  </button>
                                  <button type="button" onClick={() => setConfirmDeleteId(set.id)} title="Delete"
                                    className="rounded-lg p-1.5 text-[var(--app-muted)] transition hover:bg-[var(--app-surface-muted)] hover:text-red-500">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
