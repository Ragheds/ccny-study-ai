import "server-only";
export const PLANS = {
  free: { name: "Free", monthlyUSD: 0, requestsPerDay: 10, reservedTokensPerDay: 16000, requestsPerMinute: 5, offlinePacks: 1, uploadsPerDay: 1, whiteboard: false, code: false, codePerDay: 0, voicePerDay: 0 },
  pro: { name: "Pro", monthlyUSD: 5, requestsPerDay: 80, reservedTokensPerDay: 100000, requestsPerMinute: 5, offlinePacks: 1000, uploadsPerDay: 5, whiteboard: true, code: true, codePerDay: 10, voicePerDay: 15 },
} as const;
export type PlanId = keyof typeof PLANS;
