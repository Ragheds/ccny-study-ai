import { NextRequest, NextResponse } from "next/server";

// ─── Smart Model Router ────────────────────────────────────────────────────────

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
    "code", "error", "debug", "bug", "syntax", "function",
    "compile", "runtime", "exception", "stack trace", "not working",
    "fix this", "segfault", "python", "java", "c++", "javascript",
    "typescript", "algorithm",
  ];
  if (codeKeywords.some((k) => lower.includes(k))) return "code";

  const reasoningKeywords = [
    "math", "calculus", "proof", "equation", "theorem", "derive",
    "integral", "derivative", "statistics", "probability", "logic",
    "physics", "chemistry", "formula", "solve", "calculate",
  ];
  if (reasoningKeywords.some((k) => lower.includes(k))) return "reasoning";

  if (["quiz", "flashcards", "studyguide"].includes(action)) return "reasoning";

  if (message.length > 300) return "reasoning";

  return "fast";
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

      console.log(`✓ Used model: ${model}`);
      return { text, model };

    } catch (err) {
      console.warn(`Model ${model} threw error — trying next...`, err);
      continue;
    }
  }

  throw new Error(`All models failed. Last error: ${lastError}`);
}

// ─── API Route ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const {
      message,
      major,
      majorCode,
      school,
      course,
      courseCode,
      action,
    } = await req.json();

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "Missing API key" }, { status: 500 });
    }

    const systemPrompt = `You are an academic study assistant for CCNY (The City College of New York) students.

Student context:
- Major: ${major} (${majorCode})
- School: ${school}
- Current course: ${course} (${courseCode})

Your job is to help this student with their coursework. Keep answers:
- Specific to their course level and major at CCNY
- Clear, structured, and easy to understand
- Focused on what a CCNY student would need to know
- Concise but complete

${action === "quiz" ? `Generate a 5-question multiple choice quiz about ${course}.
Format each question clearly with 4 options (A, B, C, D) and mark the correct answer at the end.
Make questions appropriate for a ${major} student at CCNY.` : ""}

${action === "flashcards" ? `Generate 10 flashcards for ${course}.
Format each as:
FRONT: [concept or term]
BACK: [clear definition or explanation]
---
Make them specific to what a ${major} student at CCNY would need to study.` : ""}

${action === "studyguide" ? `Generate a comprehensive study guide for ${course} (${courseCode}).
Include:
1. Key Concepts & Definitions
2. Important Theories or Methods
3. Common Examples
4. Things to Remember for Exams
Make it specific for a ${major} student at ${school}.` : ""}`.trim();

    const routeKey = detectRoute(message, action);
    const models = ROUTERS[routeKey];

    console.log(`Route: ${routeKey} | Trying: ${models.join(", ")}`);

    const requestBody = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: action === "studyguide" ? 2048 : 1024,
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