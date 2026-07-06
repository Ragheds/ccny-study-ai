"use client";

import { useEffect, useState } from "react";
import { KEYS, readStorageRaw, STORAGE_CHANGE_EVENT } from "@/lib/storage";
import { useHydrated } from "@/hooks/useStoredValue";
import { ChatWorkspace, EMPTY_CHAT_WORKSPACE } from "@/lib/chatWorkspace";
import { EMPTY_FLASHCARD_STORE, FlashcardStore } from "@/lib/flashcards";
import { EMPTY_QUIZ_STORE, QuizStore } from "@/lib/quizzes";

/* ── types ────────────────────────────────────────────────────────────────── */
type Stats = {
  totalConversations: number;
  totalMessages: number;
  totalFlashcardSets: number;
  totalFlashcards: number;
  totalCourses: number;
  totalNotesCourses: number;
  totalQuizzes: number;
  averageQuizScore: number | null;
  lastActive: number | null;
  recentActivity: ActivityItem[];
};

type ActivityItem = {
  id: string;
  type: "conversation" | "flashcard" | "note" | "quiz";
  label: string;
  courseCode: string;
  updatedAt: number;
};

type ProgressSnapshot = {
  now: number;
  stats: Stats;
  heatmap: number[];
};

/* ── read account-scoped storage using the app's real scoping rules ────────── */
function readScoped<T>(key: string, fallback: T): T {
  try {
    const raw = readStorageRaw(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function buildProgressSnapshot(): ProgressSnapshot {
  const chat = readScoped<ChatWorkspace>(KEYS.CHAT_WORKSPACE, EMPTY_CHAT_WORKSPACE);
  const fc = readScoped<FlashcardStore>(KEYS.FLASHCARDS, EMPTY_FLASHCARD_STORE);
  const quizzes = readScoped<QuizStore>(KEYS.QUIZ_RESULTS, EMPTY_QUIZ_STORE);
  const notes = readScoped<Record<string, unknown>>(KEYS.NOTES_V2, {});
  const courses = readScoped<Array<{ code: string; name: string }>>(KEYS.COURSES, []);

  const allConvs = Object.values(chat.conversationsById ?? {});
  const totalMessages = allConvs.reduce((acc, c) => acc + (c.messages?.length ?? 0), 0);

  const allSets = Object.values(fc.setsById ?? {});
  const totalCards = allSets.reduce((acc, s) => acc + (s.cards?.length ?? 0), 0);

  const allQuizAttempts = Object.values(quizzes.attemptsById ?? {});
  const averageQuizScore =
    allQuizAttempts.length > 0
      ? Math.round(
          (allQuizAttempts.reduce(
            (acc, attempt) => acc + (attempt.totalQuestions ? attempt.correctCount / attempt.totalQuestions : 0),
            0
          ) /
            allQuizAttempts.length) *
            100
        )
      : null;

  const notesCodes = Object.keys(notes).filter((key) => {
    const note = notes[key] as { text?: string } | undefined;
    return typeof note?.text === "string" && note.text.trim().length > 0;
  });

  const activity: ActivityItem[] = [];

  allConvs.forEach((conversation) => {
    activity.push({
      id: `c_${conversation.id}`,
      type: "conversation",
      label: conversation.title || "Untitled chat",
      courseCode: conversation.courseCode || "",
      updatedAt: conversation.updatedAt || 0,
    });
  });

  allSets.forEach((set) => {
    activity.push({
      id: `f_${set.id}`,
      type: "flashcard",
      label: set.title || "Flashcard set",
      courseCode: set.courseCode || "",
      updatedAt: set.updatedAt || 0,
    });
  });

  allQuizAttempts.forEach((attempt) => {
    activity.push({
      id: `q_${attempt.id}`,
      type: "quiz",
      label: attempt.title || "Quiz",
      courseCode: attempt.courseCode || "",
      updatedAt: attempt.createdAt || 0,
    });
  });

  notesCodes.forEach((code) => {
    const note = notes[code] as { updatedAt?: number };
    activity.push({
      id: `n_${code}`,
      type: "note",
      label: `${code} notes`,
      courseCode: code,
      updatedAt: note.updatedAt || 0,
    });
  });

  activity.sort((a, b) => b.updatedAt - a.updatedAt);

  const allTimestamps = activity.map((item) => item.updatedAt).filter(Boolean);
  const lastActive = allTimestamps[0] ?? null;
  const now = Date.now();
  const DAY = 86_400_000;
  const buckets = Array(28).fill(0) as number[];
  for (const ts of allTimestamps) {
    const daysAgo = Math.floor((now - ts) / DAY);
    if (daysAgo >= 0 && daysAgo < 28) buckets[27 - daysAgo]++;
  }

  const stats: Stats = {
    totalConversations: allConvs.length,
    totalMessages,
    totalFlashcardSets: allSets.length,
    totalFlashcards: totalCards,
    totalCourses: courses.length,
    totalNotesCourses: notesCodes.length,
    totalQuizzes: allQuizAttempts.length,
    averageQuizScore,
    lastActive,
    recentActivity: activity.slice(0, 12),
  };

  return { now, stats, heatmap: buckets };
}

/* ── activity heatmap ────────────────────────────────────────────────────── */
function HeatmapCell({ count }: { count: number }) {
  const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 10 ? 3 : 4;
  const colors = ["var(--app-surface-muted)", "rgba(255,107,53,.2)", "rgba(255,107,53,.4)", "rgba(255,107,53,.7)", "rgb(255,107,53)"];
  return (
    <div title={`${count} activities`} className="h-4 w-4 rounded-sm transition" style={{ background: colors[level] }} />
  );
}

/* ── stat card ──────────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
      <div className="text-2xl mb-3">{icon}</div>
      <p className="text-3xl font-bold text-[var(--app-text)]">{value}</p>
      <p className="text-sm font-medium text-[var(--app-text)] mt-0.5">{label}</p>
      {sub && <p className="text-xs text-[var(--app-muted)] mt-1">{sub}</p>}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function ProgressPage() {
  const hydrated = useHydrated();
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null);

  useEffect(() => {
    if (!hydrated) return;

    const refresh = () => setSnapshot(buildProgressSnapshot());
    refresh();

    window.addEventListener(STORAGE_CHANGE_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(STORAGE_CHANGE_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [hydrated]);

  if (!hydrated || !snapshot) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)]">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="py-20 text-center text-[var(--app-muted)]">Loading…</div>
        </div>
      </main>
    );
  }

  const { stats, heatmap, now } = snapshot;

  function formatRelative(ts: number): string {
    const diff = now - ts;
    const min = Math.floor(diff / 60_000);
    const hr = Math.floor(diff / 3_600_000);
    const day = Math.floor(diff / 86_400_000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    if (hr < 24) return `${hr}h ago`;
    if (day < 7) return `${day}d ago`;
    return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
  }

  const typeIcon: Record<ActivityItem["type"], string> = {
    conversation: "💬",
    flashcard: "🗂️",
    note: "📝",
    quiz: "🎯",
  };
  const typeLabel: Record<ActivityItem["type"], string> = {
    conversation: "AI chat",
    flashcard: "Flashcards",
    note: "Notes",
    quiz: "Quiz",
  };

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Study Progress</h1>
          <p className="text-sm text-[var(--app-muted)] mt-1">
            Your personal study statistics — updated every visit.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard icon="💬" label="AI Conversations" value={stats.totalConversations} sub={`${stats.totalMessages} total messages`} />
          <StatCard icon="🗂️" label="Flashcard Sets" value={stats.totalFlashcardSets} sub={`${stats.totalFlashcards} cards total`} />
          <StatCard
            icon="🎯"
            label="Quizzes Taken"
            value={stats.totalQuizzes}
            sub={stats.averageQuizScore !== null ? `${stats.averageQuizScore}% avg score` : "no attempts yet"}
          />
          <StatCard icon="📝" label="Notes Courses" value={stats.totalNotesCourses} sub="courses with saved notes" />
          <StatCard icon="📚" label="Enrolled Courses" value={stats.totalCourses} sub="from the catalog" />
        </div>

        {stats.lastActive && (
          <div className="flex items-center gap-2 text-sm text-[var(--app-muted)]">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            Last study session: <span className="font-medium text-[var(--app-text)]">{formatRelative(stats.lastActive)}</span>
          </div>
        )}

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
          <p className="text-sm font-semibold mb-4">Study activity — last 28 days</p>
          <div className="flex gap-1.5 flex-wrap">
            {heatmap.map((count, i) => <HeatmapCell key={i} count={count} />)}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--app-muted)]">
            <span>Less</span>
            {[0, 1, 3, 6, 11].map((n) => <HeatmapCell key={n} count={n} />)}
            <span>More</span>
          </div>
        </div>

        {stats.recentActivity.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-4 uppercase tracking-wide text-[var(--app-muted)]">Recent Activity</h2>
            <div className="space-y-2">
              {stats.recentActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3">
                  <span className="text-lg">{typeIcon[item.type]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-xs text-[var(--app-muted)]">
                      {typeLabel[item.type]}
                      {item.courseCode && ` · `}
                      {item.courseCode && <span className="font-mono">{item.courseCode}</span>}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--app-muted)] shrink-0">
                    {item.updatedAt ? formatRelative(item.updatedAt) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.totalConversations === 0 && stats.totalFlashcardSets === 0 && stats.totalQuizzes === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--app-border)] py-16 text-center">
            <div className="text-4xl mb-3">🚀</div>
            <p className="font-semibold text-[var(--app-text)]">Nothing to track yet</p>
            <p className="text-sm text-[var(--app-muted)] mt-1">
              Start a study session in the AI Tutor — your stats will show up here.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}