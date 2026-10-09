export class BodyError extends Error {
  status = 413;
}
// Enforce streamed bytes as well as Content-Length (which may be absent).
export async function boundedBody(
  request: Request,
  limit: number,
): Promise<Uint8Array> {
  if (Number(request.headers.get("content-length")) > limit)
    throw new BodyError("This request is too large. Use a shorter section.");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new BodyError(
          "This request is too large. Use a shorter section.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
export async function boundedJSON(request: Request, limit = 40000) {
  return JSON.parse(
    new TextDecoder().decode(await boundedBody(request, limit)),
  );
}
