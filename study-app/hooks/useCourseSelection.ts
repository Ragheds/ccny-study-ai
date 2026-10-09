"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useStoredValue } from "@/hooks/useStoredValue";
import type { SavedCourse } from "@/lib/chatWorkspace";
import { isCodeCourse } from "@/lib/entitlements";
import { KEYS } from "@/lib/storage";

export function useCourseSelection(courses: SavedCourse[]) {
  const searchParams = useSearchParams();
  const [savedCode, setSavedCode] = useStoredValue<string>(KEYS.SELECTED_COURSE, "");
  const urlCode = searchParams.get("course");
  const urlCourse = courses.find((course) => course.code === urlCode);
  const selectedCourse = urlCourse ?? courses.find((course) => course.code === savedCode) ?? courses[0] ?? null;

  useEffect(() => {
    if (urlCourse && savedCode !== urlCourse.code) setSavedCode(urlCourse.code);
  }, [savedCode, setSavedCode, urlCourse]);

  useEffect(() => {
    if (searchParams.get("tab") !== "code" || (selectedCourse && isCodeCourse(selectedCourse.code))) return;
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "ai");
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  }, [searchParams, selectedCourse]);

  function navigate(tab?: string | null, requestedCode?: string | null) {
    const target = courses.find((course) => course.code === requestedCode) ?? selectedCourse;
    if (target && target.code !== savedCode) setSavedCode(target.code);
    const params = new URLSearchParams(window.location.search);
    if (tab !== undefined) {
      if (tab) params.set("tab", tab);
      else params.delete("tab");
    }
    if (target) params.set("course", target.code);
    else params.delete("course");
    if (params.get("tab") === "code" && (!target || !isCodeCourse(target.code))) params.set("tab", "ai");
    const query = params.toString();
    window.history.pushState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }

  return { selectedCourse, navigate };
}
