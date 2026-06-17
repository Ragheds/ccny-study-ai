"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AITutor } from "@/components/AITutor";
import { loadFromStorage, saveToStorage, KEYS } from "@/lib/storage";

type SavedCourse = {
  code: string;
  name: string;
  section: string;
  color: string;
};

type SavedMajor = {
  code: string;
  name: string;
  school: string;
};

const TABS = ["My Courses", "AI Tutor", "Flashcards", "Quizzes", "Notes", "Study Planner"];

export default function DashboardPage() {
  const [major, setMajor] = useState<SavedMajor | null>(null);
  const [courses, setCourses] = useState<SavedCourse[]>([]);
  const [activeTab, setActiveTab] = useState("My Courses");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedMajor = loadFromStorage<SavedMajor | null>(KEYS.MAJOR, null);
    const savedCourses = loadFromStorage<SavedCourse[]>(KEYS.COURSES, []);
    if (savedMajor) setMajor(savedMajor);
    setCourses(savedCourses);
    setLoading(false);
  }, []);

  const grouped = courses.reduce((acc, course) => {
    if (!acc[course.section]) acc[course.section] = [];
    acc[course.section].push(course);
    return acc;
  }, {} as Record<string, SavedCourse[]>);

  if (loading) return <main className="min-h-screen bg-black" />;

  if (!major) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-6">🎓</div>
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

      {/* Header */}
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

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition ${
                  activeTab === tab
                    ? "bg-white/10 text-white"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-10">

        {activeTab === "My Courses" && (
          <div>
            {courses.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">📚</div>
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
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-bold">My Courses</h2>
                    <p className="text-gray-500 text-sm mt-1">
                      {courses.length} course{courses.length !== 1 ? "s" : ""} saved
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
                          <div
                            key={course.code}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 hover:bg-white/8 hover:border-white/20 transition cursor-default"
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
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "AI Tutor" && (
          <AITutor major={major} courses={courses} />
        )}

        {activeTab === "Flashcards" && (
          <ComingSoon icon="🎴" title="Flashcards" desc="AI-generated flashcards for your courses." />
        )}

        {activeTab === "Quizzes" && (
          <ComingSoon icon="❓" title="Quizzes" desc="Practice quizzes tailored to your courses." />
        )}

        {activeTab === "Notes" && (
          <ComingSoon icon="📝" title="Notes" desc="AI-powered notes for every course." />
        )}

        {activeTab === "Study Planner" && (
          <ComingSoon icon="📅" title="Study Planner" desc="Plan your study schedule around your courses." />
        )}

      </div>
    </main>
  );
}

function ComingSoon({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-500 text-sm">{desc}</p>
      <p className="text-gray-600 text-xs mt-2">Coming soon</p>
    </div>
  );
}