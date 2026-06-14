"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

export default function DashboardPage() {
  const [major, setMajor] = useState<SavedMajor | null>(null);
  const [courses, setCourses] = useState<SavedCourse[]>([]);
  const [activeTab, setActiveTab] = useState("My Courses");

  useEffect(() => {
    const savedMajor = localStorage.getItem("ccny_major");
    const savedCourses = localStorage.getItem("ccny_courses");
    if (savedMajor) setMajor(JSON.parse(savedMajor));
    if (savedCourses) setCourses(JSON.parse(savedCourses));
  }, []);

  const grouped = courses.reduce((acc, course) => {
    if (!acc[course.section]) acc[course.section] = [];
    acc[course.section].push(course);
    return acc;
  }, {} as Record<string, SavedCourse[]>);

  const tabs = ["My Courses", "AI Tutor", "Flashcards", "Quizzes", "Notes", "Study Planner"];

  if (!major) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold mb-4">Welcome to CCNY Study AI</h1>
          <p className="text-gray-500 mb-8">Start by selecting your major to personalize your experience.</p>
          <Link href="/majors" className="bg-white text-black font-semibold px-8 py-3 rounded-2xl hover:bg-gray-100 transition inline-block">
            Choose My Major →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-white/10 bg-black/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{major.school}</p>
              <h1 className="text-2xl font-bold">{major.name}</h1>
              <p className="text-blue-400 font-mono text-sm mt-0.5">{major.code}</p>
            </div>
            
          </div>
          <div className="flex gap-6 text-sm overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 border-b-2 transition font-medium whitespace-nowrap ${
                  activeTab === tab ? "border-white text-white" : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {activeTab === "My Courses" && (
          <div>
            {courses.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500 mb-6 text-lg">No courses added yet.</p>
                <Link href={`/dashboard/${major.code}`} className="bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition inline-block">
                  + Add Courses
                </Link>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-bold">My Courses</h2>
                    <p className="text-gray-500 text-sm mt-1">{courses.length} course{courses.length !== 1 ? "s" : ""} saved</p>
                  </div>
                  <Link href={`/dashboard/${major.code}`} className="text-sm border border-white/10 text-gray-400 hover:text-white hover:border-white/30 px-4 py-2 rounded-xl transition">
                    + Add More
                  </Link>
                </div>
                <div className="space-y-10">
                  {Object.entries(grouped).map(([section, sectionCourses]) => (
                    <div key={section}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-1 h-5 rounded-full" style={{ backgroundColor: sectionCourses[0].color }} />
                        <h3 className="text-sm font-semibold text-gray-400">{section}</h3>
                      </div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {sectionCourses.map((course) => (
                          <div key={course.code} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 hover:bg-white/8 hover:border-white/20 transition">
                            <p className="text-xs font-mono font-bold mb-1.5" style={{ color: course.color }}>{course.code}</p>
                            <p className="text-sm font-medium text-white leading-snug">{course.name}</p>
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
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">AI Tutor</h3>
            <p className="text-gray-500 text-sm">Coming soon — ask anything about your courses.</p>
          </div>
        )}

        {activeTab === "Flashcards" && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m0 0a2.246 2.246 0 00-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0121 12v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6c0-.98.626-1.813 1.5-2.122" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Flashcards</h3>
            <p className="text-gray-500 text-sm">Coming soon — AI-generated flashcards for your courses.</p>
          </div>
        )}

        {activeTab === "Quizzes" && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Quizzes</h3>
            <p className="text-gray-500 text-sm">Coming soon — practice quizzes tailored to your courses.</p>
          </div>
        )}

        {activeTab === "Notes" && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Notes</h3>
            <p className="text-gray-500 text-sm">Coming soon — AI-powered notes for every course.</p>
          </div>
        )}

        {activeTab === "Study Planner" && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Study Planner</h3>
            <p className="text-gray-500 text-sm">Coming soon — plan your study schedule around your courses.</p>
          </div>
        )}
      </div>
    </main>
  );
}
