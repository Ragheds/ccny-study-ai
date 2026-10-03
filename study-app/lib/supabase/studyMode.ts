"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { StudyMode } from "@/lib/studyMode";

export async function saveStudyPreference(mode: StudyMode | null, dismissed: boolean): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return;
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error("Couldn't check your account. Please try again.");
  if (!auth.user) return;
  const { error } = await supabase.from("profiles").upsert({
    user_id: auth.user.id,
    study_mode: mode,
    study_mode_prompt_dismissed: dismissed,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw new Error("Couldn't save your study mode. Please try again.");
}
