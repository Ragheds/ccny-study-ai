import { studentAccess } from "@/lib/server/access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateText, studyError, StudyError } from "@/lib/server/generate";
import { PackContent, PACK_PROMPT } from "@/lib/packs";
export async function GET() {
  try {
    const access = await studentAccess();
    if (!access) throw new StudyError("Sign in first.", 401);
    const { data, error } = await access.db
      .from("study_packs")
      .select("id,user_id,course_code,title,content,updated_at")
      .eq("status", "ready")
      .eq("is_deleted", false);
    if (error) throw error;
    return Response.json(
      { packs: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return studyError(error);
  }
}
export async function POST(request: Request) {
  let slot: string | null = null;
  try {
    const access = await studentAccess();
    if (!access) throw new StudyError("Sign in first.", 401);
    const { courseCode } = await request.json();
    const { data: course } = await access.db
      .from("user_courses")
      .select("data")
      .eq("course_code", courseCode)
      .eq("is_deleted", false)
      .maybeSingle();
    if (!course) throw new StudyError("Select one of your saved courses.", 403);
    const { data: existing } = await access.db
      .from("study_packs")
      .select("*")
      .eq("course_code", courseCode)
      .eq("status", "ready")
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return Response.json({ pack: existing });
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("reserve_study_pack", {
      p_user: access.user.id,
      p_course: courseCode,
      p_title: course.data.name,
      p_cap: access.limits.offlinePacks,
    });
    if (error) throw error;
    slot = data;
    if (!slot)
      throw new StudyError(
        "Your plan's offline course allowance is full. Remove a course pack or check your plan.",
        403,
      );
    const generated = await generateText(
      "pack",
      PACK_PROMPT,
      `Course: ${courseCode} ${course.data.name}`,
      4096,
    );
    const content = PackContent.parse(
      JSON.parse(generated.replace(/^```(?:json)?\s*|\s*```$/g, "")),
    );
    if (content.cards.length !== 20 || content.quiz.length !== 10)
      throw new StudyError(
        "Pack was incomplete. Try again; the failed pack is not saved.",
      );
    const { data: notes } = await access.db
      .from("notes")
      .select("data")
      .eq("course_code", courseCode)
      .eq("is_deleted", false)
      .maybeSingle();
    if (typeof notes?.data?.text === "string") content.notes = notes.data.text;
    const { data: lessons } = await access.db
      .from("user_lessons")
      .select("content")
      .limit(30);
    content.lessons = (lessons ?? [])
      .map((item) => item.content)
      .filter((item) => item?.courseCode === courseCode);
    const { data: pack, error: saveError } = await admin
      .from("study_packs")
      .update({
        content,
        status: "ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", slot)
      .select("*")
      .single();
    if (saveError) throw saveError;
    return Response.json({ pack });
  } catch (error) {
    if (slot)
      await createSupabaseAdminClient()
        .from("study_packs")
        .update({ status: "failed" })
        .eq("id", slot);
    return studyError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const access = await studentAccess();
    if (!access) throw new StudyError("Sign in first.", 401);
    const { id } = await request.json();
    const { error } = await access.db
      .from("study_packs")
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return Response.json({ deleted: true });
  } catch (error) {
    return studyError(error);
  }
}
