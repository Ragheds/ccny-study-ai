import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAccountProfileFromAuthUser, getAccountInitials, isCompactAvatarUrl } from "@/lib/account";
import { KEYS, type AccountScopedStorageSnapshot } from "@/lib/storage";

export type ServerStudyState = {
  account: ReturnType<typeof createAccountProfileFromAuthUser>;
  data: AccountScopedStorageSnapshot;
  updatedAt: number;
  hasStudyData: boolean;
};

function groupIds(rows: Array<{ id: string; data: unknown }>): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const row of rows) {
    const data = row.data as { courseCode?: unknown } | null;
    if (typeof data?.courseCode !== "string") continue;
    (grouped[data.courseCode] ??= []).push(row.id);
  }
  return grouped;
}

export async function loadServerStudyState(): Promise<ServerStudyState | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return null;

  const userId = auth.user.id;
  const [cache, profile, courses, notes, flashcards, quizzes] = await Promise.all([
    supabase.from("user_app_state").select("state,updated_at").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("major,study_mode,study_mode_prompt_dismissed,updated_at").eq("user_id", userId).maybeSingle(),
    supabase.from("user_courses").select("data").eq("user_id", userId).eq("is_deleted", false),
    supabase.from("notes").select("course_code,data").eq("user_id", userId).eq("is_deleted", false),
    supabase.from("flashcards").select("id,data").eq("user_id", userId).eq("is_deleted", false),
    supabase.from("quiz_results").select("id,data").eq("user_id", userId).eq("is_deleted", false),
  ]);
  if ([cache, profile, courses, notes, flashcards, quizzes].some((result) => result.error)) return null;

  const state = cache.data?.state as { data?: AccountScopedStorageSnapshot; updatedAt?: number } | null;
  const data: AccountScopedStorageSnapshot = { ...(state?.data ?? {}) };
  if (profile.data) {
    data[KEYS.MAJOR] = profile.data.major;
    data[KEYS.STUDY_MODE] = profile.data.study_mode;
    data[KEYS.STUDY_MODE_DISMISSED] = profile.data.study_mode_prompt_dismissed;
    data[KEYS.COURSES] = (courses.data ?? []).map((course) => course.data);
    data[KEYS.NOTES_V2] = Object.fromEntries((notes.data ?? []).map((note) => [note.course_code, note.data]));
    const cardStore = data[KEYS.FLASHCARDS] as Record<string, unknown> | undefined;
    data[KEYS.FLASHCARDS] = {
      version: 2,
      activeSetByCourse: cardStore?.activeSetByCourse ?? {},
      setIdsByCourse: cardStore?.setIdsByCourse ?? groupIds((flashcards.data ?? []) as Array<{ id: string; data: unknown }>),
      setsById: Object.fromEntries((flashcards.data ?? []).map((card) => [card.id, card.data])),
    };
    const quizStore = data[KEYS.QUIZ_RESULTS] as Record<string, unknown> | undefined;
    data[KEYS.QUIZ_RESULTS] = {
      version: 1,
      attemptIdsByCourse: quizStore?.attemptIdsByCourse ?? groupIds((quizzes.data ?? []) as Array<{ id: string; data: unknown }>),
      attemptsById: Object.fromEntries((quizzes.data ?? []).map((quiz) => [quiz.id, quiz.data])),
    };
  }
  const updatedAt = state?.updatedAt ?? (Date.parse(cache.data?.updated_at ?? "") || 0);
  const account = createAccountProfileFromAuthUser(auth.user);
  const override = data[KEYS.PROFILE] as { name?: unknown; avatarUrl?: unknown } | undefined;
  if (typeof override?.name === "string" && override.name.trim()) {
    account.name = override.name.trim();
    account.initials = getAccountInitials(account.name, account.email);
  }
  if (isCompactAvatarUrl(override?.avatarUrl)) account.avatarUrl = override.avatarUrl;
  return {
    account,
    data,
    updatedAt,
    hasStudyData: Boolean(profile.data || state?.data),
  };
}
