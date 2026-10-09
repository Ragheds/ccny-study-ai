// Keep transport and frame batching separate from the chat workspace state.
export async function streamTutor(
  body: unknown,
  signal: AbortSignal,
  onText: (text: string) => void,
) {
  if (!navigator.onLine)
    throw new Error(
      "Needs internet. Open Offline study to review downloaded packs.",
    );
  const response = await fetch("/api/tutor", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok || !response.body) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error || "The tutor is unavailable. Please try again.",
    );
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "",
    frame = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          onText(text);
        });
    }
    text += decoder.decode();
    onText(text);
    return text;
  } finally {
    if (frame) cancelAnimationFrame(frame);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
