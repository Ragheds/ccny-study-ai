"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { schools } from "../../../data/ccny";
import catalog from "../../../data/catalog.json";
import { saveToStorage, loadFromStorage, KEYS } from "@/lib/storage";
import { useHydrated } from "@/hooks/useStoredValue";

type Course = { code: string; name: string };
type Department = { name: string; prefix: string; courses: Course[] };
type CatalogSection = { section: string; color: string; departments: Department[] };

const typedCatalog = catalog as CatalogSection[];

function findMajorByCode(code: string) {
  for (const school of schools) {
    const plan = school.plans.find((candidate) => candidate.code === code);
    if (plan) return { ...plan, school: school.name };
  }
  return null;
}

const MAJOR_TO_SECTION: Record<string, string> = {
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
  "ECEU-BS": "Interdisciplinary Liberal Arts and Science - Center for Worker Education",
  "SJURBLF-BA": "Interdisciplinary Liberal Arts and Science - Center for Worker Education",
  "BEJ-BSED": "School of Education",
  "BCEU-BSED": "School of Education",
  "CEJ-BSED": "School of Education",
  "CHLDU-BSED": "School of Education",
  "LOESP-BA": "School of Education",
  "SCILNPE-BS": "School of Education",
  "UNDECL-BA": "Student Academic Success Hub (The Hub)",
  "ARCH-BARCH": "The Bernard and Ann Spitzer School of Architecture",
  "ARCH-BS": "The Bernard and Ann Spitzer School of Architecture",
  "URBSTBE-BA": "The Bernard and Ann Spitzer School of Architecture",
};

export default function CoursePickerPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = params.code as string;
  const hydrated = useHydrated();
  const fromAccount = searchParams.get("from") === "account";

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => {
    const savedCourses = loadFromStorage<{ code: string }[]>(KEYS.COURSES, []);
    return new Set(savedCourses.map((course) => course.code));
  });
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const major = findMajorByCode(code);
  const preferredSection = MAJOR_TO_SECTION[code] ?? null;

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

  const handleSave = () => {
    if (!major) return;

    const selectedCourses: { code: string; name: string; section: string; color: string }[] = [];

    for (const section of typedCatalog) {
      for (const dept of section.departments) {
        for (const course of dept.courses) {
          if (selected.has(course.code)) {
            selectedCourses.push({
              code: course.code,
              name: course.name,
              section: section.section,
              color: section.color,
            });
          }
        }
      }
    }

    saveToStorage(KEYS.MAJOR, { code: major.code, name: major.name, school: major.school });
    saveToStorage(KEYS.COURSES, selectedCourses);
    router.push(fromAccount ? "/dashboard/account" : "/dashboard");
  };

  if (!hydrated) return <main className="min-h-screen bg-[var(--app-bg)]" />;

  if (!major) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--app-muted)] mb-4">Major not found: {code}</p>
          <Link href="/majors" className="text-[var(--app-accent)] hover:underline">
            ← Back to majors
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      {!fromAccount && (
        <div className="border-b border-[var(--app-border)] bg-[var(--app-nav)] backdrop-blur sticky top-[65px] z-20">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center gap-3 mb-3">
              <Link href="/majors" className="text-[var(--app-muted)] hover:text-[var(--app-text)] transition text-sm">
                ← Majors
              </Link>
              <span className="text-[var(--app-muted)]">/</span>
              <span className="text-sm text-[var(--app-accent)] font-mono">{major.code}</span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{major.name}</h1>
                <p className="text-[var(--app-muted)] text-sm mt-0.5">{major.school}</p>
              </div>

              {selected.size > 0 && (
                <button
                  onClick={handleSave}
                  className="shrink-0 bg-[var(--app-text)] text-[var(--app-bg)] text-sm font-semibold px-5 py-2.5 rounded-xl transition hover:opacity-90"
                >
                  Save {selected.size} Course{selected.size !== 1 ? "s" : ""} →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-1">Pick Your Courses</h2>
          <p className="text-[var(--app-muted)] text-sm">
            {fromAccount
              ? `Update the saved courses for ${major.name}.`
              : "Select every course you are taking or have taken. Your AI tools will use these for context."}
          </p>
        </div>

        <div className="relative mb-5">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--app-muted)] w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          <input
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl pl-11 pr-10 py-3 outline-none focus:border-[var(--app-border-strong)] transition text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)] shadow-sm"
          />

          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-text)]">
              ✕
            </button>
          )}
        </div>

        <div className="mb-8">
          <button
            onClick={() => setShowFilters((value) => !value)}
            className="flex items-center gap-2 text-sm text-[var(--app-muted)] hover:text-[var(--app-text)] transition mb-3"
          >
            <div className="flex flex-col gap-1">
              <span className="block w-4 h-0.5 bg-current" />
              <span className="block w-4 h-0.5 bg-current" />
              <span className="block w-4 h-0.5 bg-current" />
            </div>
            <span>Filter by School</span>
          </button>

          {showFilters && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveSection(null)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                  activeSection === null
                    ? "bg-[var(--app-text)] text-[var(--app-bg)] border-[var(--app-text)]"
                    : "border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)]"
                }`}
              >
                All Schools
              </button>

              {orderedCatalog.map((section) => (
                <button
                  key={section.section}
                  onClick={() => setActiveSection(activeSection === section.section ? null : section.section)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border transition"
                  style={
                    activeSection === section.section
                      ? { backgroundColor: section.color, borderColor: section.color, color: "white" }
                      : {
                          borderColor: "var(--app-border)",
                          color: "var(--app-muted)",
                        }
                  }
                >
                  {section.section}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-12">
          {filtered.map((section) => (
            <div key={section.section}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: section.color }} />
                <h3 className="text-lg font-bold">{section.section}</h3>
                <span className="text-[var(--app-muted)] text-sm">
                  {section.departments.reduce((total, dept) => total + dept.courses.length, 0)} courses
                </span>
              </div>

              <div className="space-y-6">
                {section.departments.map((dept) => (
                  <div key={dept.name}>
                    <h4 className="text-xs font-semibold text-[var(--app-muted)] uppercase tracking-widest mb-3">
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
                                ? "border-[var(--app-border-strong)] bg-[var(--app-surface-strong)]"
                                : "border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-muted)] hover:border-[var(--app-border-strong)]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-mono font-bold mb-1" style={{ color: section.color }}>
                                  {course.code}
                                </p>
                                <p className="text-sm text-[var(--app-muted-strong)] leading-snug line-clamp-2">
                                  {course.name}
                                </p>
                              </div>

                              <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition ${
                                isSelected ? "border-[var(--app-text)] bg-[var(--app-text)]" : "border-[var(--app-border-strong)] group-hover:border-[var(--app-text)]"
                              }`}>
                                {isSelected && (
                                  <svg className="w-3 h-3 text-[var(--app-bg)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {(fromAccount || selected.size > 0) && (
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--app-nav)] backdrop-blur border-t border-[var(--app-border)] px-6 py-4 z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-sm text-[var(--app-muted)]">
              <span className="text-[var(--app-text)] font-semibold">
                {selected.size} course{selected.size !== 1 ? "s" : ""}
              </span>{" "}
              selected
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setSelected(new Set())}
                className="text-sm text-[var(--app-muted)] hover:text-[var(--app-text)] transition px-4 py-2"
              >
                Clear
              </button>

              <button
                onClick={handleSave}
                className="bg-[var(--app-text)] text-[var(--app-bg)] text-sm font-semibold px-6 py-2 rounded-xl transition hover:opacity-90"
              >
                {fromAccount ? "Save and Return to Settings →" : "Save My Courses →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
