"use client";

import Link from "next/link";
import { useState } from "react";
import { AITutor } from "@/components/AITutor";
import { useHydrated, useStoredValue } from "@/hooks/useStoredValue";
import { SavedCourse, SavedMajor } from "@/lib/chatWorkspace";
import { KEYS } from "@/lib/storage";

const EMPTY_COURSES: SavedCourse[] = [];

const TABS = [
  { id: "courses", label: "My Courses" },
  { id: "ai", label: "AI Tutor" },
  { id: "flashcards", label: "Flashcards" },
  { id: "quizzes", label: "Quizzes" },
  { id: "planner", label: "Study Planner" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function getInitialTab(): TabId {
  if (typeof window === "undefined") return "courses";
  return new URLSearchParams(window.location.search).get("tab") === "ai" ? "ai" : "courses";
}

function getInitialCourseCode(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("course");
}

function updateDashboardUrl(tab: TabId, courseCode?: string | null): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);

  if (tab === "ai") {
    params.set("tab", "ai");
  } else {
    params.delete("tab");
  }

  if (courseCode) {
    params.set("course", courseCode);
  } else {
    params.delete("course");
  }

  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

export default function DashboardPage() {
  const hydrated = useHydrated();
  const [major] = useStoredValue<SavedMajor | null>(KEYS.MAJOR, null);
  const [courses] = useStoredValue(KEYS.COURSES, EMPTY_COURSES);
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);
  const [activeCourseCode, setActiveCourseCode] = useState<string | null>(getInitialCourseCode);

  const grouped = courses.reduce((acc, course) => {
    if (!acc[course.section]) acc[course.section] = [];
    acc[course.section].push(course);
    return acc;
  }, {} as Record<string, SavedCourse[]>);

  const openTab = (tab: TabId) => {
    const courseCode = tab === "ai" ? activeCourseCode ?? courses[0]?.code ?? null : null;
    setActiveTab(tab);
    if (tab === "ai") setActiveCourseCode(courseCode);
    updateDashboardUrl(tab, courseCode);
  };

  const openCourseWorkspace = (course: SavedCourse) => {
    setActiveTab("ai");
    setActiveCourseCode(course.code);
    updateDashboardUrl("ai", course.code);
  };

  const handleTutorCourseChange = (courseCode: string) => {
    setActiveCourseCode(courseCode);
    updateDashboardUrl("ai", courseCode);
  };

  if (!hydrated) return <main className="min-h-screen bg-black" />;

  if (!major) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl font-bold text-blue-300">
            C
          </div>

          <h1 className="text-4xl font-bold mb-4">Welcome to CCNY Study AI</h1>

          <p className="text-gray-400 mb-8 text-lg">
            Start by selecting your major to personalize your AI study experience.
          </p>

          <Link
            href="/majors"
            className="bg-white text-black font-semibold px-8 py-4 rounded-2xl hover:bg-gray-100 transition inline-block text-lg"
          >
            Choose My Major →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-white/10 bg-black/90 backdrop-blur sticky top-[65px] z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                {major.school}
              </p>

              <h1 className="text-2xl font-bold">{major.name}</h1>

              <p className="text-blue-400 font-mono text-sm mt-0.5">{major.code}</p>
            </div>

            <Link
              href={`/dashboard/${major.code}`}
              className="shrink-0 text-xs border border-white/10 text-gray-400 hover:text-white hover:border-white/30 px-4 py-2 rounded-xl transition"
            >
              + Add Courses
            </Link>
          </div>

          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => openTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? "bg-white/10 text-white"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {activeTab === "courses" && (
          <div>
            {courses.length === 0 ? (
              <div className="text-center py-20">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl font-bold text-blue-300">
                  +
                </div>

                <p className="text-gray-400 text-lg mb-6">No courses added yet.</p>

                <Link
                  href={`/dashboard/${major.code}`}
                  className="bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition inline-block"
                >
                  + Add Courses
                </Link>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-xl font-bold">My Courses</h2>
                    <p className="text-gray-500 text-sm mt-1">
                      Click a course to open its AI workspace.
                    </p>
                  </div>

                  <Link
                    href={`/dashboard/${major.code}`}
                    className="text-sm border border-white/10 text-gray-400 hover:text-white hover:border-white/30 px-4 py-2 rounded-xl transition"
                  >
                    + Add More
                  </Link>
                </div>

                <div className="space-y-10">
                  {Object.entries(grouped).map(([section, sectionCourses]) => (
                    <div key={section}>
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-1 h-5 rounded-full"
                          style={{ backgroundColor: sectionCourses[0].color }}
                        />

                        <h3 className="text-sm font-semibold text-gray-400">{section}</h3>
                      </div>

                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {sectionCourses.map((course) => (
                          <button
                            key={course.code}
                            onClick={() => openCourseWorkspace(course)}
                            className="group rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left hover:bg-white/10 hover:border-white/25 transition"
                          >
                            <p
                              className="text-xs font-mono font-bold mb-1.5"
                              style={{ color: course.color }}
                            >
                              {course.code}
                            </p>

                            <p className="text-sm font-medium text-white leading-snug">
                              {course.name}
                            </p>

                            <p className="mt-3 text-xs text-gray-600 group-hover:text-gray-400">
                              Open AI workspace →
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "ai" && (
          <AITutor
            key={activeCourseCode ?? courses[0]?.code ?? "ai"}
            major={major}
            courses={courses}
            activeCourseCode={activeCourseCode}
            onActiveCourseChange={handleTutorCourseChange}
          />
        )}

        {activeTab === "flashcards" && (
          <ComingSoon title="Flashcards" desc="AI-generated flashcards for your courses." />
        )}

        {activeTab === "quizzes" && (
          <ComingSoon title="Quizzes" desc="Practice quizzes tailored to your courses." />
        )}

        {activeTab === "planner" && (
          <ComingSoon title="Study Planner" desc="Plan your study schedule around your courses." />
        )}
      </div>
    </main>
  );
}

function ComingSoon({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="text-center py-20">
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-500 text-sm">{desc}</p>
      <p className="text-gray-600 text-xs mt-2">Coming soon</p>
    </div>
  );
}