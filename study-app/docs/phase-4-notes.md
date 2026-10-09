# Phase 4

## What changed

lib/offline/db.ts stores account-scoped packs and a durable notes/quiz/review queue in IndexedDB. /offline is a static replay screen; Serwist precaches it and assets but never authenticated HTML/API responses. /api/packs authenticates, enforces atomic per-plan course caps, prepares 20 cards/10 questions, and reuses existing packs. /api/offline/sync applies idempotent edits with last-write-wins pack notes.

## Read first

Read `docs/ARCHITECTURE.md` for the data flow, then the files listed above. Server routes verify a session and use database quotas. Browser checks are convenience only. All new SQL is listed in `docs/MIGRATIONS-TO-RUN.md`; none was applied.

## How to test

1. Apply migration 6 in development. Build and start over HTTPS (localhost is acceptable for desktop). Sign in, save a course, click Make available offline, open /offline and refresh once while online. Verify pack size and 20 cards/10 questions.\n2. On a real iPhone Safari installed PWA and Android Chrome installed PWA: download a pack and a device English voice while online. Force-close, enable airplane mode, reopen from the home screen. Flip cards, answer the quiz, edit notes, and reload. Data must remain.\n3. Tap Listen while offline. Record device, OS, voice name, whether it speaks without signal, after switching apps, and after locking for 30 seconds. If silent, captions are the supported fallback. This audio spike is implemented but its phone results are unverified.\n4. Reconnect, open the app, use Download / sync my packs; queued edits must reach study_edits and pack notes must appear on a second signed-in device. Sign out and switch accounts; private downloads must not appear. Remove from this device, verify it disappears. Test quota denied/storage full/retry states. Last-write-wins uses client timestamps; clocks must be accurate.

## Verification and limits

`npm run lint` and `npm run build` passed on this branch. `.next/static`: 2220 KiB; JavaScript: 1709 KiB. Artifact totals are not page transfer sizes. Lighthouse and real-device performance are not measured: no production or authenticated-device test was performed. Existing macOS SWC WASM fallback warnings remain. No paid AI calls, real payments, production changes, or real-student trials were made. Dependencies need the final security review before beta.
