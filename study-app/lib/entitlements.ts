// Phase 2 UI visibility only. Phase 9 must verify saved courses and plan on the server.
export const CODE_COURSE_PREFIXES = ["CSC", "EE", "ME", "CE", "CHE", "BME", "ENGR"] as const;

export function isCodeCourse(courseCode: string): boolean {
  const prefix = courseCode.trim().toUpperCase().split(/[\s\d-]/, 1)[0];
  return CODE_COURSE_PREFIXES.some((allowed) => allowed === prefix);
}
