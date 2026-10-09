"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CourseModeBar, type WorkspaceMode } from "@/components/CourseModeBar";
import { DashboardHome } from "@/components/DashboardHome";
import { WorkspaceSkeleton } from "@/components/WorkspaceSkeleton";
import { useHydrated, useStoredValue } from "@/hooks/useStoredValue";
import { useCourseSelection } from "@/hooks/useCourseSelection";
import type { SavedCourse, SavedMajor } from "@/lib/chatWorkspace";
import { isCodeCourse } from "@/lib/entitlements";
import { KEYS } from "@/lib/storage";

const AITutor = dynamic(() => import("@/components/AITutor").then((module) => module.AITutor), { loading: () => <WorkspaceSkeleton /> });
const FlashcardsWorkspace = dynamic(() => import("@/components/FlashcardsWorkspace").then((module) => module.FlashcardsWorkspace), { loading: () => <WorkspaceSkeleton /> });
const QuizzesTab = dynamic(() => import("@/components/QuizzesWorkspace").then((module) => module.QuizzesTab), { loading: () => <WorkspaceSkeleton /> });
const NotesWorkspace = dynamic(() => import("@/components/NotesWorkspace").then((module) => module.NotesWorkspace), { loading: () => <WorkspaceSkeleton /> });

type TabId = "courses" | WorkspaceMode | "flashcards" | "quizzes" | "planner";
const VALID_TABS: TabId[] = ["courses", "ai", "whiteboard", "notes", "code", "flashcards", "quizzes", "planner"];
const COURSE_MODES: WorkspaceMode[] = ["ai", "whiteboard", "notes", "code"];

function PhasePreview({ title, phase, onChat }: { title: string; phase: number; onChat: () => void }) {
  return <section className="mx-auto mt-8 max-w-3xl px-4 sm:px-6">
    <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 sm:p-10">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--app-accent)]">Coming in Phase {phase}</p>
      <h1 className="mt-3 text-2xl font-semibold text-[var(--app-text)]">{title}</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--app-muted-strong)]">This workspace is on the way. You can study this course with the tutor now.</p>
      <button type="button" onClick={onChat} className="mt-6 rounded-xl bg-[var(--app-text)] px-5 py-3 text-sm font-semibold text-[var(--app-bg)]">Open chat →</button>
    </div>
  </section>;
}

export default function DashboardPage() {
  return <Suspense fallback={<WorkspaceSkeleton />}><DashboardContent /></Suspense>;
}

function DashboardContent() {
  const hydrated = useHydrated();
  const [major] = useStoredValue<SavedMajor | null>(KEYS.MAJOR, null);
  const [courses] = useStoredValue<SavedCourse[]>(KEYS.COURSES, []);
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const requestedTab: TabId = VALID_TABS.find((tab) => tab === tabParam) ?? "courses";
  const { selectedCourse, navigate } = useCourseSelection(courses);
  const activeTab = requestedTab === "code" && (!selectedCourse || !isCodeCourse(selectedCourse.code)) ? "ai" : requestedTab;
  const activeCourseCode = selectedCourse?.code ?? null;
  const activeMode = COURSE_MODES.find((mode) => mode === activeTab) ?? null;

  const openTab = (tab: TabId, courseCode: string | null = activeCourseCode) =>
    navigate(tab === "courses" ? null : tab, courseCode);

  if (!hydrated) return <WorkspaceSkeleton />;
  if (!major) return <section className="flex min-h-full items-center justify-center bg-[var(--app-bg)] px-5 text-center text-[var(--app-text)]">
    <div className="max-w-md py-16">
      <h1 className="text-3xl font-semibold">Welcome to CCNY Study AI</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--app-muted-strong)]">Choose your major to set up your study space.</p>
      <Link href="/majors" className="mt-6 inline-block rounded-xl bg-[var(--app-text)] px-5 py-3 text-sm font-semibold text-[var(--app-bg)]">Choose my major →</Link>
    </div>
  </section>;

  return <div className="min-h-full bg-[var(--app-bg)] text-[var(--app-text)]">
    <CourseModeBar courses={courses} selectedCourse={selectedCourse} activeMode={activeMode} onHome={() => openTab("courses", null)} onOpen={(mode, courseCode) => openTab(mode, courseCode)} onCourseChange={(code) => navigate(undefined, code)} />
    {activeTab === "courses" && <DashboardHome major={major} courses={courses} onOpen={openTab} selectedCourseCode={activeCourseCode} />}
    {activeTab === "ai" && <AITutor key={activeCourseCode ?? "ai"} major={major} courses={courses} activeCourseCode={activeCourseCode} />}
    {activeTab === "whiteboard" && <PhasePreview title="Whiteboard" phase={8} onChat={() => openTab("ai")} />}
    {activeTab === "notes" && <NotesWorkspace key={activeCourseCode ?? "notes"} initialCourseCode={activeCourseCode ?? ""} />}
    {activeTab === "code" && <PhasePreview title="Code workspace" phase={9} onChat={() => openTab("ai")} />}
    {activeTab === "flashcards" && <FlashcardsWorkspace key={activeCourseCode ?? "flashcards"} major={major} courses={courses} activeCourseCode={activeCourseCode} />}
    {activeTab === "quizzes" && <QuizzesTab key={activeCourseCode ?? "quizzes"} major={major} courses={courses} activeCourseCode={activeCourseCode} />}
    {activeTab === "planner" && <PhasePreview title="Study planner" phase={7} onChat={() => openTab("ai")} />}
  </div>;
}
