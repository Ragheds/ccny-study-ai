import { NextRequest, NextResponse } from "next/server";

function detectIntent(message: string): "code" | "general" {
  const codeKeywords = [
    "code", "error", "debug", "not working", "bug", "syntax",
    "function", "compile", "runtime", "exception", "stack trace",
    "why isn't", "what's wrong", "fix this", "segfault"
  ];
  return codeKeywords.some((k) => message.toLowerCase().includes(k)) ? "code" : "general";
}

export async function POST(req: NextRequest) {
  try {
    const { message, major, majorCode, school, course, courseCode, action } = await req.json();

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "Missing API key" }, { status: 500 });
    }

    const intent = detectIntent(message);

    const systemContext = `You are an academic study assistant for CCNY (The City College of New York) students.

Student context:
- Major: ${major} (${majorCode})
- School: ${school}
- Current course: ${course} (${courseCode})

Help this student with their coursework. Keep answers specific to their course level, clear, and concise.

${action === "quiz" ? "Generate a 5-question multiple choice quiz. Format each question with 4 options (A, B, C, D) and mark the correct answer at the end." : ""}
${action === "flashcards" ? "Generate 8 flashcards. Format each as: FRONT: [concept] | BACK: [definition]" : ""}
${action === "studyguide" ? "Generate a structured study guide with key concepts, definitions, and important points." : ""}`.trim();

    // Router — coding questions get Claude, everything else gets free Gemini
    const model = "openrouter/auto";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://ccny-study-ai.vercel.app",
        "X-Title": "CCNY Study AI",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemContext },
          { role: "user", content: message },
        ],
        max_tokens: 1024,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter error:", data);
      return NextResponse.json({ error: "AI API error" }, { status: 500 });
    }

    const text = data?.choices?.[0]?.message?.content ?? "No response generated.";

    return NextResponse.json({ response: text, model });

  } catch (err) {
    console.error("Tutor API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}