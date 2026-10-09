import { boundedBody } from "@/lib/server/body";
import { extractPDFText } from "@/lib/server/pdfText";
import { studentAccess } from "@/lib/server/access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateText, studyError, StudyError } from "@/lib/server/generate";
import {
  chunkMaterial,
  validateGrounding,
  groundedContent,
  MATERIAL_PROMPT,
} from "@/lib/material/grounding";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let slot: string | null = null;
  try {
    const access = await studentAccess();
    if (!access) throw new StudyError("Sign in first.", 401);
    if (Number(request.headers.get("content-length")) > 5300000)
      throw new StudyError("PDF limit is 5 MB.", 413);
    const bytes = await boundedBody(request, 5300000);
    const form = await new Response(bytes as BodyInit, {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
    const courseCode = form.get("courseCode");
    const file = form.get("file");
    let text = String(form.get("text") ?? "");
    let title = "Pasted class material";
    const { data: course } = await access.db
      .from("user_courses")
      .select("data")
      .eq("course_code", courseCode)
      .eq("is_deleted", false)
      .maybeSingle();
    if (!course) throw new StudyError("Choose a saved course.", 403);
    if (file instanceof File && file.size) {
      text = await extractPDFText(file);
      title = file.name.slice(0, 120);
    }
    if (text.trim().length < 80)
      throw new StudyError(
        "Add at least 80 characters of readable class material. Scanned PDFs need pasted text; OCR is not supported.",
        400,
      );
    if (text.length > access.limits.materialChars)
      throw new StudyError(
        `Your plan allows ${access.limits.materialChars.toLocaleString()} extracted characters per upload. Paste a shorter section.`,
        413,
      );
    const chunks = chunkMaterial(text);
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("reserve_study_pack", {
      p_user: access.user.id,
      p_course: courseCode,
      p_title: title,
      p_cap: access.limits.offlinePacks,
    });
    if (error) throw error;
    slot = data;
    if (!slot) throw new StudyError("Offline course allowance reached.", 403);
    const answer = await generateText(
      "upload",
      MATERIAL_PROMPT,
      JSON.stringify({ course: course.data.name, sources: chunks }),
      4096,
    );
    const grounded = validateGrounding(
      JSON.parse(answer.replace(/^```(?:json)?\s*|\s*```$/g, "")),
      chunks,
    );
    const content = groundedContent(grounded);
    const { data: pack, error: saveError } = await admin
      .from("study_packs")
      .update({
        status: "ready",
        content,
        source_chunks: chunks,
        source_kind: "upload",
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
    if (error instanceof Error && error.message.includes("source"))
      return Response.json({ error: error.message }, { status: 422 });
    return studyError(error);
  }
}
