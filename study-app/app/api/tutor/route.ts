import { NextRequest, NextResponse } from "next/server";

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

const ROUTERS = {
  code: [
    "qwen/qwen3-coder:free",
    "openrouter/free",
  ],
  reasoning: [
    "openrouter/free",
    "qwen/qwen3-coder:free",
  ],
  fast: [
    "openrouter/free",
    "qwen/qwen3-coder:free",
  ],
};

function detectRoute(message: string, action: string): keyof typeof ROUTERS {
  const lower = message.toLowerCase();

  const codeKeywords = [
    "code",
    "error",
    "debug",
    "bug",
    "syntax",
    "function",
    "compile",
    "runtime",
    "exception",
    "stack trace",
    "not working",
    "fix this",
    "segfault",
    "python",
    "java",
    "c++",
    "javascript",
    "typescript",
    "algorithm",
  ];

  if (codeKeywords.some((keyword) => lower.includes(keyword))) return "code";

  const reasoningKeywords = [
    "math",
    "calculus",
    "proof",
    "equation",
    "theorem",
    "derive",
    "integral",
    "derivative",
    "statistics",
    "probability",
    "logic",
    "physics",
    "chemistry",
    "formula",
    "solve",
    "calculate",
  ];

  if (reasoningKeywords.some((keyword) => lower.includes(keyword))) return "reasoning";

  if (["quiz", "flashcards", "studyguide", "summary"].includes(action)) return "reasoning";

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
    .filter((message) => message.content?.trim())
    .slice(-8)
    .map((message) => ({
      role: message.role === "ai" || message.role === "assistant"
        ? "assistant" as const
        : "user" as const,
      content: message.content ?? "",
    }));
}

async function tryModels(
  models: string[],
  body: object,
  apiKey: string
): Promise<{ text: string; model: string }> {
  let lastError = "";

  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://ccny-study-ai.vercel.app",
          "X-Title": "CCNY Study AI",
        },
        body: JSON.stringify({ ...body, model }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        lastError = data.error?.message ?? "Unknown error";
        console.warn(`Model ${model} failed: ${lastError} — trying next...`);
        continue;
      }

      const text = data?.choices?.[0]?.message?.content;

      if (!text) {
        console.warn(`Model ${model} returned empty — trying next...`);
        continue;
      }

      console.log(`Used model: ${model}`);
      return { text, model };
    } catch (err) {
      console.warn(`Model ${model} threw error — trying next...`, err);
      continue;
    }
  }

  throw new Error(`All models failed. Last error: ${lastError}`);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TutorRequestBody;

    const message = body.message ?? "";
    const action = body.action ?? "general";
    const { major, majorCode, school, course, courseCode, courseSection } =
      normalizeTutorContext(body);

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "Missing API key" }, { status: 500 });
    }

    const systemPrompt = `You are an academic study assistant for CCNY (The City College of New York) students.

Student context:
- Major: ${major} (${majorCode})
- School: ${school}
- Current course: ${course} (${courseCode})
- Course school/section: ${courseSection}

Your job is to help this student with their coursework. Keep answers:
- Specific to their course level and major at CCNY
- Clear, structured, and easy to understand
- Focused on what a CCNY student would need to know
- Aware of the current course, its school/section, and the prior chat messages when provided
- Concise but complete

${action === "quiz" ? `Generate a 5-question multiple choice quiz about ${course}.
Format each question clearly with 4 options (A, B, C, D) and mark the correct answer at the end.
Make questions appropriate for a ${major} student at CCNY.` : ""}

${action === "flashcards" ? `Generate exactly 20 flashcards for ${course} (${courseCode}).
If the student's message includes uploaded course material, use that material as the primary source.
If the student's message includes a unit or focus topic, treat it as a required scope for the set and make every card support that focus.
Use this exact format for every card:
FRONT: [concept, term, or recall prompt]
BACK: [clear definition, answer, or explanation]
---
Do not include extra headings, numbering outside the FRONT/BACK format, or fewer than 20 cards.
Make every card specific to what a ${major} student at CCNY would need to study.` : ""}

${action === "studyguide" ? `Generate a comprehensive study guide for ${course} (${courseCode}).
Include:
1. Key Concepts & Definitions
2. Important Theories or Methods
3. Common Examples
4. Things to Remember for Exams
Make it specific for a ${major} student at ${school}.` : ""}

${action === "summary" ? `Summarize the student's notes for ${course} (${courseCode}).
Structure your response as:
1. Key Concepts (short bullet list)
2. Important Definitions, Formulas, or Facts (short bullet list)
3. A short plain-English summary paragraph
Only use information that is actually present in the notes provided below. Do not invent or assume details that aren't there.` : ""}`.trim();

    const routeKey = detectRoute(message, action);
    const models = ROUTERS[routeKey];
    const historyMessages = normalizeHistory(body.history);

    console.log(`Route: ${routeKey} | Trying: ${models.join(", ")}`);

    const requestBody = {
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: message },
      ],
      max_tokens: action === "studyguide" || action === "flashcards" ? 2048 : 1024,
      temperature: action === "quiz" || action === "flashcards" ? 0.3 : 0.7,
    };

    const { text, model } = await tryModels(models, requestBody, OPENROUTER_API_KEY);

    return NextResponse.json({ response: text, model, route: routeKey });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Tutor API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}