import { studentAccess } from "@/lib/server/access";
import { studyError, StudyError } from "@/lib/server/generate";
export async function POST(request: Request) {
  try {
    const access = await studentAccess();
    if (!access) throw new StudyError("Sign in first.", 401);
    const { text } = await request.json();
    if (
      typeof text !== "string" ||
      text.trim().length < 5 ||
      text.length > 1000
    )
      throw new StudyError("Write 5–1000 characters.", 400);
    const { error } = await access.db.rpc("submit_study_feedback", {
      p_text: text.trim(),
    });
    if (error)
      throw new StudyError(
        "Feedback allowance reached or service unavailable. Try tomorrow.",
        429,
      );
    return Response.json({ message: "Thanks. Your feedback was saved." });
  } catch (error) {
    return studyError(error);
  }
}
