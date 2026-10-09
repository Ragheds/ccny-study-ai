import "server-only";
import { studentAccess } from "@/lib/server/access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { modelFor, estimateCost } from "@/lib/models";
export class StudyError extends Error {
  constructor(
    message: string,
    public status = 503,
  ) {
    super(message);
  }
}
export async function generateText(
  feature: string,
  system: string,
  message: string,
  maxTokens = 2048,
) {
  const access = await studentAccess();
  if (!access) throw new StudyError("Sign in to study with AI.", 401);
  if (feature === "whiteboard" && !access.limits.whiteboard)
    throw new StudyError("Whiteboard needs Pro or a beta invite.", 403);
  if (feature === "code") {
    if (!access.limits.code)
      throw new StudyError("Code mode needs Pro or a beta invite.", 403);
    if (process.env.AI_ENABLE_HIGHER_TIERS !== "true")
      throw new StudyError(
        "Code mode is waiting for the owner's AI budget. Use Chat for now.",
      );
  }
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new StudyError("AI is not configured.");
  const model = modelFor(feature);
  const admin = createSupabaseAdminClient();
  const tokens = Math.min(
    16000,
    Math.ceil((system.length + message.length) / 3) + maxTokens,
  );
  const { data: id, error } = await admin.rpc("reserve_plan_usage", {
    p_user: access.user.id,
    p_feature: feature,
    p_model: model.id,
    p_tokens: tokens,
    p_daily_tokens: access.limits.reservedTokensPerDay,
    p_daily_requests: access.limits.requestsPerDay,
    p_minute: access.limits.requestsPerMinute,
    p_feature_cap:
      feature === "upload"
        ? access.limits.uploadsPerDay
        : feature === "code"
          ? access.limits.codePerDay
          : null,
  });
  if (error)
    throw new StudyError("Usage service unavailable. Check migrations.");
  if (!id)
    throw new StudyError(
      "Study allowance reached. Wait a minute or try tomorrow (UTC reset).",
      429,
    );
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        signal: AbortSignal.timeout(45000),
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model.id,
          messages: [
            { role: "system", content: system },
            { role: "user", content: message },
          ],
          max_tokens: maxTokens,
          temperature: 0.2,
        }),
      },
    );
    if (!response.ok) throw new StudyError("AI is busy. Try again shortly.");
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim())
      throw new StudyError("AI returned no lesson. Try again.");
    const input = data.usage?.prompt_tokens ?? tokens - maxTokens;
    const output = data.usage?.completion_tokens ?? Math.ceil(text.length / 3);
    const { error: usageError } = await admin
      .from("ai_usage")
      .update({
        status: "completed",
        input_tokens: input,
        output_tokens: output,
        estimated_cost_usd: estimateCost(model.id, input, output),
      })
      .eq("id", id);
    if (usageError) console.error("AI accounting needs review", id);
    return text;
  } catch (error) {
    await admin.from("ai_usage").update({ status: "failed" }).eq("id", id);
    throw error;
  }
}
export function studyError(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof StudyError
          ? error.message
          : "Study service unavailable. Please try again.",
    },
    { status: error instanceof StudyError ? error.status : 503 },
  );
}
