import "server-only";
// Estimates per million tokens; verify provider prices before enabling higher tiers.
export const MODELS = {
  cheap: { id: "google/gemini-2.5-flash-lite", inputUSD: 0.10, outputUSD: 0.40 },
  board: { id: "google/gemini-2.5-flash", inputUSD: 0.30, outputUSD: 2.50 },
  code: { id: "qwen/qwen3-coder", inputUSD: 0.22, outputUSD: 1.00 },
} as const;
export function modelFor(feature: string) {
  if (process.env.AI_ENABLE_HIGHER_TIERS !== "true") return MODELS.cheap;
  return feature === "code" ? MODELS.code : feature === "whiteboard" ? MODELS.board : MODELS.cheap;
}
export function estimateCost(model: string, input: number, output: number) {
  const config = Object.values(MODELS).find(item => item.id === model) ?? MODELS.cheap;
  return (input * config.inputUSD + output * config.outputUSD) / 1000000;
}
