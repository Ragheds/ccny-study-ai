import { z } from "zod";
import { studentAccess } from "@/lib/server/access";
import { studyError, StudyError } from "@/lib/server/generate";
const Edit = z.object({
  id: z.string().max(100),
  pack_id: z.string().uuid(),
  kind: z.enum(["notes", "quiz", "review"]),
  data: z.unknown(),
  updated_at: z.iso.datetime(),
});
export async function POST(request: Request) {
  try {
    const access = await studentAccess();
    if (!access) throw new StudyError("Sign in to sync.", 401);
    if (Number(request.headers.get("content-length")) > 50000)
      throw new StudyError("Edit too large.", 413);
    const raw = await request.text();
    if (raw.length > 50000) throw new StudyError("Edit too large.", 413);
    const edit = Edit.parse(JSON.parse(raw));
    const { data: pack } = await access.db
      .from("study_packs")
      .select("is_deleted")
      .eq("id", edit.pack_id)
      .maybeSingle();
    if (!pack || pack.is_deleted)
      throw new StudyError(
        "Pack was deleted. Pending edits were discarded.",
        410,
      );
    const { error } = await access.db.rpc("sync_study_edit", {
      p_id: edit.id,
      p_pack: edit.pack_id,
      p_kind: edit.kind,
      p_data: edit.data,
      p_time: edit.updated_at,
    });
    if (error) throw error;
    return Response.json({ saved: true });
  } catch (error) {
    return studyError(error);
  }
}
