import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { TUTOR_LIMITS } from "@/lib/tutorLimits";

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
};

// ── model routing ────────────────────────────────────────────────────────────
// Each route lists free models in preference order. One student request gets one usage row.
const ROUTERS = {
  // Code questions: Qwen Coder first (best free coding model)
  code: [
    "qwen/qwen3-coder:free",
    "openrouter/free",
  ],
  // Reasoning / math / proofs: DeepSeek R1 first
  reasoning: [
    "deepseek/deepseek-r1:free",
    "qwen/qwen3-coder:free",
    "openrouter/free",
  ],
  // Fast general queries
  fast: [
    "openrouter/free",
    "qwen/qwen3-coder:free",
  ],
};

function detectRoute(message: string, action: string): keyof typeof ROUTERS {
  const lower = message.toLowerCase();

  const codeKeywords = [
    "code", "error", "debug", "bug", "syntax", "function", "compile",
    "runtime", "exception", "stack trace", "not working", "fix this",
    "segfault", "python", "java", "c++", "javascript", "typescript", "algorithm",
  ];
  if (codeKeywords.some((kw) => lower.includes(kw))) return "code";

  const reasoningKeywords = [
    "math", "calculus", "proof", "equation", "theorem", "derive", "integral",
    "derivative", "statistics", "probability", "logic", "physics", "chemistry",
    "formula", "solve", "calculate",
  ];
  if (reasoningKeywords.some((kw) => lower.includes(kw))) return "reasoning";

  if (["quiz", "flashcards", "studyguide", "summary", "explain_answer"].includes(action)) return "reasoning";
  if (message.length > 300) return "reasoning";

  return "fast";
}

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
  courseSection: string
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

  return base;
}

// ── streaming fetch from OpenRouter ─────────────────────────────────────────
async function tryModelsStreaming(
  models: readonly string[],
  requestBody: object,
  apiKey: string,
  onFinish: (status: "completed" | "failed", model: string, inputTokens?: number, outputTokens?: number) => Promise<void>
): Promise<Response | null> {
  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://ccny-study-ai.vercel.app",
          "X-Title": "CCNY Study AI",
        },
        body: JSON.stringify({ ...requestBody, model, stream: true, stream_options: { include_usage: true } }),
      });

      if (!res.ok || !res.body) {
        console.warn(`Model ${model} returned ${res.status}`);
        if (res.status === 429 || res.status >= 500 || !res.body) continue;
        break;
      }

      // Forward OpenRouter SSE → plain-text chunks to the client
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let inputTokens: number | undefined;
      let outputTokens: number | undefined;
      let outputCharacters = 0;

      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const frames = buffer.split("\n\n");
              buffer = frames.pop() ?? "";

              for (const frame of frames) {
                const lines = frame
                  .split("\n")
                  .map((line) => line.replace(/^\s+|\s+$/g, ""));

                for (const line of lines) {
                  if (!line.startsWith("data:")) continue;
                  const data = line.slice(5).trim();
                  if (!data || data === "[DONE]") continue;

                  try {
                    const parsed = JSON.parse(data) as {
                      choices?: Array<{ delta?: { content?: string } }>;
                      error?: unknown;
                      usage?: { prompt_tokens?: number; completion_tokens?: number };
                    };
                    if (parsed.error) continue;
                    if (parsed.usage) {
                      inputTokens = parsed.usage.prompt_tokens;
                      outputTokens = parsed.usage.completion_tokens;
                    }
                    const text = parsed.choices?.[0]?.delta?.content;
                    if (text) {
                      outputCharacters += text.length;
                      controller.enqueue(new TextEncoder().encode(text));
                    }
                  } catch {
                    // malformed chunk — skip
                  }
                }
              }
            }

            if (buffer.trim()) {
              const lines = buffer
                .split("\n")
                .map((line) => line.replace(/^\s+|\s+$/g, ""));
              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const data = line.slice(5).trim();
                if (!data || data === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data) as {
                    choices?: Array<{ delta?: { content?: string } }>;
                    error?: unknown;
                    usage?: { prompt_tokens?: number; completion_tokens?: number };
                  };
                  if (parsed.error) continue;
                  if (parsed.usage) {
                    inputTokens = parsed.usage.prompt_tokens;
                    outputTokens = parsed.usage.completion_tokens;
                  }
                  const text = parsed.choices?.[0]?.delta?.content;
                  if (text) {
                    outputCharacters += text.length;
                    controller.enqueue(new TextEncoder().encode(text));
                  }
                } catch {
                  // malformed chunk — skip
                }
              }
            }
          } catch (error) {
            console.error("Tutor stream failed:", error);
            await onFinish("failed", model, inputTokens, outputTokens ?? Math.ceil(outputCharacters / 4));
          } finally {
            await onFinish(outputCharacters > 0 ? "completed" : "failed", model, inputTokens, outputTokens ?? Math.ceil(outputCharacters / 4));
            controller.close();
          }
        },
        cancel() {
          reader.cancel().catch(() => {});
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Model": model,
          "Cache-Control": "no-cache",
        },
      });
    } catch (err) {
      console.warn(`Model ${model} threw:`, err);
      // A connection error before the stream starts can be recovered by the next model.
    }
  }
  return null;
}

// ── route handler ────────────────────────────────────────────────────────────
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
      body = (await req.json()) as TutorRequestBody;
    } catch {
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
    const { major, majorCode, school, course, courseCode, courseSection } =
      normalizeTutorContext(body);

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "Missing API key" }, { status: 500 });
    }

    const systemPrompt = buildSystemPrompt(
      action, major, majorCode, school, course, courseCode, courseSection
    );

    const routeKey = detectRoute(message, action);
    const models = ROUTERS[routeKey];
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
    const { data: usageId, error: quotaError } = await admin.rpc("reserve_tutor_usage", {
      p_user_id: auth.user.id,
      p_feature: action,
      p_model: models[0],
      p_reserved_tokens: reservedTokens,
      p_daily_token_cap: TUTOR_LIMITS.reservedTokensPerDay,
      p_daily_request_cap: TUTOR_LIMITS.requestsPerDay,
      p_minute_request_cap: TUTOR_LIMITS.requestsPerMinute,
    });
    if (quotaError) {
      console.error("Tutor usage reservation failed:", quotaError.message);
      return NextResponse.json({ error: "Tutor unavailable. Please try again later." }, { status: 503 });
    }
    if (!usageId) {
      return NextResponse.json({ error: "Daily tutor limit reached. Try again tomorrow." }, { status: 429 });
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
