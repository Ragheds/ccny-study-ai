import { tryModelsStreaming } from "@/lib/server/tutorStream";
import { boundedJSON, BodyError } from "@/lib/server/body";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { studentAccess } from "@/lib/server/access";
import { modelsFor, estimateCost } from "@/lib/models";
import { isStudyMode, studyModeInstruction, type StudyMode } from "@/lib/studyMode";

type TutorHistoryMessage = {
  role?: "user" | "ai" | "assistant";
  content?: string;
};

type TutorContext = {
  major?: string;
  majorCode?: string;
  school?: string;
  course?: string;
  courseCode?: string;
  courseSection?: string;
};

type TutorRequestBody = {
  message?: string;
  action?: string;
  history?: TutorHistoryMessage[];
  context?: TutorContext;
  major?: string;
  majorCode?: string;
  school?: string;
  course?: string;
  courseCode?: string;
  courseSection?: string;
  studyMode?: StudyMode;
};

function normalizeTutorContext(body: TutorRequestBody): Required<TutorContext> {
  const context = body.context ?? {};
  return {
    major: context.major ?? body.major ?? "CCNY student",
    majorCode: context.majorCode ?? body.majorCode ?? "Undeclared",
    school: context.school ?? body.school ?? "The City College of New York",
    course: context.course ?? body.course ?? "Selected course",
    courseCode: context.courseCode ?? body.courseCode ?? "Course",
    courseSection: context.courseSection ?? body.courseSection ?? "Selected school",
  };
}

function normalizeHistory(history: TutorHistoryMessage[] | undefined) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m.content?.trim())
    .slice(-8)
    .map((m) => ({
      role:
        m.role === "ai" || m.role === "assistant"
          ? ("assistant" as const)
          : ("user" as const),
      content: (m.content ?? "").slice(0, 2000),
    }));
}

function buildSystemPrompt(
  action: string,
  major: string,
  majorCode: string,
  school: string,
  course: string,
  courseCode: string,
  courseSection: string,
  studyMode: StudyMode | null
): string {
  const base = `You are an academic study assistant for CCNY (The City College of New York) students.

Student context:
- Major: ${major} (${majorCode})
- School: ${school}
- Current course: ${course} (${courseCode})
- Course school/section: ${courseSection}

Your job is to help this student with their coursework. Keep answers:
- Specific to their course level and major at CCNY
- Clear, structured, and easy to understand
- Focused on what a CCNY student would need to know
- Concise but complete`;

  if (action === "quiz")
    return `${base}

Generate a 5-question multiple choice quiz about ${course}.
Format EXACTLY like this for every question:

1. [Question text]
A. [Option A]
B. [Option B]
C. [Option C]
D. [Option D]

Answer: [Letter]

Make questions appropriate for a ${major} student at CCNY.`;

  if (action === "flashcards")
    return `${base}

Generate exactly 20 flashcards for ${course} (${courseCode}).
If the student's message includes uploaded course material, use that material as the primary source.
Use this exact format for every card:
FRONT: [concept, term, or recall prompt]
BACK: [clear definition, answer, or explanation]
---
Do not include extra headings or fewer than 20 cards.`;

  if (action === "studyguide")
    return `${base}

Generate a comprehensive study guide for ${course} (${courseCode}).
Include:
1. Key Concepts & Definitions
2. Important Theories or Methods
3. Common Examples
4. Things to Remember for Exams`;

  if (action === "summary")
    return `${base}

Summarize the student's notes for ${course} (${courseCode}).
Structure your response as:
1. Key Concepts (short bullet list)
2. Important Definitions, Formulas, or Facts (short bullet list)
3. A short plain-English summary paragraph
Only use information actually present in the notes. Do not invent details.`;

  if (action === "explain_answer")
    return `${base}

The student just answered a practice quiz question incorrectly. Explain clearly why the correct answer is right, in a warm, conversational, SPOKEN-style tone — like a tutor talking out loud, not a written document.

Rules:
- 2-4 short sentences, plain conversational prose only.
- No markdown, no bullet points, no headers, no asterisks, no numbered lists — this will be read aloud by text-to-speech, so it must sound natural spoken aloud.
- Reference the specific question and the correct answer directly. Briefly note why their answer was wrong if it's a common misconception, without being harsh about it.
- Keep it encouraging.

After the explanation, on its own new line, output exactly this format (used to build a real search link, not shown to the student as text):
YOUTUBE_SEARCH: <a short, specific YouTube search query, 5-8 words, that would surface a good video explaining this exact concept>`;

  return studyMode ? `${base}\n\nDefault study mode: ${studyMode}. ${studyModeInstruction(studyMode)} The student may request a different teaching style at any time.` : base;
}

// ── streaming fetch from OpenRouter ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return NextResponse.json({ error: "Tutor unavailable" }, { status: 503 });
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      return NextResponse.json({ error: "Sign in to use the tutor." }, { status: 401 });
    }

    let body: TutorRequestBody;
    try {
      body = (await boundedJSON(req, 60000)) as TutorRequestBody;
    } catch (error) {
      if (error instanceof BodyError) return NextResponse.json({ error: error.message }, { status: 413 });
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json({ error: "A message is required" }, { status: 400 });
    }
    if (message.length > 8000) {
      return NextResponse.json({ error: "Message is too long." }, { status: 413 });
    }

    const action = body.action ?? "general";
    if (!["general", "quiz", "flashcards", "studyguide", "summary", "explain_answer"].includes(action)) return Response.json({ error: "Use the matching study workspace." }, { status: 400 });
    const { major, majorCode, school, course, courseCode, courseSection } =
      normalizeTutorContext(body);

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "The tutor is not configured yet. Please try later." }, { status: 500 });
    }

    const { data: profile } = await supabase.from("profiles")
      .select("study_mode").eq("user_id", auth.user.id).maybeSingle();
    const studyMode = isStudyMode(profile?.study_mode)
      ? profile.study_mode
      : isStudyMode(body.studyMode) ? body.studyMode : null;
    const systemPrompt = buildSystemPrompt(
      action, major, majorCode, school, course, courseCode, courseSection, studyMode
    );

    const access = await studentAccess();
    if (!access) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const models = modelsFor(action);
    const historyMessages = normalizeHistory(body.history);

    const requestBody = {
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: message },
      ],
      max_tokens: action === "studyguide" || action === "flashcards" ? 2048 : 1024,
      temperature: action === "quiz" || action === "flashcards" ? 0.3 : 0.7,
    };

    // The database function holds a per-user transaction lock so parallel requests
    // cannot both pass the same quota check. Missing migration fails closed.
    let admin;
    try {
      admin = createSupabaseAdminClient();
    } catch {
      return NextResponse.json({ error: "Tutor unavailable" }, { status: 503 });
    }
    const reservedTokens = Math.min(8192, Math.ceil(JSON.stringify(requestBody).length / 4) + requestBody.max_tokens);
    const { data: usageId, error: quotaError } = await admin.rpc("reserve_plan_usage", {
      p_user: auth.user.id,
      p_feature: action,
      p_model: models[0],
      p_tokens: reservedTokens,
      p_daily_tokens: access.limits.reservedTokensPerDay,
      p_daily_requests: access.limits.requestsPerDay,
      p_minute: access.limits.requestsPerMinute,
    });
    if (quotaError) {
      console.error("Tutor usage reservation failed:", quotaError.message);
      return NextResponse.json({ error: "Tutor unavailable. Please try again later." }, { status: 503 });
    }
    if (!usageId) {
      return NextResponse.json({ error: "Your study allowance is reached. If you just sent several requests, wait a minute; otherwise try tomorrow (UTC reset) or check your plan." }, { status: 429 });
    }

    let finished = false;
    const finishUsage = async (status: "completed" | "failed", model: string, inputTokens?: number, outputTokens?: number) => {
      if (finished) return;
      finished = true;
      const { error } = await admin.from("ai_usage").update({
        status,
        model,
        input_tokens: inputTokens ?? Math.ceil(JSON.stringify(requestBody).length / 4),
        output_tokens: outputTokens ?? null,
        estimated_cost_usd: estimateCost(model, inputTokens ?? reservedTokens, outputTokens ?? requestBody.max_tokens),
      }).eq("id", usageId);
      if (error) console.error("Tutor usage update failed:", error.message);
    };

    const streamResponse = await tryModelsStreaming(models, requestBody, OPENROUTER_API_KEY, finishUsage);
    if (streamResponse) return streamResponse;
    await finishUsage("failed", models[models.length - 1]);

    return NextResponse.json(
      { error: "All models failed. Please try again." },
      { status: 503 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Tutor API error:", message);
    return NextResponse.json({ error: "Tutor unavailable. Please try again later." }, { status: 503 });
  }
}
