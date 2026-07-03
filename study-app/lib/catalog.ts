import catalog from "@/data/catalog.json";

export type Course = { code: string; name: string };
export type Department = { name: string; prefix: string; courses: Course[] };
export type CatalogSection = { section: string; color: string; departments: Department[] };

export const typedCatalog = catalog as CatalogSection[];

export function filterCatalog(
  sections: CatalogSection[],
  query: string,
  activeSection: string | null
): CatalogSection[] {
  const q = query.toLowerCase().trim();

  return sections
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
}

export function toggleSetItem(prev: Set<string>, item: string): Set<string> {
  const next = new Set(prev);
  if (next.has(item)) {
    next.delete(item);
  } else {
    next.add(item);
  }
  return next;
}
