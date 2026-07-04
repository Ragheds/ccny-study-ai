"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import catalog from "../../data/catalog.json";
import { SavedCourse } from "@/lib/chatWorkspace";
import { KEYS, loadFromStorage, saveToStorage } from "@/lib/storage";

type Course = { code: string; name: string };
type Department = { name: string; prefix: string; courses: Course[] };
type CatalogSection = { section: string; color: string; departments: Department[] };

const typedCatalog = catalog as CatalogSection[];

export default function CourseCatalogPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  // ← FIXED: selectedMap stores full SavedCourse info (section + color) so we
  //   can build proper SavedCourse objects when the user hits Add.
  const [selectedMap, setSelectedMap] = useState<Map<string, SavedCourse>>(new Map());
  const [saved, setSaved] = useState(false);

  const toggleCourse = (course: Course, section: string, color: string) => {
    setSelectedMap(prev => {
      const next = new Map(prev);
      if (next.has(course.code)) {
        next.delete(course.code);
      } else {
        next.set(course.code, { code: course.code, name: course.name, section, color });
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return typedCatalog
      .map(section => ({
        ...section,
        departments: section.departments
          .map(dept => ({
            ...dept,
            courses: dept.courses.filter(
              course =>
                course.code.toLowerCase().includes(q) ||
                course.name.toLowerCase().includes(q)
            ),
          }))
          .filter(dept => dept.courses.length > 0),
      }))
      .filter(
        section =>
          section.departments.length > 0 &&
          (activeSection === null || section.section === activeSection)
      );
  }, [query, activeSection]);

  const totalCourses = typedCatalog.reduce(
    (acc, section) =>
      acc + section.departments.reduce((t, dept) => t + dept.courses.length, 0),
    0
  );

  // ← FIXED: actually saves to localStorage and redirects to dashboard
  const handleAdd = () => {
    if (selectedMap.size === 0) return;

    const existing = loadFromStorage<SavedCourse[]>(KEYS.COURSES, []);
    const existingCodes = new Set(existing.map(c => c.code));
    const newCourses = [...selectedMap.values()].filter(c => !existingCodes.has(c.code));

    saveToStorage(KEYS.COURSES, [...existing, ...newCourses]);
    setSaved(true);

    setTimeout(() => router.push("/dashboard"), 400);
  };

  const selectedCount = selectedMap.size;

  return (
    <main className="min-h-screen bg-black text-white">
      {/* top bar */}
      <div className="border-b border-white/10 bg-black/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Course Catalog</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {totalCourses}+ courses across all CCNY departments
              </p>
            </div>

            {selectedCount > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-blue-400">{selectedCount} selected</span>
                {/* ← FIXED: button now has an onClick handler that saves + redirects */}
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={saved}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {saved ? "Saved ✓" : "Add to My Courses"}
                </button>
              </div>
            )}
          </div>

          {/* search */}
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              placeholder="Search by course code or name… (e.g. CSC 10300, Data Structures)"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-10 text-sm placeholder:text-gray-600 outline-none focus:border-white/20 transition"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                ✕
              </button>
            )}
          </div>

          {/* section filters */}
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveSection(null)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                activeSection === null
                  ? "border-white bg-white text-black"
                  : "border-white/20 text-gray-400 hover:border-white/40 hover:text-white"
              }`}
            >
              All Schools
            </button>
            {typedCatalog.map(section => (
              <button
                key={section.section}
                type="button"
                onClick={() => setActiveSection(activeSection === section.section ? null : section.section)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  activeSection === section.section
                    ? "text-white border-white"
                    : "border-white/20 text-gray-400 hover:border-white/40 hover:text-white"
                }`}
                style={activeSection === section.section ? { background: section.color, borderColor: section.color } : {}}
              >
                {section.section}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* catalog grid */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-500">No courses match your search.</p>
          </div>
        ) : (
          filtered.map(section => (
            <div key={section.section}>
              <div className="mb-5 flex items-center gap-3">
                <div className="h-5 w-1.5 rounded-full" style={{ background: section.color }} />
                <h2 className="text-sm font-semibold text-gray-300">{section.section}</h2>
              </div>

              <div className="space-y-6">
                {section.departments.map(dept => (
                  <div key={dept.prefix}>
                    <p className="mb-2 ml-1 text-xs font-semibold text-gray-600 uppercase tracking-widest">
                      {dept.name}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {dept.courses.map(course => {
                        const isSelected = selectedMap.has(course.code);
                        return (
                          <button
                            key={course.code}
                            type="button"
                            onClick={() => toggleCourse(course, section.section, section.color)}
                            className="group relative rounded-2xl border p-4 text-left transition"
                            style={{
                              background: isSelected ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.02)",
                              borderColor: isSelected ? section.color : "rgba(255,255,255,.1)",
                              boxShadow: isSelected ? `0 0 0 1px ${section.color}` : "none",
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-mono text-xs font-bold" style={{ color: section.color }}>
                                  {course.code}
                                </p>
                                <p className="mt-1 text-sm leading-snug text-gray-200">{course.name}</p>
                              </div>
                              <div
                                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition"
                                style={{
                                  borderColor: isSelected ? section.color : "rgba(255,255,255,.25)",
                                  background: isSelected ? section.color : "transparent",
                                }}
                              >
                                {isSelected && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                    <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
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
          ))
        )}
      </div>

      {/* Sticky bottom bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-white/10 bg-black/90 backdrop-blur px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">{selectedCount} course{selectedCount !== 1 ? "s" : ""} selected</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[300px]">
                {[...selectedMap.keys()].join(", ")}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedMap(new Map())}
                className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:border-white/40"
              >
                Clear
              </button>
              {/* ← FIXED: bottom sticky button also wired up */}
              <button
                type="button"
                onClick={handleAdd}
                disabled={saved}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
              >
                {saved ? "Saved ✓ Redirecting…" : "Add to My Courses →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
