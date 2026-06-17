"use client";

import { useState } from "react";
import { useStoredValue } from "@/hooks/useStoredValue";
import { SavedCourse, SavedMajor } from "@/lib/chatWorkspace";
import {
  createFlashcardSet,
  EMPTY_FLASHCARD_STORE,
  FLASHCARD_TARGET_COUNT,
  FlashcardSet,
  formatFlashcardDate,
  parseFlashcardsFromText,
  upsertFlashcardSet,
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

export function FlashcardsWorkspace({
  major,
  courses,
  activeCourseCode,
  onActiveCourseChange,
}: FlashcardsWorkspaceProps) {
  const [store, setStore] = useStoredValue(KEYS.FLASHCARDS, EMPTY_FLASHCARD_STORE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCourse =
    courses.find((course) => course.code === activeCourseCode) ?? courses[0] ?? null;
  const activeSet = selectedCourse ? store.setsByCourse[selectedCourse.code] : undefined;

  const chooseCourse = (course: SavedCourse) => {
    setError("");
    onActiveCourseChange?.(course.code);
  };

  const generateFlashcards = async () => {
    if (!selectedCourse || loading) return;

    const prompt = `Create exactly ${FLASHCARD_TARGET_COUNT} front/back flashcards for ${selectedCourse.name} (${selectedCourse.code}).`;

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

      const flashcardSet = createFlashcardSet(selectedCourse, major, drafts, prompt);
      setStore((current) => upsertFlashcardSet(current, flashcardSet));
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

          <button
            type="button"
            onClick={() => void generateFlashcards()}
            disabled={loading}
            className="rounded-2xl bg-[var(--app-text)] px-5 py-3 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Generating..."
              : activeSet
                ? `Regenerate ${FLASHCARD_TARGET_COUNT}`
                : `Generate ${FLASHCARD_TARGET_COUNT}`}
          </button>
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

      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
          {error}
        </div>
      )}

      {activeSet ? (
        <FlashcardReview key={activeSet.id} flashcardSet={activeSet} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 shadow-sm">
            <p className="mb-3 text-xs uppercase tracking-widest text-[var(--app-muted)]">
              Ready to study
            </p>
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-[var(--app-text)]">
              Generate a complete recall set for {selectedCourse.code}.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--app-muted)]">
              Each card has a prompt side and an answer side, saved separately for this course.
            </p>
          </div>

          <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-6">
            <p className="text-sm font-semibold text-[var(--app-text)]">Set details</p>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-widest text-[var(--app-muted)]">Cards</dt>
                <dd className="mt-1 font-mono text-lg text-[var(--app-text)]">
                  {FLASHCARD_TARGET_COUNT}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-[var(--app-muted)]">Course</dt>
                <dd className="mt-1 text-[var(--app-text)]">{selectedCourse.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-[var(--app-muted)]">Major</dt>
                <dd className="mt-1 text-[var(--app-text)]">{major.name}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

function FlashcardReview({ flashcardSet }: { flashcardSet: FlashcardSet }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = flashcardSet.cards[index];
  const cardCount = flashcardSet.cards.length;

  const goToCard = (nextIndex: number) => {
    setIndex(nextIndex);
    setFlipped(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="min-w-0">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--app-muted)]">
              Card {index + 1} of {cardCount}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-[var(--app-text)]">
              {flashcardSet.courseCode} flashcards
            </h2>
          </div>

          <p className="text-xs text-[var(--app-muted)]">
            Generated {formatFlashcardDate(flashcardSet.createdAt)}
          </p>
        </div>

        <div className="[perspective:1200px]">
          <button
            type="button"
            onClick={() => setFlipped((value) => !value)}
            aria-pressed={flipped}
            className="block h-[360px] w-full rounded-3xl text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            <div
              className="relative h-full w-full transition-transform duration-500"
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
                  <span>{flashcardSet.courseName}</span>
                  <span>Flip</span>
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
                  <span>{flashcardSet.courseCode}</span>
                  <span>Flip back</span>
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
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
            Flip card
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

      <aside className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
        <p className="mb-3 text-xs uppercase tracking-widest text-[var(--app-muted)]">
          All cards
        </p>
        <div className="grid grid-cols-5 gap-2 lg:grid-cols-4">
          {flashcardSet.cards.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goToCard(itemIndex)}
              className={`aspect-square rounded-xl border text-sm font-semibold transition ${
                itemIndex === index
                  ? "border-[var(--app-text)] bg-[var(--app-text)] text-[var(--app-bg)]"
                  : "border-[var(--app-border)] bg-[var(--app-surface-muted)] text-[var(--app-muted-strong)] hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
              }`}
            >
              {itemIndex + 1}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
