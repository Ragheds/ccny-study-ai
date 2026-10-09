"use client";

import { Suspense } from "react";
import { NotesWorkspace } from "@/components/NotesWorkspace";
import { CourseSwitcher } from "@/components/CourseSwitcher";
import { WorkspaceSkeleton } from "@/components/WorkspaceSkeleton";
import { useCourseSelection } from "@/hooks/useCourseSelection";
import { useStoredValue } from "@/hooks/useStoredValue";
import type { SavedCourse } from "@/lib/chatWorkspace";
import { KEYS } from "@/lib/storage";

export default function NotesPage() {
  return <Suspense fallback={<WorkspaceSkeleton />}><CourseNotes /></Suspense>;
}

function CourseNotes() {
  const [courses] = useStoredValue<SavedCourse[]>(KEYS.COURSES, []);
  const { selectedCourse, navigate } = useCourseSelection(courses);
  return <>
    <div className="border-b border-[var(--app-border)] px-6 py-2">
      <CourseSwitcher courses={courses} selectedCourse={selectedCourse} onChange={(code) => navigate(undefined, code)} />
    </div>
    <NotesWorkspace key={selectedCourse?.code ?? "notes"} initialCourseCode={selectedCourse?.code ?? ""} />
  </>;
}
