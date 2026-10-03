"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStoredValue } from "@/hooks/useStoredValue";
import { KEYS } from "@/lib/storage";
import { EMPTY_CHAT_WORKSPACE, type ChatWorkspace, type SavedCourse, type SavedMajor } from "@/lib/chatWorkspace";
import { EMPTY_FLASHCARD_STORE, type FlashcardStore } from "@/lib/flashcards";
import { EMPTY_QUIZ_STORE, type QuizStore } from "@/lib/quizzes";

type NotesStore = Record<string, { updatedAt?: number }>;
type ActionTab = "ai" | "flashcards" | "quizzes" | "whiteboard" | "notes";

function getStreak(timestamps: number[]): number {
  const days = new Set(timestamps.filter((value) => Number.isFinite(value) && value > 0).map((value) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }));
  const cursor = new Date();
  const today = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
  if (!days.has(today)) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(`${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`)) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function DashboardHome({ major, courses, onOpen }: {
  major: SavedMajor;
  courses: SavedCourse[];
  onOpen: (tab: ActionTab, courseCode: string) => void;
}) {
  const [chats] = useStoredValue<ChatWorkspace>(KEYS.CHAT_WORKSPACE, EMPTY_CHAT_WORKSPACE);
  const [flashcards] = useStoredValue<FlashcardStore>(KEYS.FLASHCARDS, EMPTY_FLASHCARD_STORE);
  const [quizzes] = useStoredValue<QuizStore>(KEYS.QUIZ_RESULTS, EMPTY_QUIZ_STORE);
  const [notes] = useStoredValue<NotesStore>(KEYS.NOTES_V2, {});

  const activity = useMemo(() => {
    const items: { at: number; courseCode: string; tab: ActionTab; label: string }[] = [];
    for (const chat of Object.values(chats.conversationsById ?? {})) {
      if (chat.updatedAt) items.push({ at: chat.updatedAt, courseCode: chat.courseCode, tab: "ai", label: chat.title || "Tutor chat" });
    }
    for (const set of Object.values(flashcards.setsById ?? {})) {
      items.push({ at: set.updatedAt, courseCode: set.courseCode, tab: "flashcards", label: set.title || "Flashcards" });
    }
    for (const quiz of Object.values(quizzes.attemptsById ?? {})) {
      items.push({ at: quiz.createdAt, courseCode: quiz.courseCode, tab: "quizzes", label: quiz.title || "Quiz review" });
    }
    for (const [courseCode, note] of Object.entries(notes)) {
      if (note.updatedAt) items.push({ at: note.updatedAt, courseCode, tab: "notes", label: "Course notes" });
    }
    return items.sort((a, b) => b.at - a.at);
  }, [chats, flashcards, quizzes, notes]);
  const recent = activity.find((item) => courses.some((course) => course.code === item.courseCode));
  const recentCourse = courses.find((course) => course.code === recent?.courseCode);
  const streak = getStreak(activity.map((item) => item.at));
  const firstCourseCode = courses[0]?.code ?? "";

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 pb-28 pt-6 sm:px-8 sm:pt-8 md:pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--app-accent)]">Study home</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--app-text)] sm:text-3xl">Make this study session count.</h1>
          <p className="mt-2 text-sm text-[var(--app-muted-strong)]">{major.name} · Pick up where you left off or start fresh.</p>
        </div>
        <Link href={`/dashboard/${major.code}`} className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-xs font-semibold text-[var(--app-text)] transition hover:border-[var(--app-border-strong)]">Edit courses</Link>
      </header>

      <section className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm sm:p-7" aria-labelledby="continue-title">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--app-accent)]">Continue where you left off</p>
            <h2 id="continue-title" className="mt-2 truncate text-xl font-semibold text-[var(--app-text)]">{recent ? recent.label : "Your next study session starts here"}</h2>
            <p className="mt-1 text-sm text-[var(--app-muted-strong)]">{recent && recentCourse ? `${recentCourse.code} · ${recentCourse.name}` : "Choose a course and ask your first question."}</p>
          </div>
          {courses.length > 0 ? (
            <button type="button" onClick={() => onOpen(recent?.tab ?? "ai", recent?.courseCode ?? firstCourseCode)}
              className="min-h-11 shrink-0 rounded-xl bg-[var(--app-text)] px-5 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]">
              {recent ? "Continue studying →" : "Start with a tutor →"}
            </button>
          ) : <Link href={`/dashboard/${major.code}`} className="rounded-xl bg-[var(--app-text)] px-5 py-3 text-center text-sm font-semibold text-[var(--app-bg)]">Add a course →</Link>}
        </div>
      </section>

      <section aria-labelledby="quick-actions-title">
        <h2 id="quick-actions-title" className="mb-3 text-sm font-semibold text-[var(--app-text)]">Quick actions</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {([
            ["ai", "✦", "Ask the tutor"],
            ["quizzes", "?", "Quiz me"],
            ["flashcards", "▤", "Review cards"],
            ["whiteboard", "▧", "Whiteboard preview"],
          ] as const).map(([tab, icon, label]) => (
            <button key={tab} type="button" disabled={!firstCourseCode} onClick={() => onOpen(tab, firstCourseCode)}
              className="flex min-h-[5.25rem] flex-col items-start justify-between rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 text-left text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-muted)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[var(--app-accent)]">
              <span className="text-lg text-[var(--app-accent)]" aria-hidden="true">{icon}</span>{label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <section aria-labelledby="courses-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div><h2 id="courses-title" className="text-lg font-semibold text-[var(--app-text)]">Study a course today</h2><p className="text-xs text-[var(--app-muted)]">Choose from your saved courses.</p></div>
            <span className="text-xs text-[var(--app-muted)]">{courses.length} saved</span>
          </div>
          {courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--app-border-strong)] p-7 text-sm text-[var(--app-muted-strong)]">No courses saved yet. <Link href={`/dashboard/${major.code}`} className="font-semibold text-[var(--app-accent)] underline">Add your first course</Link>.</div>
          ) : (
            <div className="space-y-2.5">
              {courses.map((course) => (
                <button key={course.code} type="button" onClick={() => onOpen("ai", course.code)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 text-left transition hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--app-accent)]">
                  <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: course.color }} />
                  <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[var(--app-text)]">{course.code} · {course.name}</strong><span className="mt-1 block text-xs text-[var(--app-muted)]">Online only · Offline size —</span></span>
                  <span className="text-[var(--app-muted)]" aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          )}
        </section>
        <aside className="space-y-3" aria-label="Study status">
          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
            <p className="text-xs font-semibold text-[var(--app-muted-strong)]">Study streak</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--app-text)]">{streak} <span className="text-sm font-medium text-[var(--app-muted)]">day{streak === 1 ? "" : "s"}</span></p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--app-muted)]">Based on your saved chats, notes, cards, and quizzes.</p>
          </div>
          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
            <p className="text-xs font-semibold text-[var(--app-muted-strong)]">Offline readiness</p>
            <p className="mt-3 text-sm font-semibold text-[var(--app-text)]">No course packs downloaded</p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--app-muted)]">Study packs and download sizes arrive in Phase 4. For now, saved notes on this device may remain available, but AI needs internet.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
