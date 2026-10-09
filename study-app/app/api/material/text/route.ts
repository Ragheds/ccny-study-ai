import { studentAccess } from "@/lib/server/access";
import { boundedBody } from "@/lib/server/body";
import { extractPDFText } from "@/lib/server/pdfText";
import { StudyError, studyError } from "@/lib/server/generate";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const access = await studentAccess();
    if (!access) throw new StudyError("Sign in to read class material.", 401);
    const bytes = await boundedBody(request, 5300000);
    const form = await new Response(bytes as BodyInit, {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new StudyError("Choose a PDF.", 400);
    const text = await extractPDFText(file);
    if (text.length > access.limits.materialChars)
      throw new StudyError("Paste a shorter section of this material.", 413);
    return Response.json(
      { text },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return studyError(error);
  }
}
