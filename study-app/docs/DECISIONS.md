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
- Phase 2: Make the signed-in dashboard a focused study home: one prominent continue card, four quick actions, a course list, and a compact status rail for streak and offline readiness. On narrow screens the rail stacks below courses and a four-item bottom navigation replaces the fixed sidebar. This keeps the next study action visible without repeating full workspaces on the home screen.
- Phase 2: Store the chosen teaching style in `profiles.study_mode`, mirror it into account-scoped browser storage for immediate rendering, and use a separate dismissed flag so skipping onboarding does not force a style. The style guides general tutor replies while explicit user requests take precedence.
- Phase 2: Show Whiteboard and Code as honest course workspace previews until Phases 8 and 9. Code appears only for the approved engineering and computer science course prefixes. Offline pack size remains unavailable until Phase 4.

- Phase 2 feedback: Keep the URL plus account-scoped saved course as the selection source and remove private workspace course pickers to prevent context drift.
- Phase 2 feedback: Keep browser speech behind one adapter, queue one sentence at a time, filter novelty voices, and make reply autoplay opt-in. Follow chat growth only within 80px of the bottom; students can explicitly jump to resume following.

- Phase 3: Server-only lib/plans.ts and lib/models.ts replace temporary limits. lib/server/access.ts verifies subscription expiry; /plans offers test checkout and atomic invite redemption. Signed Stripe webhooks are deduplicated and timestamp ordered. AI usage records cost estimates and failed requests release daily reservations.
