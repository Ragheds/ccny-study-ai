import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body?.userId as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

    let deletedAuth = false;

    // If a service role key exists, use the admin API to delete the auth user and associated rows
    if (supabaseUrl && serviceRole) {
      const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

      // delete auth user
      try {
        await admin.auth.admin.deleteUser(userId);
        deletedAuth = true;
      } catch (e) {
        console.warn("Could not delete auth user via admin API:", e);
      }

      // remove stored app state (if any)
      try {
        await admin.from("user_app_state").delete().eq("user_id", userId);
      } catch (e) {
        console.warn("Could not delete user_app_state:", e);
      }

      // remove avatar from storage
      try {
        await admin.storage.from("avatars").remove([`${userId}/profile.jpg`]);
      } catch (e) {
        // ignore
      }

      return NextResponse.json({ ok: true, deletedAuth });
    }

    // Fallback: try with configured server client (likely anon key) to remove app state and storage entries
    const serverClient = await createSupabaseServerClient();
    if (!serverClient) {
      return NextResponse.json({ error: "Supabase not configured on server" }, { status: 500 });
    }

    try {
      await serverClient.from("user_app_state").delete().eq("user_id", userId);
      try {
        await serverClient.storage.from("avatars").remove([`${userId}/profile.jpg`]);
      } catch (e) {
        // ignore
      }
    } catch (e) {
      console.warn("Fallback deletion error:", e);
    }

    // We cannot delete the auth user without service role key; return partial success
    return NextResponse.json({ ok: true, deletedAuth: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("/api/account/delete error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
