import { createHash } from "node:crypto";
import { studentAccess } from "@/lib/server/access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
export async function POST(request: Request) {
  try {
    const access = await studentAccess();
    if (!access) return Response.json({ error: "Sign in first." }, { status: 401 });
    const { code } = await request.json();
    if (typeof code !== "string" || code.trim().length < 8 || code.length > 100) return Response.json({ error: "Check the invite code." }, { status: 400 });
    const hash = createHash("sha256").update(code.trim()).digest("hex");
    const { data, error } = await createSupabaseAdminClient().rpc("redeem_study_invite", { p_user: access.user.id, p_hash: hash });
    if (error) throw error;
    return data ? Response.json({ message: "Beta Pro unlocked. Refresh to use it." }) : Response.json({ error: "Invite expired, used, or unavailable." }, { status: 400 });
  } catch { return Response.json({ error: "Invite service unavailable." }, { status: 503 }); }
}
