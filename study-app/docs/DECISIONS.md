# Decisions

- Phase 0: Use a Postgres advisory lock in a service-role-only reservation function so quotas stay consistent across concurrent server instances.
- Phase 0: Reserve estimated input plus the output maximum before an AI call; conservative accounting prevents stream cancellation from avoiding the daily cap.
- Phase 0: Make one OpenRouter attempt per tutor request while usage accounting is introduced; model selection and paid-model pricing belong to Phase 3.
- Phase 0: Use the existing beaver artwork for the 192 and 512 pixel manifest icons to avoid adding a new brand direction.
- Phase 0: Build with webpack because this macOS checkout has only the Next SWC WASM fallback, which Turbopack cannot use.
- Tutor fix: Count a failed student request against the rolling-minute retry limit, but release its daily request and token reservation; fallback attempts share one usage row.
- Phase 1: Keep `user_app_state` as a compatibility write point and mirror changes atomically into normalized RLS tables; this imports existing browser snapshots without changing every feature screen at once.
- Phase 1: Use server-fetched app state for the first render and account-scoped browser storage for optimistic edits; local edits newer than the remote snapshot are uploaded after reconciliation.
- Phase 1: Split tutor message rendering from chat control and batch streaming text updates per animation frame to reduce work during a response.
