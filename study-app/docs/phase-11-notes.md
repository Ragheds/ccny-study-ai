# Phase 11

## What changed

Phase 11 adds a prepared /demo with no account services, keyboard focus, 44px workspace controls, reduced-motion defaults and 180ms mode transitions. AITutor is split into components/tutor/TutorChrome.tsx and lib/tutorClient.ts. Offline downloads preserve queued notes, including edits made during sync. PDF extraction uses a shared server module with streamed body, byte/page and plan limits; the old browser CDN parser is removed. Code URLs canonicalize to Chat on unsupported courses. Server tutor streaming is extracted, model fallback is restored centrally, and accounting records the actual answering model. Graph ticks are readable and mathjs uses its number-only entry. Next is updated within 16 for security fixes; production audit is clear. Read OWNER-CHECKLIST.md and PERFORMANCE.md first.

## Read first

Read `docs/ARCHITECTURE.md` for the data flow, then the files listed above. Server routes verify a session and use database quotas. Browser checks are convenience only. All new SQL is listed in `docs/MIGRATIONS-TO-RUN.md`; none was applied.

## How to test

1. Run npm run lint, npm run test, npm run build, npm run check:bundle, then npm run start and open /demo. 33 automated tests passed: grounding, speech, quotas/course policy helpers, streamed body limits, IndexedDB sync races, model fallback and 20 algebra renderer cases. Lint/build passed.
2. Local browser demo checks: 360px content fits; Next and flashcard reveal work; equations and graphs render; console has no warnings/errors. These are browser checks, not real phone tests.
3. Run the development-project and real-device checklist in OWNER-CHECKLIST.md. Lighthouse/React Profiler and phone targets are unmeasured. Set an AI budget before enabling stronger Code; verify actual models and generated answers.
4. Review privacy/contact/retention before invites. Five development-only lint-chain advisories remain with no compatible fix; do not force a downgrade. No confirmed application bug was abandoned after three attempts. Pending-pack crash recovery remains an operational limitation to inspect before beta.

## Verification and limits

`npm run lint` and `npm run build` passed on this branch. `.next/static`: 4317 KiB; JavaScript: 2507 KiB. Artifact totals are not page transfer sizes. Lighthouse and real-device performance are not measured: no production or authenticated-device test was performed. Next 16.4.0 installed the working native SWC package. No paid AI calls, real payments, production changes, or real-student trials were made. Production dependency audit reports zero advisories; five development-only lint-chain advisories remain.
