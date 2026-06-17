"use client";

import { ChangeEvent, useState } from "react";
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

type FlashcardsWorkspaceProps = {
  major: SavedMajor;
  courses: SavedCourse[];
  activeCourseCode?: string | null;
  onActiveCourseChange?: (courseCode: string) => void;
};

type TutorResponse = {
  response?: string;
  error?: string;
};

function limitToSevenWords(value: string): string {
  return value.replace(/\s+/g, " ").trimStart().split(" ").filter(Boolean).slice(0, 7).join(" ");
}

function getWordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function buildFlashcardPrompt(
  course: SavedCourse,
  focus: string,
  uploadedText: string
): string {
  const cleanFocus = focus.trim();
  const cleanMaterial = uploadedText.trim();
  const focusLine = cleanFocus
    ? `Focus only on this unit/topic if possible: ${cleanFocus}.`
    : "No specific unit was provided, so cover the most important course concepts.";

  if (cleanMaterial) {
    return `Use the uploaded course material as the primary source for the flashcards.
${focusLine}

Uploaded material:
${cleanMaterial.slice(0, 14000)}

Create exactly ${FLASHCARD_TARGET_COUNT} front/back flashcards for ${course.name} (${course.code}).`;
  }

  return `${focusLine}

Create exactly ${FLASHCARD_TARGET_COUNT} front/back flashcards for ${course.name} (${course.code}) using the course context.`;
}

export function FlashcardsWorkspace({
  major,
  courses,
  activeCourseCode,
  onActiveCourseChange,
}: FlashcardsWorkspaceProps) {
  const [rawStore, setStore] = useStoredValue(KEYS.FLASHCARDS, EMPTY_FLASHCARD_STORE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadedText, setUploadedText] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [focus, setFocus] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const store = normalizeFlashcardStore(rawStore);
  const selectedCourse =
    courses.find((course) => course.code === activeCourseCode) ?? courses[0] ?? null;
  const activeSet = selectedCourse ? getActiveFlashcardSet(store, selectedCourse.code) : undefined;
  const courseSets = selectedCourse ? getCourseFlashcardSets(store, selectedCourse.code) : [];
  const setGroups = groupFlashcardSetsByDate(courseSets);

  const chooseCourse = (course: SavedCourse) => {
    setError("");
    setSidebarOpen(false);
    onActiveCourseChange?.(course.code);
  };

  const startNewSet = () => {
    if (!selectedCourse) return;
    setStore((current) =>
      clearActiveFlashcardSet(normalizeFlashcardStore(current), selectedCourse.code)
    );
    setError("");
    setSidebarOpen(false);
  };

  const chooseSet = (flashcardSet: FlashcardSet) => {
    setStore((current) =>
      selectFlashcardSet(normalizeFlashcardStore(current), flashcardSet.courseCode, flashcardSet.id)
    );
    setError("");
    setSidebarOpen(false);
  };

  const beginRename = (flashcardSet: FlashcardSet) => {
    setEditingSetId(flashcardSet.id);
    setEditingTitle(flashcardSet.title);
  };

  const submitRename = () => {
    if (!editingSetId) return;
    setStore((current) =>
      renameFlashcardSet(normalizeFlashcardStore(current), editingSetId, editingTitle)
    );
    setEditingSetId(null);
    setEditingTitle("");
  };

  const removeSet = (flashcardSet: FlashcardSet) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete "${flashcardSet.title}"? This only removes this flashcard set.`)
    ) {
      return;
    }

    setStore((current) => deleteFlashcardSet(normalizeFlashcardStore(current), flashcardSet.id));

    if (editingSetId === flashcardSet.id) {
      setEditingSetId(null);
      setEditingTitle("");
    }
  };

  const handleFocusChange = (value: string) => {
    setFocus(limitToSevenWords(value));
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      setUploadedText(String(readerEvent.target?.result ?? ""));
      setMaterialName(file.name);
      setShowUpload(false);
    };
    reader.readAsText(file);
  };

  const generateFlashcards = async () => {
    if (!selectedCourse || loading) return;

    const prompt = buildFlashcardPrompt(selectedCourse, focus, uploadedText);

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          action: "flashcards",
          context: {
            major: major.name,
            majorCode: major.code,
            school: major.school,
            course: selectedCourse.name,
            courseCode: selectedCourse.code,
            courseSection: selectedCourse.section,
          },
        }),
      });

      const data = (await response.json()) as TutorResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Flashcard generation failed.");
      }

      const drafts = parseFlashcardsFromText(data.response ?? "");

      if (drafts.length < FLASHCARD_TARGET_COUNT) {
        throw new Error(
          `The AI returned ${drafts.length} usable flashcards. Try generating again for a complete ${FLASHCARD_TARGET_COUNT}-card set.`
        );
      }

      const flashcardSet = createFlashcardSet(selectedCourse, major, drafts, prompt, {
        focus,
        materialName: materialName || undefined,
        materialIncluded: Boolean(uploadedText.trim()),
      });

      setStore((current) => addFlashcardSet(normalizeFlashcardStore(current), flashcardSet));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Flashcard generation failed.");
    } finally {
      setLoading(false);
    }
  };

  if (courses.length === 0 || !selectedCourse) {
    return (
      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center shadow-sm">
        <p className="text-[var(--app-muted)]">Add courses first to generate flashcards.</p>
      </div>
    );
  }

  const sidebar = (
    <FlashcardHistorySidebar
      activeSet={activeSet}
      courseCode={selectedCourse.code}
      editingSetId={editingSetId}
      editingTitle={editingTitle}
      setEditingTitle={setEditingTitle}
      setGroups={setGroups}
      onBeginRename={beginRename}
      onChooseSet={chooseSet}
      onNewSet={startNewSet}
      onRemoveSet={removeSet}
      onSubmitRename={submitRename}
    />
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-1 text-xs uppercase tracking-widest text-[var(--app-muted)]">
              Flashcards for
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-[var(--app-accent)]">
                {selectedCourse.code}
              </span>
              <span className="font-semibold text-[var(--app-text)]">{selectedCourse.name}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--app-muted)]">
              {major.name} · {selectedCourse.section}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-2xl border border-[var(--app-border)] px-4 py-3 text-sm font-semibold text-[var(--app-muted-strong)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)] lg:hidden"
            >
              ☰ History
            </button>

            <button
              type="button"
              onClick={() => void generateFlashcards()}
              disabled={loading}
              className="rounded-2xl bg-[var(--app-text)] px-5 py-3 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Generating..." : `Generate ${FLASHCARD_TARGET_COUNT}`}
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {courses.map((course) => (
            <button
              key={course.code}
              type="button"
              onClick={() => chooseCourse(course)}
              className={`shrink-0 rounded-xl border px-3 py-2 text-left transition ${
                selectedCourse.code === course.code
                  ? "border-[var(--app-text)] bg-[var(--app-text)] text-[var(--app-bg)]"
                  : "border-[var(--app-border)] text-[var(--app-muted)] hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
              }`}
            >
              <span
                className="block font-mono text-xs font-bold"
                style={{
                  color: selectedCourse.code === course.code ? "var(--app-bg)" : course.color,
                }}
              >
                {course.code}
              </span>
              <span className="block max-w-48 truncate text-xs">{course.name}</span>
            </button>
          ))}
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div
            className="h-full w-[min(86vw,360px)] overflow-y-auto bg-[var(--app-bg)] p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--app-text)]">Flashcard history</p>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm text-[var(--app-muted-strong)]"
              >
                Close
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden lg:block">{sidebar}</aside>

        <section className="min-w-0">
          <GenerationPanel
            focus={focus}
            materialName={materialName}
            showUpload={showUpload}
            uploadedText={uploadedText}
            wordCount={getWordCount(focus)}
            onClearMaterial={() => {
              setUploadedText("");
              setMaterialName("");
            }}
            onFileUpload={handleFileUpload}
            onFocusChange={handleFocusChange}
            onGenerate={() => void generateFlashcards()}
            onShowUploadChange={setShowUpload}
            onUploadedTextChange={(value) => {
              setUploadedText(value);
              if (!value.trim()) setMaterialName("");
            }}
            loading={loading}
          />

          {activeSet ? (
            <FlashcardReview key={activeSet.id} flashcardSet={activeSet} />
          ) : (
            <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 shadow-sm">
              <p className="mb-3 text-xs uppercase tracking-widest text-[var(--app-muted)]">
                Ready to study
              </p>
              <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-[var(--app-text)]">
                Generate a complete recall set for {selectedCourse.code}.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--app-muted)]">
                Upload material for source-based cards, or leave it blank for course-aware cards.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function GenerationPanel({
  focus,
  loading,
  materialName,
  showUpload,
  uploadedText,
  wordCount,
  onClearMaterial,
  onFileUpload,
  onFocusChange,
  onGenerate,
  onShowUploadChange,
  onUploadedTextChange,
}: {
  focus: string;
  loading: boolean;
  materialName: string;
  showUpload: boolean;
  uploadedText: string;
  wordCount: number;
  onClearMaterial: () => void;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onFocusChange: (value: string) => void;
  onGenerate: () => void;
  onShowUploadChange: (value: boolean) => void;
  onUploadedTextChange: (value: string) => void;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--app-muted)]">
            Unit or focus
          </span>
          <input
            value={focus}
            onChange={(event) => onFocusChange(event.target.value)}
            placeholder="Loops and conditionals"
            className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-3 text-sm text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--app-border-strong)]"
          />
          <span className="mt-1 block text-xs text-[var(--app-muted)]">{wordCount}/7 words</span>
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onShowUploadChange(!showUpload)}
            className="rounded-2xl border border-[var(--app-border)] px-4 py-3 text-sm font-semibold text-[var(--app-muted-strong)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
          >
            {uploadedText ? "Material added" : "Upload material"}
          </button>

          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="rounded-2xl bg-[var(--app-text)] px-5 py-3 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>

      {uploadedText && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-2 text-xs text-[var(--app-muted-strong)]">
          <span>{materialName || "Pasted material"} · {uploadedText.length.toLocaleString()} characters</span>
          <button type="button" onClick={onClearMaterial} className="font-semibold text-red-500">
            Remove
          </button>
        </div>
      )}

      {showUpload && (
        <div className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4">
          <p className="mb-3 text-sm text-[var(--app-muted)]">
            Upload a text file or paste notes. If this is empty, generation uses the course context.
          </p>

          <input
            type="file"
            accept=".txt,.md,.csv"
            onChange={onFileUpload}
            className="mb-3 block text-sm text-[var(--app-muted)]"
          />

          <textarea
            placeholder="Paste lecture notes, textbook notes, or study material..."
            value={uploadedText}
            onChange={(event) => onUploadedTextChange(event.target.value)}
            className="h-32 w-full resize-none rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
          />

          <button
            type="button"
            onClick={() => onShowUploadChange(false)}
            className="mt-2 text-xs font-semibold text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function FlashcardHistorySidebar({
  activeSet,
  courseCode,
  editingSetId,
  editingTitle,
  setEditingTitle,
  setGroups,
  onBeginRename,
  onChooseSet,
  onNewSet,
  onRemoveSet,
  onSubmitRename,
}: {
  activeSet?: FlashcardSet;
  courseCode: string;
  editingSetId: string | null;
  editingTitle: string;
  setEditingTitle: (title: string) => void;
  setGroups: ReturnType<typeof groupFlashcardSetsByDate>;
  onBeginRename: (flashcardSet: FlashcardSet) => void;
  onChooseSet: (flashcardSet: FlashcardSet) => void;
  onNewSet: () => void;
  onRemoveSet: (flashcardSet: FlashcardSet) => void;
  onSubmitRename: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-sm lg:min-h-[620px]">
      <div className="flex items-center justify-between gap-3 px-2 py-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--app-muted)]">Flashcards</p>
          <p className="mt-1 font-mono text-xs text-[var(--app-muted-strong)]">{courseCode}</p>
        </div>

        <button
          type="button"
          onClick={onNewSet}
          className="rounded-xl bg-[var(--app-text)] px-3 py-2 text-xs font-semibold text-[var(--app-bg)] transition hover:opacity-90"
        >
          New set
        </button>
      </div>

      <div className="mt-3 space-y-4">
        {setGroups.length === 0 && (
          <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4 text-sm text-[var(--app-muted)]">
            No flashcard sets for this course yet.
          </div>
        )}

        {setGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--app-muted)]">
              {group.label}
            </p>

            <div className="space-y-1">
              {group.sets.map((flashcardSet) => {
                const isActive = flashcardSet.id === activeSet?.id;
                const isEditing = flashcardSet.id === editingSetId;

                return (
                  <div
                    key={flashcardSet.id}
                    className={`rounded-xl border p-2 transition ${
                      isActive
                        ? "border-[var(--app-border-strong)] bg-[var(--app-surface-strong)]"
                        : "border-transparent hover:bg-[var(--app-surface-muted)]"
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          value={editingTitle}
                          onChange={(event) => setEditingTitle(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") onSubmitRename();
                            if (event.key === "Escape") setEditingTitle(flashcardSet.title);
                          }}
                          className="min-w-0 flex-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 py-1 text-xs text-[var(--app-text)] outline-none"
                          autoFocus
                        />

                        <button
                          type="button"
                          onClick={onSubmitRename}
                          className="rounded-lg bg-[var(--app-text)] px-2 py-1 text-xs font-semibold text-[var(--app-bg)]"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => onChooseSet(flashcardSet)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate text-sm font-medium text-[var(--app-text)]">
                            {flashcardSet.title}
                          </span>
                          <span className="block text-[11px] text-[var(--app-muted)]">
                            {flashcardSet.cards.length} cards · {formatFlashcardDate(flashcardSet.updatedAt)}
                          </span>
                          {flashcardSet.materialIncluded && (
                            <span className="mt-1 block truncate text-[11px] text-[var(--app-accent)]">
                              From material
                            </span>
                          )}
                        </button>

                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => onBeginRename(flashcardSet)}
                            className="rounded-md px-1.5 py-1 text-[11px] text-[var(--app-muted)] hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]"
                          >
                            Rename
                          </button>

                          <button
                            type="button"
                            onClick={() => onRemoveSet(flashcardSet)}
                            className="rounded-md px-1.5 py-1 text-[11px] text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-500"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlashcardReview({ flashcardSet }: { flashcardSet: FlashcardSet }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = flashcardSet.cards[index];
  const cardCount = flashcardSet.cards.length;
  const progress = ((index + 1) / cardCount) * 100;

  const goToCard = (nextIndex: number) => {
    setIndex(nextIndex);
    setFlipped(false);
  };

  return (
    <section className="min-w-0">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--app-muted)]">
            {flashcardSet.materialIncluded ? "Material-based set" : "Course-based set"}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-[var(--app-text)]">
            {flashcardSet.title}
          </h2>
          <p className="mt-1 text-xs text-[var(--app-muted)]">
            Card {index + 1} of {cardCount} · Generated {formatFlashcardDate(flashcardSet.createdAt)}
          </p>
        </div>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-[var(--app-surface-muted)]">
        <div
          className="h-full rounded-full bg-[var(--app-accent)] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="[perspective:1200px]">
        <button
          type="button"
          onClick={() => setFlipped((value) => !value)}
          aria-pressed={flipped}
          className="block min-h-[360px] w-full rounded-3xl text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
        >
          <div
            className="relative h-[360px] w-full transition-transform duration-500"
            style={{
              transformStyle: "preserve-3d",
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            <div
              className="absolute inset-0 flex flex-col justify-between rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 shadow-sm"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--app-accent)]">
                  Prompt
                </p>
                <p className="text-2xl font-semibold leading-snug text-[var(--app-text)]">
                  {card.front}
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 text-xs text-[var(--app-muted)]">
                <span>{flashcardSet.courseCode}</span>
                <span>Click to flip</span>
              </div>
            </div>

            <div
              className="absolute inset-0 flex flex-col justify-between rounded-3xl border border-[var(--app-border-strong)] bg-[var(--app-text)] p-8 text-[var(--app-bg)] shadow-sm"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest opacity-70">
                  Answer
                </p>
                <p className="text-xl font-semibold leading-relaxed">{card.back}</p>
              </div>

              <div className="flex items-center justify-between gap-4 text-xs opacity-70">
                <span>{flashcardSet.courseName}</span>
                <span>Click to flip back</span>
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <button
          type="button"
          onClick={() => goToCard(Math.max(0, index - 1))}
          disabled={index === 0}
          className="rounded-xl border border-[var(--app-border)] px-4 py-2 text-sm font-semibold text-[var(--app-muted-strong)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <button
          type="button"
          onClick={() => setFlipped((value) => !value)}
          className="rounded-xl bg-[var(--app-text)] px-5 py-2 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90"
        >
          Flip
        </button>

        <button
          type="button"
          onClick={() => goToCard(Math.min(cardCount - 1, index + 1))}
          disabled={index === cardCount - 1}
          className="rounded-xl border border-[var(--app-border)] px-4 py-2 text-sm font-semibold text-[var(--app-muted-strong)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </section>
  );
}
