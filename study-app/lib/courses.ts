import { SavedCourse } from "@/lib/chatWorkspace";

export const EMPTY_COURSES: SavedCourse[] = [];

export function findSelectedCourse(
  courses: SavedCourse[],
  activeCourseCode?: string | null
): SavedCourse | null {
  return courses.find((course) => course.code === activeCourseCode) ?? courses[0] ?? null;
}
