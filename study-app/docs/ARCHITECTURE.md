# Architecture

- `app/(marketing)`: landing, sign-up, login, and major browsing routes.
- `app/(app)`: workspace pages for dashboard, notes, progress, and account.
- `components/AITutor.tsx`, `components/FlashcardsWorkspace.tsx`, `components/QuizzesWorkspace.tsx`, and `components/NotesWorkspace.tsx`: interactive study workspaces, loaded when opened from the dashboard.
- `components/DashboardHome.tsx`, `components/CourseModeBar.tsx`, and `components/MobileAppNav.tsx`: signed-in home, course mode switcher, and small-screen navigation.
- `components/StudyModeControl.tsx`, `lib/studyMode.ts`, and `lib/supabase/studyMode.ts`: onboarding choice, prompt instructions, and profile persistence.
- `lib/storage.ts` and `hooks/useStoredValue.ts`: account-scoped fast cache with per-key edit timestamps and server snapshot hydration.
- `components/SupabaseAccountBridge.tsx` and `lib/supabase/appState.ts`: import existing local data once, load normalized remote rows, and save browser changes to Supabase.
- `lib/supabase/serverStudyState.ts` and `components/AppDataProvider.tsx`: fetch the signed-in student's saved state in the app layout and render it during hydration.
- `lib/supabase/`: browser, cookie-aware server, and server-only admin clients.
- `app/api/tutor/route.ts`: authenticates, reserves a database quota, tries free models in order, streams OpenRouter text, and finalizes one usage row.
- `lib/tutorLimits.ts`: temporary server-enforced free-model quotas.
- `supabase/migrations/`: additive database migrations. Phase 1 adds RLS-protected learning tables and a compatibility cache mirror; Phase 2 adds the study style onboarding dismissal flag.
- `data/`: CCNY major and course catalog.

Current learning-data flow: the server layout reads profile, courses, notes, and saved work from Supabase → the client renders that snapshot before hydration → `lib/storage.ts` keeps a fast account-scoped cache → the account bridge sends local edits to `user_app_state`, whose database trigger updates normalized tables. Remote normalized rows win on the next load unless a newer local edit is pending. AI requests follow the authenticated quota path in `app/api/tutor/route.ts`.

The study style is read from `profiles` during server/browser state load. A choice is written directly to that profile and cached locally. The tutor API reads the authenticated profile before building a general chat prompt. Browser playback is handled exclusively by `lib/speech.ts`: replies have Listen controls and Audio autoplay is opt-in. Voice, rate, and autoplay use the existing account-scoped speech preference key. The text remains visible.

Course selection flows through `hooks/useCourseSelection.ts`: a valid URL course wins, then the saved course, then the first saved course. `CourseSwitcher` renders that selection; workspaces receive it as a prop and remount on course changes. Code eligibility is guarded both when navigating and when loading a direct URL.
