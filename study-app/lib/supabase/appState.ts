"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  AccountScopedStorageSnapshot,
  KEYS,
  loadAccountScopedStorageSnapshot,
  saveToStorage,
} from "@/lib/storage";

const APP_STATE_VERSION = 1;

type StoredAppState = {
  version: typeof APP_STATE_VERSION;
  updatedAt: number;
  data: AccountScopedStorageSnapshot;
};

type UserAppStateRow = {
  state: unknown;
};

export type RemoteAppStateLoadResult =
  | { status: "found"; data: AccountScopedStorageSnapshot; updatedAt: number }
  | { status: "missing" }
  | { status: "error"; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function normalizeStoredState(value: unknown): StoredAppState | null {
  if (!isRecord(value) || !isRecord(value.data)) return null;

  return {
    version: APP_STATE_VERSION,
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
    data: value.data as AccountScopedStorageSnapshot,
  };
}

function groupIdsByCourse(rows: Array<{ id: string; data: unknown }>): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const row of rows) {
    const courseCode = isRecord(row.data) && typeof row.data.courseCode === "string" ? row.data.courseCode : "";
    if (!courseCode) continue;
    (grouped[courseCode] ??= []).push(row.id);
  }
  return grouped;
}

export async function loadRemoteAppState(userId: string): Promise<RemoteAppStateLoadResult> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };

  const [cache, profile, courses, notes, flashcards, quizzes] = await Promise.all([
    supabase.from("user_app_state").select("state,updated_at").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("major,study_mode,study_mode_prompt_dismissed,updated_at").eq("user_id", userId).maybeSingle(),
    supabase.from("user_courses").select("data").eq("user_id", userId).eq("is_deleted", false),
    supabase.from("notes").select("course_code,data").eq("user_id", userId).eq("is_deleted", false),
    supabase.from("flashcards").select("id,data").eq("user_id", userId).eq("is_deleted", false),
    supabase.from("quiz_results").select("id,data").eq("user_id", userId).eq("is_deleted", false),
  ]);
  const firstError = [cache, profile, courses, notes, flashcards, quizzes].find((result) => result.error)?.error;
  if (firstError) {
    console.error("Remote app state load error:", firstError.message);
    return { status: "error", message: firstError.message };
  }

  const row = cache.data as (UserAppStateRow & { updated_at?: string }) | null;
  const normalized = normalizeStoredState(row?.state);
  if (!normalized && !profile.data) return { status: "missing" };
  const data: AccountScopedStorageSnapshot = { ...normalized?.data };
  if (profile.data) {
    data.ccny_major = profile.data.major;
    data.ccny_study_mode = profile.data.study_mode;
    data.ccny_study_mode_dismissed = profile.data.study_mode_prompt_dismissed;
    data.ccny_courses = (courses.data ?? []).map((course: { data: unknown }) => course.data);
    data.ccny_notes_v2 = Object.fromEntries((notes.data ?? []).map((note: { course_code: string; data: unknown }) => [note.course_code, note.data]));
    const savedCards = data.ccny_flashcards as Record<string, unknown> | undefined;
    const cardRows = (flashcards.data ?? []) as Array<{ id: string; data: unknown }>;
    data.ccny_flashcards = {
      version: 2,
      activeSetByCourse: savedCards?.activeSetByCourse ?? {},
      setIdsByCourse: savedCards?.setIdsByCourse ?? groupIdsByCourse(cardRows),
      setsById: Object.fromEntries(cardRows.map((card) => [card.id, card.data])),
    };
    const savedQuizzes = data.ccny_quiz_results as Record<string, unknown> | undefined;
    const quizRows = (quizzes.data ?? []) as Array<{ id: string; data: unknown }>;
    data.ccny_quiz_results = {
      version: 1,
      attemptIdsByCourse: savedQuizzes?.attemptIdsByCourse ?? groupIdsByCourse(quizRows),
      attemptsById: Object.fromEntries(quizRows.map((quiz) => [quiz.id, quiz.data])),
    };
  }
  const updatedAt = normalized?.updatedAt ?? (Date.parse(row?.updated_at ?? "") || 0);
  return { status: "found", data, updatedAt };
}

export async function saveRemoteAppState(userId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const now = Date.now();
  const snapshot = loadAccountScopedStorageSnapshot();
  const legacyNote = snapshot[KEYS.NOTES];
  if (!snapshot[KEYS.NOTES_V2] && isRecord(legacyNote) && typeof legacyNote.text === "string") {
    const rawCourses = snapshot[KEYS.COURSES];
    const courses: unknown[] = Array.isArray(rawCourses) ? rawCourses : [];
    const firstCourse = courses[0] as { code?: unknown } | undefined;
    const courseCode = typeof firstCourse?.code === "string" ? firstCourse.code : "general";
    snapshot[KEYS.NOTES_V2] = { [courseCode]: legacyNote };
    saveToStorage(KEYS.NOTES_V2, snapshot[KEYS.NOTES_V2]);
  }
  const state: StoredAppState = {
    version: APP_STATE_VERSION,
    updatedAt: now,
    data: snapshot,
  };

  const { error } = await supabase.from("user_app_state").upsert(
    {
      user_id: userId,
      state,
      updated_at: new Date(now).toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Remote app state save error:", error);
  }
}
