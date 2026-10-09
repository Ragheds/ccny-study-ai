import { studentAccess } from "@/lib/server/access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { StudyError, studyError } from "@/lib/server/generate";
import { lessonResponse } from "@/lib/server/lessonStream";
import { LessonSchema, LESSON_SCHEMA_VERSION } from "@/lib/whiteboard/schema";
import { ALGEBRA_CASES } from "@/lib/whiteboard/algebraCases";
export async function GET() {
  try {
    const access = await studentAccess();
    if (!access) throw new StudyError("Sign in first.", 401);
    const { data, error } = await access.db
      .from("user_lessons")
      .select("id,content,updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return Response.json(
      { lessons: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return studyError(error);
  }
}
export async function POST(request: Request) {
  try {
    const access = await studentAccess();
    if (!access) throw new StudyError("Sign in first.", 401);
    if (!access.limits.whiteboard)
      throw new StudyError(
        "Whiteboard needs Pro or a beta invite. Chat and downloaded packs remain available.",
        403,
      );
    const body = await request.json();
    if (
      typeof body.question !== "string" ||
      body.question.trim().length < 3 ||
      body.question.length > 1500
    )
      throw new StudyError("Ask a question in 3–1500 characters.", 400);
    const { data: course } = await access.db
      .from("user_courses")
      .select("data")
      .eq("course_code", body.courseCode)
      .eq("is_deleted", false)
      .maybeSingle();
    if (!course) throw new StudyError("Choose a saved course.", 403);
    const generic =
      Number.isInteger(body.topicId) && ALGEBRA_CASES[body.topicId];
    const question = generic ? generic.question : body.question.trim();
    const admin = createSupabaseAdminClient();
    const save = async (lesson: ReturnType<typeof LessonSchema.parse>) => {
      const { error } = await access.db
        .from("user_lessons")
        .insert({
          user_id: access.user.id,
          content: { courseCode: body.courseCode, lesson },
        });
      if (error) throw error;
      if (generic)
        await admin
          .from("lessons")
          .upsert(
            {
              course_code: body.courseCode,
              topic: question,
              study_mode: "visual",
              schema_version: LESSON_SCHEMA_VERSION,
              content: lesson,
            },
            { onConflict: "course_code,topic,study_mode,schema_version" },
          );
    };
    if (generic) {
      const { data: cached } = await access.db
        .from("lessons")
        .select("content")
        .eq("course_code", body.courseCode)
        .eq("topic", question)
        .eq("study_mode", "visual")
        .eq("schema_version", LESSON_SCHEMA_VERSION)
        .maybeSingle();
      const valid = LessonSchema.safeParse(cached?.content);
      if (valid.success) {
        await save(valid.data);
        return new Response(
          [
            { type: "title", title: valid.data.title },
            ...valid.data.steps.map((step) => ({ type: "step", step })),
            { type: "done" },
          ]
            .map((event) => JSON.stringify(event) + "\n")
            .join(""),
          {
            headers: {
              "Content-Type": "application/x-ndjson",
              "Cache-Control": "no-store",
            },
          },
        );
      }
    }
    return await lessonResponse(
      access,
      question,
      body.courseCode,
      save,
      request.signal,
    );
  } catch (error) {
    return studyError(error);
  }
}
