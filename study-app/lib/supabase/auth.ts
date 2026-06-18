"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function signOutSupabaseUser(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  await supabase.auth.signOut();
}
