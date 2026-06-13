"use client";

import { useState, useMemo } from "react";
import catalog from "../../data/catalog.json";

const sectionColors: Record<string, string> = {
  "Engineering": "#3b82f6",
  "Sciences": "#10b981",
  "Social Sciences": "#f59e0b",
  "Humanities & Arts": "#ec4899",
  "Media & Communications": "#8b5cf6",
  "Languages": "#06b6d4",
  "Education": "#f97316",
  "Architecture": "#84cc16",
  "Interdisciplinary": "#e11d48",
};
// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function CourseCatalogPage() {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleCourse = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return catalog
      .map((section) => ({
        ...section,
        departments: section.departments
          .map((dept) => ({
            ...dept,
            courses: dept.courses.filter(
              (c) =>
                c.code.toLowerCase().includes(q) ||
                c.name.toLowerCase().includes(q)
            ),
          }))
          .filter((dept) => dept.courses.length > 0),
      }))
      .filter(
        (section) =>
          section.departments.length > 0 &&
          (activeSection === null || section.section === activeSection)
      );
  }, [query, activeSection]);

  const totalCourses = catalog.reduce(
    (acc, s) => acc + s.departments.reduce((a, d) => a + d.courses.length, 0),
    0
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-white/10 bg-black/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Course Catalog</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {totalCourses}+ courses across all CCNY departments
              </p>
            </div>
            {selected.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-blue-400 font-medium">
                  {selected.size} selected
                </span>
                <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
                  Add to My Courses
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              placeholder="Search by course code or name... (e.g. CSC 10300, Data Structures)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 outline-none focus:border-white/20 transition text-sm placeholder:text-gray-600"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                ✕
              </button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveSection(null)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                activeSection === null ? "bg-white text-black border-white" : "border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
              }`}
            >
              All
            </button>
            {catalog.map((s: any) => (
              <button
                key={s.section}
                onClick={() => setActiveSection(activeSection === s.section ? null : s.section)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border transition"
                style={
                  activeSection === s.section
                    ? { backgroundColor: s.color, borderColor: s.color, color: "white" }
                    : { borderColor: "rgba(255,255,255,0.1)", color: "#9ca3af" }
                }
              >
                {s.section}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-16">
        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-600">
            No courses found for &ldquo;{query}&rdquo;
          </div>
        )}

        {filtered.map((section: any) => (
          <div key={section.section}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-8 rounded-full" style={{ backgroundColor: sectionColors[section.section] ?? "#ffffff" }} />
              <h2 className="text-2xl font-bold">{section.section}</h2>
              <span className="text-gray-600 text-sm">
                {section.departments.reduce((a: number, d: any) => a + d.courses.length, 0)} courses
              </span>
            </div>

            <div className="space-y-8">
              {section.departments.map((dept: any) => (
                <div key={dept.name}>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
                    {dept.name}
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {dept.courses.map((course: any) => {
                      const isSelected = selected.has(course.code);
                      return (
                        <button
                          key={course.code}
                          onClick={() => toggleCourse(course.code)}
                          className={`group text-left rounded-xl border px-4 py-3 transition-all ${
                            isSelected ? "border-blue-500/60 bg-blue-500/10" : "border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-mono font-bold mb-1" style={{ color: sectionColors[section.section] ?? "#ffffff" }}>
                                {course.code}
                              </p>
                              <p className="text-sm text-gray-300 leading-snug line-clamp-2">
                                {course.name}
                              </p>
                            </div>
                            <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition ${
                              isSelected ? "border-blue-500 bg-blue-500" : "border-white/20 group-hover:border-white/40"
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur border-t border-white/10 px-6 py-4 z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-sm text-gray-400">
              <span className="text-white font-semibold">{selected.size} course{selected.size !== 1 ? "s" : ""}</span> selected
            </p>
            <div className="flex gap-3">
              <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:text-white transition px-4 py-2">
                Clear
              </button>
              <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-6 py-2 rounded-xl transition">
                Add to My Courses →
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}