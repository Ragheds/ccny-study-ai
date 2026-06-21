import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  // Do not throw on import time in some deployment environments; export a factory that throws when used.
}

export function createSupabaseAdminClient() {
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server environment."
    );
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}
