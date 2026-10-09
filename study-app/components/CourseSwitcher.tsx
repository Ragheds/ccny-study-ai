"use client";

import type { SavedCourse } from "@/lib/chatWorkspace";

export function CourseSwitcher({ courses, selectedCourse, onChange, compact = false }: {
  courses: SavedCourse[];
  selectedCourse: SavedCourse | null;
  onChange: (courseCode: string) => void;
  compact?: boolean;
}) {
  if (!courses.length) return <span className="text-xs text-[var(--app-muted)]">No course yet</span>;
  return <label className="min-w-0">
    <span className="sr-only">Active course</span>
    <select value={selectedCourse?.code ?? courses[0].code} onChange={(event) => onChange(event.target.value)}
      className={`truncate rounded-lg bg-transparent px-1 py-2 text-xs font-semibold text-[var(--app-text)] outline-none focus-visible:outline-2 focus-visible:outline-[var(--app-accent)] sm:text-sm ${compact ? "max-w-[9rem] sm:max-w-[16rem]" : "max-w-full"}`}>
      {courses.map((course) => <option key={course.code} value={course.code}>{course.code} · {course.name}</option>)}
    </select>
  </label>;
}
