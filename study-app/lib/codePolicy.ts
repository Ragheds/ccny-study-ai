// Input here comes from authenticated database rows, never browser authorization.
export function selectedSavedCourse(
  state: unknown,
  courses: { course_code: string }[],
) {
  const data = (state as { data?: { ccny_selected_course?: unknown } } | null)
    ?.data;
  const code = data?.ccny_selected_course;
  return courses.find((course) => course.course_code === code) ?? null;
}
export function mayRevealSolution(attempt: string, requested: boolean) {
  return requested && attempt.trim().length >= 20;
}
