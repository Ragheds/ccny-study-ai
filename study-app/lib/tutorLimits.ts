// Temporary free-model limits. Phase 3 will replace this with per-plan values.
export const TUTOR_LIMITS = {
  requestsPerDay: 60,
  reservedTokensPerDay: 80_000,
  requestsPerMinute: 5,
} as const;
