"use client";

import Link from "next/link";
import { useState } from "react";
import { useHydrated, useStoredValue } from "@/hooks/useStoredValue";
import { SavedCourse, SavedMajor, EMPTY_CHAT_WORKSPACE, ChatWorkspace } from "@/lib/chatWorkspace";
import { KEYS } from "@/lib/storage";
import { EMPTY_FLASHCARD_STORE, FlashcardStore } from "@/lib/flashcards";
import { EMPTY_QUIZ_STORE, QuizStore } from "@/lib/quizzes";
import { AccountProfile } from "@/lib/account";
import { StarburstLogo } from "@/components/StarburstLogo";

const EMPTY_COURSES: SavedCourse[] = [];

function SearchIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }
function ChevronIcon({ open }: { open: boolean }) { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function TutorIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.97-4.03 9-9 9-1.5 0-2.9-.37-4.14-1.02L3 21l1.02-3.86A8.96 8.96 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function CardsIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M7 6V4a2 2 0 012-2h9a2 2 0 012 2v9a2 2 0 01-2 2h-2" stroke="currentColor" strokeWidth="1.6"/></svg>; }
function QuizIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2 1.75-2.35 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="12.05" cy="16.5" r=".6" fill="currentColor"/></svg>; }
function CalendarIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>; }
function ChartIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 20V10M12 20V4M20 20v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>; }

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  const hr = Math.floor(diff / 3_600_000);
  const day = Math.floor(diff / 86_400_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day === 1) return "yesterday";
  return `${day}d ago`;
}

export function AppSidebar() {
  const hydrated = useHydrated();
  const [account] = useStoredValue<AccountProfile | null>(KEYS.ACCOUNT, null);
  const [major] = useStoredValue<SavedMajor | null>(KEYS.MAJOR, null);
  const [courses] = useStoredValue(KEYS.COURSES, EMPTY_COURSES);
  const [chatWorkspace] = useStoredValue<ChatWorkspace>(KEYS.CHAT_WORKSPACE, EMPTY_CHAT_WORKSPACE);
  const [flashcardStore] = useStoredValue<FlashcardStore>(KEYS.FLASHCARDS, EMPTY_FLASHCARD_STORE);
  const [quizStore] = useStoredValue<QuizStore>(KEYS.QUIZ_RESULTS, EMPTY_QUIZ_STORE);

  const [expandedCourse, setExpandedCourse] = useState<string | null>(courses[0]?.code ?? null);
  const [plannerOpen, setPlannerOpen] = useState(true);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);

  if (!hydrated) {
    return <div className="w-[220px] shrink-0 border-r border-[var(--app-border)]" style={{ background: "var(--app-surface)" }} />;
  }

  // Real, computed data only — nothing here is invented. Empty states show
  // honestly instead of a placeholder number standing in for real usage.
  const allConversations = Object.values(chatWorkspace.conversationsById ?? {});
  const lastActive = allConversations
    .map(c => ({ courseCode: c.courseCode, updatedAt: c.updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const lastActiveCourse = lastActive ? courses.find(c => c.code === lastActive.courseCode) : null;

  const allQuizAttempts = Object.values(quizStore.attemptsById ?? {});
  const avgQuizScore = allQuizAttempts.length > 0
    ? Math.round((allQuizAttempts.reduce((acc, a) => acc + (a.totalQuestions ? a.correctCount / a.totalQuestions : 0), 0) / allQuizAttempts.length) * 100)
    : null;
  const totalFlashcardSets = Object.values(flashcardStore.setsById ?? {}).length;

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-[var(--app-border)] px-2 py-3" style={{ background: "var(--app-surface)" }}>
      <div className="flex items-center gap-2 px-2 pb-3">
        <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: "var(--app-accent)" }}>
          <StarburstLogo size={12} white />
        </div>
        <span className="text-[13px] font-medium text-[var(--app-text)]">CCNY Study AI</span>
      </div>

      {/* Search — visual only for now, wired up in the next phase */}
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--app-border)] px-2.5 py-1.5 text-[12.5px] text-[var(--app-muted)]" style={{ cursor: "default" }}>
        <SearchIcon />
        <span className="flex-1">Search everything</span>
        <span className="rounded border border-[var(--app-border)] px-1 text-[10.5px]">⌘K</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="px-2 pb-1 text-[10.5px] font-medium uppercase tracking-wide text-[var(--app-muted)]">Courses</p>

        {courses.length === 0 ? (
          <Link href="/majors" className="block px-2 py-2 text-[12.5px] text-[var(--app-muted)] hover:text-[var(--app-text)]">
            Add your first course →
          </Link>
        ) : (
          courses.map(course => {
            const isExpanded = expandedCourse === course.code;
            return (
              <div key={course.code} className="mb-0.5">
                <button
                  type="button"
                  onClick={() => setExpandedCourse(isExpanded ? null : course.code)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] font-medium transition"
                  style={{ background: isExpanded ? "var(--app-surface-strong)" : "transparent", color: "var(--app-text)" }}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: course.color }} />
                  <span className="min-w-0 flex-1 truncate">{course.code}</span>
                </button>

                {isExpanded && (
                  <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--app-border)] pl-2">
                    <Link href={`/dashboard?tab=ai&course=${course.code}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-[var(--app-muted)] transition hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]">
                      <TutorIcon /> AI tutor
                    </Link>
                    <Link href={`/dashboard?tab=flashcards&course=${course.code}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-[var(--app-muted)] transition hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]">
                      <CardsIcon /> Flashcards
                    </Link>
                    <Link href={`/dashboard?tab=quizzes&course=${course.code}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-[var(--app-muted)] transition hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]">
                      <QuizIcon /> Quizzes
                    </Link>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Study planner — real "continue where you left off" data, not invented tasks.
           A real task/deadline system is its own future project (see conversation). */}
        <div className="mt-4 border-t border-[var(--app-border)] pt-3">
          <button type="button" onClick={() => setPlannerOpen(v => !v)} className="flex w-full items-center justify-between px-2 pb-1.5 text-[11.5px] font-medium text-[var(--app-text)]">
            <span className="flex items-center gap-1.5"><CalendarIcon /> Study planner</span>
            <ChevronIcon open={plannerOpen} />
          </button>
          {plannerOpen && (
            <div className="px-2 text-[11.5px] leading-relaxed text-[var(--app-muted)]">
              {lastActiveCourse
                ? <>Continue <span style={{ color: "var(--app-text)" }}>{lastActiveCourse.code}</span> — {timeAgo(lastActive!.updatedAt)}</>
                : "Nothing studied yet — start a chat to begin"}
            </div>
          )}
        </div>

        {/* Analytics — every number here is computed from real stored data. */}
        <div className="mt-3 border-t border-[var(--app-border)] pt-3">
          <button type="button" onClick={() => setAnalyticsOpen(v => !v)} className="flex w-full items-center justify-between px-2 pb-1.5 text-[11.5px] font-medium text-[var(--app-text)]">
            <span className="flex items-center gap-1.5"><ChartIcon /> Analytics</span>
            <ChevronIcon open={analyticsOpen} />
          </button>
          {analyticsOpen && (
            <div className="space-y-1 px-2 text-[11.5px] text-[var(--app-muted)]">
              <p>{allQuizAttempts.length > 0 ? `${avgQuizScore}% avg quiz score` : "No quizzes taken yet"}</p>
              <p>{totalFlashcardSets > 0 ? `${totalFlashcardSets} flashcard set${totalFlashcardSets === 1 ? "" : "s"}` : "No flashcards yet"}</p>
            </div>
          )}
        </div>
      </div>

      <Link href="/dashboard/account" className="mt-2 flex items-center gap-2 border-t border-[var(--app-border)] px-2 pt-3 text-[12.5px] text-[var(--app-text)] transition hover:opacity-80">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10.5px] font-medium" style={{ background: "var(--app-accent-soft)", color: "var(--app-accent)" }}>
          {(account?.name ?? major?.name ?? "?").charAt(0).toUpperCase()}
        </div>
        <span className="truncate">{account?.name ?? "Account"}</span>
      </Link>
    </aside>
  );
}
