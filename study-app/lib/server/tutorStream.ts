export async function tryModelsStreaming(
  models: readonly string[],
  requestBody: object,
  apiKey: string,
  onFinish: (
    status: "completed" | "failed",
    model: string,
    inputTokens?: number,
    outputTokens?: number,
  ) => Promise<void>,
): Promise<Response | null> {
  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(45000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://ccny-study-ai.vercel.app",
          "X-Title": "CCNY Study AI",
        },
        body: JSON.stringify({
          ...requestBody,
          model,
          stream: true,
          stream_options: { include_usage: true },
        }),
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
      let answeredModel = model;

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
                      model?: string;
                      choices?: Array<{ delta?: { content?: string } }>;
                      error?: unknown;
                      usage?: {
                        prompt_tokens?: number;
                        completion_tokens?: number;
                      };
                    };
                    if (typeof parsed.model === "string")
                      answeredModel = parsed.model;
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
                    model?: string;
                    choices?: Array<{ delta?: { content?: string } }>;
                    error?: unknown;
                    usage?: {
                      prompt_tokens?: number;
                      completion_tokens?: number;
                    };
                  };
                  if (typeof parsed.model === "string")
                    answeredModel = parsed.model;
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
            await onFinish(
              "failed",
              answeredModel,
              inputTokens,
              outputTokens ?? Math.ceil(outputCharacters / 4),
            );
          } finally {
            await onFinish(
              outputCharacters > 0 ? "completed" : "failed",
              answeredModel,
              inputTokens,
              outputTokens ?? Math.ceil(outputCharacters / 4),
            );
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
