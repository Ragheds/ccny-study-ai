import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Simple router — detects if request needs code help
function detectIntent(message: string): "code" | "general" {
  const codeKeywords = [
    "code", "error", "debug", "not working", "bug", "syntax",
    "function", "compile", "runtime", "exception", "stack trace",
    "why isn't", "what's wrong", "fix this", "segfault"
  ];
  const lower = message.toLowerCase();
  return codeKeywords.some((k) => lower.includes(k)) ? "code" : "general";
}

export async function POST(req: NextRequest) {
  try {
    const { message, major, majorCode, school, course, courseCode, action } = await req.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing Gemini API key" }, { status: 500 });
    }

    const intent = detectIntent(message);

    // Build system context from student's major + course
    const systemContext = `
You are an academic study assistant for CCNY (The City College of New York) students.

Student context:
- Major: ${major} (${majorCode})
- School: ${school}
- Current course: ${course} (${courseCode})

Your job is to help this student with their coursework. Keep answers:
- Specific to their course level and major
- Clear and easy to understand
- Focused on what a CCNY student would need to know
- Concise but complete

${action === "quiz" ? "Generate a 5-question multiple choice quiz about this course topic. Format each question clearly with 4 options (A, B, C, D) and mark the correct answer at the end." : ""}
${action === "flashcards" ? "Generate 8 flashcards about this course topic. Format each as: FRONT: [concept] | BACK: [definition/explanation]" : ""}
${action === "studyguide" ? "Generate a structured study guide for this course topic with key concepts, definitions, and important points to remember." : ""}
`.trim();

    // For now everything goes to Gemini
    // Later: if intent === "code" → send to Claude instead
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemContext + "\n\nStudent: " + message }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error("Gemini error:", geminiData);
      return NextResponse.json({ error: "Gemini API error" }, { status: 500 });
    }

    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response generated.";

    return NextResponse.json({
      response: text,
      model: intent === "code" ? "gemini-1.5-flash (code detected)" : "gemini-1.5-flash",
    });

  } catch (err) {
    console.error("Tutor API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}