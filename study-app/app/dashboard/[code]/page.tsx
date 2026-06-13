"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { schools } from "../../../data/ccny";
import catalog from "../../../data/catalog.json";

type Course = {
  code: string;
  name: string;
};

type Department = {
  name: string;
  prefix: string;
  courses: Course[];
};

type CatalogSection = {
  section: string;
  color: string;
  departments: Department[];
};

const typedCatalog = catalog as CatalogSection[];

// Map major codes to their school section in catalog
const MAJOR_TO_SECTION: Record<string, string> = {
  // Colin Powell
  "ANTH-BA": "Colin Powell School for Civic and Global Leadership",
  "ASALARU-BA": "Colin Powell School for Civic and Global Leadership",
  "ECON4-BAMA": "Colin Powell School for Civic and Global Leadership",
  "ECON-BA": "Colin Powell School for Civic and Global Leadership",
  "ENTPNR-BBA": "Colin Powell School for Civic and Global Leadership",
  "FIN-BBA": "Colin Powell School for Civic and Global Leadership",
  "INTLS-BA": "Colin Powell School for Civic and Global Leadership",
  "MGMTA-BA": "Colin Powell School for Civic and Global Leadership",
  "MCIS-BA": "Colin Powell School for Civic and Global Leadership",
  "PSC-BA": "Colin Powell School for Civic and Global Leadership",
  "PSY4-BAMA": "Colin Powell School for Civic and Global Leadership",
  "PSYCH-BA": "Colin Powell School for Civic and Global Leadership",
  "IPSYU-BS": "Colin Powell School for Civic and Global Leadership",
  "SOC-BA": "Colin Powell School for Civic and Global Leadership",
  "STRMAN-BBA": "Colin Powell School for Civic and Global Leadership",
  // Humanities & Arts
  "ART-BA": "College of Liberal Arts and Science (Division of Humanities and the Arts)",
  "BLSTD-BA": "College of Liberal Arts and Science (Division of Humanities and the Arts)",
  "COMM-BA": "College of Liberal Arts and Science (Division of Humanities and the Arts)",
  "COMPLIT-BA": "College of Liberal Arts and Science (Division of Humanities and the Arts)",
  "DIGGMDV-BS": "College of Liberal Arts and Science (Division of Humanities and the Arts)",
  "EDM-BFA": "College of Liberal Arts and Science (Division of Humanities and the Arts)",
  "ENGL-BA": "College of Liberal Arts and Science (Division of Humanities and the Arts)",
  "FILM-BFA": "College of Liberal Arts and Science (Division of Humanities and the Arts)",
  "HIST4-BAMA": "College of Liberal Arts and Science (Division of Humanities and the Arts)",
  "HIST-BA": "College of Liberal Arts and Science (Division of Humanities and the Arts)",
  "JEWSTD-BA": "College of Liberal Arts and Science (Division of Humanities and the Arts)",
  "JZSTDIN-BM": "College of Liberal Arts and Science (Division of Humanities and the Arts)",
  "JZSTDVO-BM": "College of Liberal Arts and Science (Division of Humanities and the Arts)",
  "FRITSP-BA": "College of Liberal Arts and Science (Division of Humanities and the Arts)",
  "PHIL-BA": "College of Liberal Arts and Science (Division of Humanities and the Arts)",
  "POPMUS-BA": "College of Liberal Arts and Science (Division of Humanities and the Arts)",
  "SONCART-BM": "College of Liberal Arts and Science (Division of Humanities and the Arts)",
  "THTR-BA": "College of Liberal Arts and Science (Division of Humanities and the Arts)",
  // Sciences
  "BIOCHM-BS": "College of Liberal Arts and Science (Division of Science)",
  "BIOL-BS": "College of Liberal Arts and Science (Division of Science)",
  "BBCC-BS": "College of Liberal Arts and Science (Division of Science)",
  "BTECH-BS": "College of Liberal Arts and Science (Division of Science)",
  "CHEM4-BSMS": "College of Liberal Arts and Science (Division of Science)",
  "CHEM-BS": "College of Liberal Arts and Science (Division of Science)",
  "ENVESC-BS": "College of Liberal Arts and Science (Division of Science)",
  "ERTHAT-BA": "College of Liberal Arts and Science (Division of Science)",
  "ERTHAT-BS": "College of Liberal Arts and Science (Division of Science)",
  "MATH-BS": "College of Liberal Arts and Science (Division of Science)",
  "MATHU-BA": "College of Liberal Arts and Science (Division of Science)",
  "MCEAS-BA": "College of Liberal Arts and Science (Division of Science)",
  "MCEAS-BS": "College of Liberal Arts and Science (Division of Science)",
  "MTHSAP-BS": "College of Liberal Arts and Science (Division of Science)",
  "PHYSCU-BS": "College of Liberal Arts and Science (Division of Science)",
  "LUNDECL-BS": "College of Liberal Arts and Science (Division of Science)",
  // Engineering
  "BME-BE": "Grove School of Engineering",
  "CHEME-BE": "Grove School of Engineering",
  "CHMEH-BE": "Grove School of Engineering",
  "CMPEGR-BE": "Grove School of Engineering",
  "CMPSC-BS": "Grove School of Engineering",
  "CLER-BE": "Grove School of Engineering",
  "ELECE-BE": "Grove School of Engineering",
  "ESENVE-BE": "Grove School of Engineering",
  "MECHE-BE": "Grove School of Engineering",
  "UNDECL-BE": "Grove School of Engineering",
  // CWE
  "ECEU-BS": "Interdisciplinary Liberal Arts and Science - Center for Worker Education",
  "SJURBLF-BA": "Interdisciplinary Liberal Arts and Science - Center for Worker Education",
  // Education
  "BEJ-BSED": "School of Education",
  "BCEU-BSED": "School of Education",
  "CEJ-BSED": "School of Education",
  "CHLDU-BSED": "School of Education",
  "LOESP-BA": "School of Education",
  "SCILNPE-BS": "School of Education",
  // Hub
  "UNDECL-BA": "Student Academic Success Hub (The Hub)",
  // Architecture
  "ARCH-BARCH": "The Bernard and Ann Spitzer School of Architecture",
  "ARCH-BS": "The Bernard and Ann Spitzer School of Architecture",
  "URBSTBE-BA": "The Bernard and Ann Spitzer School of Architecture",
};

export default function DashboardPage() {
  const params = useParams();
  const code = params.code as string;

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Find the major info
  const major =
    schools
      .flatMap((school) =>
        school.plans.map((plan) => ({ ...plan, school: school.name }))
      )
      .find((plan) => plan.code === code) ?? null;

  // Get the preferred school section for this major
  const preferredSection = MAJOR_TO_SECTION[code] ?? null;

  // Reorder catalog so preferred section comes first
  const orderedCatalog = useMemo(() => {
    if (!preferredSection) return typedCatalog;
    const preferred = typedCatalog.filter((s) => s.section === preferredSection);
    const rest = typedCatalog.filter((s) => s.section !== preferredSection);
    return [...preferred, ...rest];
  }, [preferredSection]);

  const toggleCourse = (courseCode: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(courseCode)) {
        next.delete(courseCode);
      } else {
        next.add(courseCode);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return orderedCatalog
      .map((section) => ({
        ...section,
        departments: section.departments
          .map((dept) => ({
            ...dept,
            courses: dept.courses.filter(
              (course) =>
                course.code.toLowerCase().includes(q) ||
                course.name.toLowerCase().includes(q)
            ),
          }))
          .filter((dept) => dept.courses.length > 0),
      }))
      .filter(
        (section) =>
          section.departments.length > 0 &&
          (activeSection === null || section.section === activeSection)
      );
  }, [search, activeSection, orderedCatalog]);

  if (!major) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Major not found: {code}</p>
          <Link href="/majors" className="text-blue-400 hover:underline">
            ← Back to majors
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">

      {/* Header */}
      <div className="border-b border-white/10 bg-black/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/majors"
              className="text-gray-500 hover:text-white transition text-sm"
            >
              ← Majors
            </Link>
            <span className="text-gray-700">/</span>
            <span className="text-sm text-blue-400 font-mono">{major.code}</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{major.name}</h1>
              <p className="text-gray-500 text-sm mt-1">{major.school}</p>
            </div>
            {selected.size > 0 && (
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-white/60">
                  {selected.size} selected
                </span>
                <button className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-xl transition hover:bg-gray-200">
                  Save My Courses
                </button>
              </div>
            )}
          </div>

          {/* Nav tabs */}
          <div className="flex gap-6 mt-4 text-sm overflow-x-auto">
            {["My Courses", "AI Tutor", "Flashcards", "Quizzes", "Notes", "Study Planner"].map((tab) => (
              <button
                key={tab}
                className={`pb-3 border-b-2 transition font-medium whitespace-nowrap ${
                  tab === "My Courses"
                    ? "border-white text-white"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Course Picker */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h2 className="text-xl font-bold mb-1">Pick Your Courses</h2>
          <p className="text-gray-500 text-sm">
            Select the courses you are taking or have taken for your {major.name} degree.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            placeholder="Search courses... (e.g. CSC 10300, Data Structures)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 outline-none focus:border-white/20 transition text-sm placeholder:text-gray-600"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Section filter pills */}
        <div className="mb-8">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition mb-3"
          >
            <span className="text-lg leading-none">☰</span>
            <span>Filter by School</span>
          </button>

          {showFilters && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveSection(null)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                  activeSection === null
                    ? "bg-white text-black border-white"
                    : "border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                All Schools
              </button>
              {orderedCatalog.map((s) => (
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
          )}
        </div>

        {/* Course grid */}
        <div className="space-y-12">
          {filtered.map((section) => (
            <div key={section.section}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: section.color }} />
                <h3 className="text-lg font-bold">{section.section}</h3>
                <span className="text-gray-600 text-sm">
                  {section.departments.reduce((a, d) => a + d.courses.length, 0)} courses
                </span>
              </div>

              <div className="space-y-6">
                {section.departments.map((dept) => (
                  <div key={dept.name}>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                      {dept.name}
                    </h4>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                      {dept.courses.map((course) => {
                        const isSelected = selected.has(course.code);
                        return (
                          <button
                            key={course.code}
                            onClick={() => toggleCourse(course.code)}
                            className={`group text-left rounded-xl border px-4 py-3 transition-all ${
                              isSelected
                                ? "border-white/60 bg-white/10"
                                : "border-white/8 bg-white/3 hover:bg-white/8 hover:border-white/30"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p
                                  className="text-xs font-mono font-bold mb-1"
                                  style={{ color: section.color }}
                                >
                                  {course.code}
                                </p>
                                <p className="text-sm text-gray-300 leading-snug line-clamp-2">
                                  {course.name}
                                </p>
                              </div>
                              <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition ${
                                isSelected
                                  ? "border-white bg-white"
                                  : "border-white/20 group-hover:border-white/50"
                              }`}>
                                {isSelected && (
                                  <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      </div>

      {/* Sticky bottom bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur border-t border-white/10 px-6 py-4 z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-sm text-gray-400">
              <span className="text-white font-semibold">{selected.size} course{selected.size !== 1 ? "s" : ""}</span> selected for {major.name}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSelected(new Set())}
                className="text-sm text-gray-500 hover:text-white transition px-4 py-2"
              >
                Clear
              </button>
              <button className="bg-white hover:bg-gray-200 text-black text-sm font-semibold px-6 py-2 rounded-xl transition">
                Save My Courses →
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
