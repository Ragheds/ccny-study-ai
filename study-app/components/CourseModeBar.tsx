"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { CourseSwitcher } from "@/components/CourseSwitcher";
import { StudyModeControl } from "@/components/StudyModeControl";
import { useStoredValue } from "@/hooks/useStoredValue";
import { KEYS } from "@/lib/storage";
import type { AccountProfile } from "@/lib/account";
import type { SavedCourse } from "@/lib/chatWorkspace";
import { isCodeCourse } from "@/lib/entitlements";

export type WorkspaceMode = "ai" | "whiteboard" | "notes" | "code";

function subscribeOnline(change: () => void) {
  window.addEventListener("online", change);
  window.addEventListener("offline", change);
  return () => { window.removeEventListener("online", change); window.removeEventListener("offline", change); };
}

export function CourseModeBar({ courses, selectedCourse, activeMode, onOpen, onHome, onCourseChange }: {
  courses: SavedCourse[];
  selectedCourse: SavedCourse | null;
  activeMode: WorkspaceMode | null;
  onOpen: (mode: WorkspaceMode, courseCode: string) => void;
  onHome: () => void;
  onCourseChange: (courseCode: string) => void;
}) {
  const [account] = useStoredValue<AccountProfile | null>(KEYS.ACCOUNT, null);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const modes: { id: WorkspaceMode; label: string }[] = [
    { id: "ai", label: "Chat" }, { id: "whiteboard", label: "Whiteboard" },
    { id: "notes", label: "Notes" },
    ...(selectedCourse && isCodeCourse(selectedCourse.code) ? [{ id: "code" as const, label: "Code" }] : []),
  ];

  return (
    <div className="sticky top-0 z-50 border-b border-[var(--app-border)] bg-[var(--app-nav)]">
      <div className="mx-auto max-w-7xl px-3 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={onHome} className="shrink-0 rounded-lg px-2.5 py-2 text-xs font-semibold text-[var(--app-muted-strong)] transition hover:bg-[var(--app-surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--app-accent)]">Home</button>
            <span className="text-[var(--app-muted)]" aria-hidden="true">/</span>
            <CourseSwitcher courses={courses} selectedCourse={selectedCourse} onChange={onCourseChange} compact />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--app-muted-strong)]" role="status">
              <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden="true" />{online ? "Online" : "Offline"}
            </span>
            <Link href="/dashboard/account" aria-label="Account" className="rounded-lg focus-visible:outline-2 focus-visible:outline-[var(--app-accent)]">
              {account ? <ProfileAvatar account={account} size="sm" /> : <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--app-surface-muted)] text-xs">◯</span>}
            </Link>
          </div>
        </div>
        <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
          <div role="tablist" aria-label="Course workspace mode" className="flex min-w-0 gap-0.5 overflow-x-auto rounded-xl bg-[var(--app-surface-muted)] p-1">
            {modes.map((mode) => (
              <button key={mode.id} type="button" role="tab" aria-selected={activeMode === mode.id} disabled={!selectedCourse}
                onClick={() => selectedCourse && onOpen(mode.id, selectedCourse.code)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-[var(--app-accent)] disabled:opacity-50 sm:px-3.5 ${activeMode === mode.id ? "bg-[var(--app-surface)] text-[var(--app-text)] shadow-sm" : "text-[var(--app-muted-strong)] hover:text-[var(--app-text)]"}`}>
                {mode.label}
              </button>
            ))}
          </div>
          <StudyModeControl hasCourses={courses.length > 0} />
        </div>
      </div>
    </div>
  );
}
