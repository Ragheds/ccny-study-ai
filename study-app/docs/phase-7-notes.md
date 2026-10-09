# Phase 7

## What changed

lib/autoNotes.ts captures exact excerpts from completed teaching, preserving manual course notes and deduplicating reply sources. hooks/useAutoNotes.ts keeps NOTES_V2 as the persistence/sync point. AutoNotesPanel supports editing, pinning, deletion and one-button creation of source-grounded cards or quizzes through the existing private material pipeline. Whiteboard step capture uses the same hook in Phase 8.

## Read first

Read `docs/ARCHITECTURE.md` for the data flow, then the files listed above. Server routes verify a session and use database quotas. Browser checks are convenience only. All new SQL is listed in `docs/MIGRATIONS-TO-RUN.md`; none was applied.

## How to test

1. Ask a development tutor question, complete the reply, open Notes and check Notes from your tutor. The text must be an actual excerpt of the reply, with its source ID, not newly generated facts. Existing manual notes must remain.\n2. Edit, pin, reload and sign in on a second device. Delete one taught note and confirm it stays deleted. Very long replies are labeled excerpts and capped at 5000 characters.\n3. Click Turn into flashcards or Turn into a quiz online. It uses the material upload allowance and creates a private source-grounded pack; check its citations, then study it offline. A note shorter than 80 characters cannot produce a pack.\n4. node --test tests/auto-notes.test.mjs passes for exact source preservation, manual-note preservation and deduplication. Authenticated AI, cross-device sync and phone behavior remain owner tests. No new migration is required for this JSON data addition.

## Verification and limits

`npm run lint` and `npm run build` passed on this branch. `.next/static`: 2241 KiB; JavaScript: 1730 KiB. Artifact totals are not page transfer sizes. Lighthouse and real-device performance are not measured: no production or authenticated-device test was performed. Existing macOS SWC WASM fallback warnings remain. No paid AI calls, real payments, production changes, or real-student trials were made. Dependencies need the final security review before beta.
