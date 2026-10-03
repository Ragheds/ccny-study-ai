# Phase 2 — onboarding and study home

## Shipped

- After a student saves courses, a skippable study style dialog offers Visual, Audio, or Hands-on. The top bar can change it later. The choice is a default for tutor chat, and all tools remain available.
- The tutor API reads the authenticated profile mode. Visual favors structured diagrams and short steps; Audio favors natural spoken sentences and speaks completed replies with the browser speech engine; Hands-on leads with practice and a hint ladder. A student can ask for another style in chat. Audio mode also offers an audio quiz: questions are spoken, and answers can be tapped or spoken as A/B/C/D where browser speech recognition is available.
- The course bar switches among Chat, Whiteboard, Notes, and (for CSC, EE, ME, CE, CHE, BME, and ENGR courses) Code. Notes and chat are live. Whiteboard and Code clearly state their future phase.
- The signed-in home now shows the latest saved activity, study actions, courses, a streak based on saved work, and honest offline status. At phone width the desktop sidebar is replaced by bottom navigation.

## Apply the migration before deploying

1. Open the production Supabase project, then **SQL Editor → New query**.
2. Open `supabase/migrations/202610030004_phase2_study_mode.sql` from this branch and paste its entire contents into the editor. Run it once. It adds `profiles.study_mode_prompt_dismissed`; Phase 1 already added `profiles.study_mode`.
3. In **Table Editor → profiles**, confirm the new boolean column exists with default `false`. Existing major, course, and study data stay in place.
4. Deploy this branch after the SQL succeeds. The new server state reads expect the column.

## How to test

1. In a fresh account, select a major and at least one course. On entering the dashboard, choose a style or **Skip for now**. Reload; the dialog should stay dismissed. Use the top bar to change the style. Sign in on a second device and confirm the choice appears there.
2. Ask a tutor question in each style. Visual should use structured short steps; Audio should produce spoken sentences and play the completed reply (enable device sound); Hands-on should offer a problem and hints before the full solution. Ask for a different style in a message to confirm that request is honored. In Audio mode, generate a quiz, start its audio option, replay a question, answer by tap, and try a voice letter in a browser that supports speech recognition.
3. Switch between Chat and Notes in a course, then change courses. Whiteboard should say Phase 8. Code should appear only for eligible prefixes and should say Phase 9. Check direct `?tab=code` on an ineligible course returns to Chat.
4. On a 360px phone and desktop, check the continue card, actions, course list, top bar, and bottom navigation. Save a chat or note, return home, and confirm the continue card reflects it. Course rows should say **Online only · Offline size —**, and the status panel should state that packs are not yet available.

## Verification

- `npm run lint` and `npm run build` pass.
- Local production `/dashboard` responds with HTTP 200. At a 360px browser viewport, the top bar, onboarding, home cards, course switcher, Notes workspace, and bottom navigation rendered and worked in a guest session. Skipping onboarding dismissed the dialog.
- The production build's `.next/static` is 2,364 KiB (Phase 1: 2,316 KiB); JS chunks total 1,804 KiB (Phase 1: 1,760 KiB). These are build artifact totals, not transferred bytes for the dashboard. A meaningful Lighthouse and React Profiler before/after comparison needs a signed-in session on both builds; it was not available in this local guest check.
- The migration and cross-device checks require the production Supabase project and a signed-in device session; they are release checks to perform after applying SQL.
