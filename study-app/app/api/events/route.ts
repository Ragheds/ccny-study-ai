import { studentAccess } from "@/lib/server/access";
import { studyError, StudyError } from "@/lib/server/generate";
export async function POST(request: Request) {
  try {
    const access = await studentAccess();
    if (!access) throw new StudyError("Sign in first.", 401);
    const { event } = await request.json();
    if (!["session", "pack_download", "client_error"].includes(event))
      throw new StudyError("Unknown event.", 400);
    const { error } = await access.db.rpc("record_study_event", {
      p_event: event,
    });
    if (error) throw error;
    return Response.json({ saved: true });
  } catch (error) {
    return studyError(error);
  }
}
