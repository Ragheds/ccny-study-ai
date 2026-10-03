# Architecture

- `app/(marketing)`: landing, sign-up, login, and major browsing routes.
- `app/(app)`: workspace pages for dashboard, notes, progress, and account.
- `components/AITutor.tsx`, `components/FlashcardsWorkspace.tsx`: interactive tutor and flashcard UI.
- `lib/storage.ts` and `hooks/useStoredValue.ts`: account-scoped fast cache with per-key edit timestamps and server snapshot hydration.
- `components/SupabaseAccountBridge.tsx` and `lib/supabase/appState.ts`: import existing local data once, load normalized remote rows, and save browser changes to Supabase.
- `lib/supabase/serverStudyState.ts` and `components/AppDataProvider.tsx`: fetch the signed-in student's saved state in the app layout and render it during hydration.
- `lib/supabase/`: browser, cookie-aware server, and server-only admin clients.
- `app/api/tutor/route.ts`: authenticates, reserves a database quota, tries free models in order, streams OpenRouter text, and finalizes one usage row.
- `lib/tutorLimits.ts`: temporary server-enforced free-model quotas.
- `supabase/migrations/`: additive database migrations. Phase 1 adds RLS-protected learning tables and a compatibility cache mirror.
- `data/`: CCNY major and course catalog.

Current learning-data flow: the server layout reads profile, courses, notes, and saved work from Supabase → the client renders that snapshot before hydration → `lib/storage.ts` keeps a fast account-scoped cache → the account bridge sends local edits to `user_app_state`, whose database trigger updates normalized tables. Remote normalized rows win on the next load unless a newer local edit is pending. AI requests follow the authenticated quota path in `app/api/tutor/route.ts`.
