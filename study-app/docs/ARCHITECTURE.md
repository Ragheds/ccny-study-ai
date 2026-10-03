# Architecture

- `app/(marketing)`: landing, sign-up, login, and major browsing routes.
- `app/(app)`: workspace pages for dashboard, notes, progress, and account.
- `components/AITutor.tsx`, `components/FlashcardsWorkspace.tsx`: interactive tutor and flashcard UI.
- `lib/storage.ts` and `hooks/useStoredValue.ts`: account-scoped browser storage; Phase 1 will make Supabase the source of truth.
- `lib/supabase/`: browser, cookie-aware server, and server-only admin clients.
- `app/api/tutor/route.ts`: authenticates, reserves a database quota, tries free models in order, streams OpenRouter text, and finalizes one usage row.
- `lib/tutorLimits.ts`: temporary server-enforced free-model quotas.
- `supabase/migrations/`: additive database migrations. The Phase 0 migration adds AI usage and an atomic quota reservation function.
- `data/`: CCNY major and course catalog.

Current flow: browser workspace sends a tutor prompt → route verifies the Supabase user → service-role RPC reserves quota and logs the attempt → OpenRouter streams text → usage row records status and tokens. Learning content outside AI usage remains in browser storage for now.
