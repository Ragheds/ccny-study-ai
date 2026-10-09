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

- Phase 4: lib/offline/db.ts stores account-scoped packs and a durable notes/quiz/review queue in IndexedDB. /offline is a static replay screen; Serwist precaches it and assets but never authenticated HTML/API responses. /api/packs authenticates, enforces atomic per-plan course caps, prepares 20 cards/10 questions, and reuses existing packs. /api/offline/sync applies idempotent edits with last-write-wins pack notes.

- Phase 5: app/api/packs/upload/route.ts extracts PDF text (5 MB maximum) or pasted text, checks server plan limits, chunks it, and generates private packs. lib/material/grounding.ts rejects answers and notes whose exact excerpts are absent from the cited source. Original PDFs are not retained. Source packs download through the same IndexedDB flow and can be deleted from the account.

- Phase 6: BetaTools adds a feedback form, optional account-linked activity counters, privacy/terms drafts and the professor-check reminder. /beta is restricted by server ADMIN_USER_IDS. Migration 8 deduplicates hourly counters, caps feedback and exposes aggregate metrics only to service_role. Error boundaries report categories without study content. docs/BETA-INVITE.md contains invitation copy and owner rollout steps.

- Phase 7: lib/autoNotes.ts captures exact excerpts from completed teaching, preserving manual course notes and deduplicating reply sources. hooks/useAutoNotes.ts keeps NOTES_V2 as the persistence/sync point. AutoNotesPanel supports editing, pinning, deletion and one-button creation of source-grounded cards or quizzes through the existing private material pipeline. Whiteboard step capture uses the same hook in Phase 8.

- Phase 8: lib/whiteboard/schema.ts validates lesson blocks with zod; lib/server/lessonStream.ts transforms provider SSE into validated NDJSON steps as they arrive, repairs once, then falls back to a normal text answer. One reservation covers attempts. Only predefined algebra topics enter the shared Supabase cache; custom questions remain private. WhiteboardTutor plays one narrated step at a time, writes with Caveat, renders lazy KaTeX and SVG graphs, and saves lessons for offline replay. mathjs expressions use a strict AST allowlist and x-only scope; sampling clips curves and separates asymptotes.
