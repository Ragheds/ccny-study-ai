"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function signOutSupabaseUser(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Supabase sign-out error:", error.message);
  }
}
