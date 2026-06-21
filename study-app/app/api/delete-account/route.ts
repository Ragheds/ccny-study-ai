import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Server-side account deletion route.
 * - Authenticates the request with the user's session (server client)
 * - Uses the service role client to delete DB rows, storage objects, and finally the auth user
 *
 * NOTE: Ensure SUPABASE_SERVICE_ROLE_KEY is set in your deployment environment.
 */

// Configure the tables and buckets you want to attempt to clean up.
const TABLES_TO_CLEAN = [
  // user-scoped tables (adjust to your schema)
  "user_app_state",
  "notes",
  "quizzes",
  "flashcards",
  "chats",
  "chat_messages",
  "user_files",
  "user_uploads",
  "user_sessions",
  "profiles",
];

const STORAGE_BUCKETS = ["avatars", "uploads", "user-files"];

async function tryDeleteTableRows(admin: ReturnType<typeof createSupabaseAdminClient>, table: string, userId: string) {
  // Try common column names for user ownership
  const candidateCols = ["user_id", "owner_id", "created_by", "owner"];

  for (const col of candidateCols) {
    try {
      const { error } = await admin.from(table).delete().eq(col, userId);
      if (!error) {
        // deleted (or nothing to delete) for this column
        return { table, column: col, ok: true };
      }

      // If the error mentions relation not found, table likely doesn't exist — surface so outer code can decide
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("does not exist") || msg.includes("relation \"")) {
        return { table, column: col, ok: false, skip: true, message: error.message };
      }

      // other errors: try next column name
      // keep last error to possibly surface below
    } catch (e: any) {
      const msg = String(e?.message || e).toLowerCase();
      if (msg.includes("does not exist") || msg.includes("relation \"")) {
        return { table, column: col, ok: false, skip: true, message: String(e) };
      }
      // continue trying other column names
    }
  }

  // if none matched, return not-ok but not fatal
  return { table, column: null, ok: false, message: "No matching ownership column found" };
}

async function deleteUserStorage(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  const removed: Array<{ bucket: string; path: string }> = [];

  for (const bucket of STORAGE_BUCKETS) {
    try {
      // list objects under the userId prefix
      const { data: listData, error: listError } = await admin.storage.from(bucket).list(userId, {
        limit: 1000,
        offset: 0,
        // recursive not supported in all SDKs; listing a folder should return items inside
      } as any);

      if (listError) {
        const msg = (listError.message || "").toLowerCase();
        if (msg.includes("not found") || msg.includes("does not exist")) {
          // bucket not found — skip
          continue;
        }
        // Otherwise surface
        throw listError;
      }

      if (!listData || listData.length === 0) {
        // Also attempt to remove a canonical profile path
        const profilePath = `${userId}/profile.jpg`;
        await admin.storage.from(bucket).remove([profilePath]).catch(() => {});
        continue;
      }

      // Build paths relative to bucket
      const paths: string[] = listData.map((item: any) => {
        // `name` is common; some SDKs return {name, id, updated_at}
        return item.name ? `${userId}/${item.name}` : item.path ?? item.name ?? "";
      }).filter(Boolean);

      if (paths.length > 0) {
        const { error: rmErr } = await admin.storage.from(bucket).remove(paths);
        if (rmErr) {
          // if remove fails, surface error
          throw rmErr;
        }
        paths.forEach((p) => removed.push({ bucket, path: p }));
      }
    } catch (e: any) {
      // non-fatal: continue with other buckets but collect the error
      console.warn("Storage cleanup error for bucket", bucket, e?.message || e);
    }
  }

  return removed;
}

export async function POST(request: NextRequest) {
  try {
    const serverSupabase = await createSupabaseServerClient();
    if (!serverSupabase) {
      return NextResponse.json({ error: "Supabase server client not configured" }, { status: 500 });
    }

    const { data: sessionData, error: getUserError } = await serverSupabase.auth.getUser();
    if (getUserError || !sessionData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = sessionData.user.id;
    let admin;
    try {
      admin = createSupabaseAdminClient();
    } catch (e: any) {
      console.error("Admin client not available:", e?.message || e);
      return NextResponse.json({ error: "Supabase service role not configured on server" }, { status: 500 });
    }
    const tableResults: any[] = [];

    // Delete rows from tables listed — best-effort; skip missing tables
    for (const table of TABLES_TO_CLEAN) {
      try {
        const res = await tryDeleteTableRows(admin, table, userId);
        tableResults.push(res);
      } catch (e: any) {
        tableResults.push({ table, ok: false, message: String(e?.message || e) });
      }
    }

    // Delete storage
    const removedFiles = await deleteUserStorage(admin, userId);

    // Finally delete the auth user via SDK
    const deleteResp = await admin.auth.admin.deleteUser(userId as string).catch((err: any) => ({ error: err }));

    // If SDK returned an error, attempt REST fallback using service role key
    if ((deleteResp as any)?.error) {
      console.warn("Admin SDK deleteUser failed, attempting REST fallback:", (deleteResp as any).error);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

      if (supabaseUrl && serviceRole) {
        try {
          const restRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
            method: "DELETE",
            headers: {
              apikey: serviceRole,
              Authorization: `Bearer ${serviceRole}`,
            },
          });
          const restBody = await restRes.text();
          if (!restRes.ok) {
            console.error("REST fallback delete failed:", restRes.status, restBody);
            return NextResponse.json({ error: "Failed to delete auth user (admin sdk + REST fallback)", deleteResp, restStatus: restRes.status, restBody, tables: tableResults, removedFiles }, { status: 500 });
          }

          return NextResponse.json({ success: true, deletedVia: "rest", restStatus: restRes.status, tables: tableResults, removedFiles }, { status: 200 });
        } catch (e: any) {
          console.error("REST fallback error:", e?.message || e);
          return NextResponse.json({ error: "Failed to delete auth user (admin sdk + REST fallback)", deleteResp, restError: String(e), tables: tableResults, removedFiles }, { status: 500 });
        }
      }

      return NextResponse.json({ error: "Failed to delete auth user", deleteResp, tables: tableResults, removedFiles }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedVia: "sdk", deleteResp, tables: tableResults, removedFiles }, { status: 200 });
  } catch (err: any) {
    console.error("Account deletion error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
