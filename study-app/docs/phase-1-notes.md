# Phase 1 — data layer and first smoothness fixes

## What changed

Supabase now has additive, RLS-protected tables for profiles, saved courses, notes, flashcard sets, quiz attempts, shared lessons, private lesson saves, and subscriptions. The existing `ai_usage` table remains from Phase 0. A `user_app_state` compatibility row keeps chats and other current browser state synchronized. Its database trigger mirrors major, courses, notes, flashcards, and quiz results into the new tables in the same transaction. The app reads those normalized rows on both the server and browser. Browser storage remains a fast account-scoped cache and an import source for existing students.

The signed-in app layout fetches saved state on the server. `AppDataProvider` supplies the same values to storage hooks during hydration, so the dashboard, sidebar, and notes do not briefly show empty defaults. Local edits get timestamps and stay visible immediately; if a local edit is newer than the server snapshot, the bridge sends it back to Supabase. A read error no longer treats remote data as missing. If no remote record exists, the bridge imports the user's existing local data once.

Loading screens now use a consistent skeleton. The tutor's message renderer lives in `components/TutorMessages.tsx`, reducing `AITutor.tsx` from 885 to 797 lines. Saved messages are memoized, and stream text updates are batched to animation frames. The tutor still uses the same UI and response format.

## Apply the database migration

1. In the production Supabase project, first apply `supabase/migrations/202610030002_failed_usage_excluded.sql` if you have not already. The exact steps are in `docs/tutor-limit-fix-notes.md`.
2. In **Supabase → SQL Editor**, create a new query. Paste and run the complete `supabase/migrations/202610030003_phase1_data.sql` file **once**. It creates the new tables and policies, then backfills any existing `user_app_state` rows. It does not delete existing `user_app_state` or auth data; removed learning items remain in normalized tables with `is_deleted = true`.
3. In Table Editor, confirm `profiles`, `user_courses`, `notes`, `flashcards`, `quiz_results`, `lessons`, `user_lessons`, `subscriptions`, and `user_app_state` exist with RLS enabled. `lessons` and `subscriptions` are read-only to ordinary signed-in users; other learning rows are restricted to their owner.
4. Deploy the `codex/phase-1-data-layer` branch after the migration. Do not deploy this branch before the SQL, because its server reads expect the new tables.

## Manual two-device acceptance test

1. On device A, sign in with an existing account that already has a major, courses, and notes. Visit the dashboard and notes, then wait about two seconds for sync.
2. In Supabase Table Editor, confirm one `profiles` row, the expected `user_courses` rows, and per-course `notes` rows for that user. Existing `user_app_state` data should still be present.
3. In a separate browser profile or device B with empty browser storage, sign in to the same account. The same major, courses, and notes should appear without an empty-default flash.
4. Edit one course note on device B, save it, wait two seconds, then reload device A. Device A should show the updated note. Add or remove a course and repeat.
5. Sign out and sign in as a different account. The first account's cached learning data must not appear. On an older account with only browser-local data, verify its data imports once; then repeat on device B.

The remote migration and live two-device test cannot run from this workspace without changing production data. Treat this manual check as the release gate. No real-phone or offline pack behavior was tested; payments are still out of scope. Concurrent edits from two devices currently use the latest whole-state write, so avoid editing the same account simultaneously until per-item sync in the offline phase.

## Verification and performance

- `npm run lint` and `npm run build`: pass.
- Local production `/dashboard` request: HTTP 200.
- Lighthouse mobile on the local **landing page**: Phase 0 baseline 87 / LCP 3.93 s / CLS 0; Phase 1 91 / LCP 3.52 s / CLS 0. One run on an unchanged landing page is not evidence of a dashboard improvement. INP, signed-in dashboard Lighthouse, and React Profiler before/after traces require an interactive signed-in test session and were not measured here.
- Production `.next/static`: Phase 0 2,308 KiB; Phase 1 2,316 KiB. JS chunks: 1,752 → 1,760 KiB. These are total build artifact sizes, not transferred bytes per page.

## Read first

Start with `supabase/migrations/202610030003_phase1_data.sql` for table ownership, then `lib/supabase/serverStudyState.ts` and `components/AppDataProvider.tsx` for first render. `components/SupabaseAccountBridge.tsx` and `lib/supabase/appState.ts` handle ongoing sync and one-time import. `lib/storage.ts` is still the swap point for local caching.
