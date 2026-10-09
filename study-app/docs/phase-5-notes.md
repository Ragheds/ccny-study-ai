# Phase 5

## What changed

app/api/packs/upload/route.ts extracts PDF text (5 MB maximum) or pasted text, checks server plan limits, chunks it, and generates private packs. lib/material/grounding.ts rejects answers and notes whose exact excerpts are absent from the cited source. Original PDFs are not retained. Source packs download through the same IndexedDB flow and can be deleted from the account.

## Read first

Read `docs/ARCHITECTURE.md` for the data flow, then the files listed above. Server routes verify a session and use database quotas. Browser checks are convenience only. All new SQL is listed in `docs/MIGRATIONS-TO-RUN.md`; none was applied.

## How to test

1. Apply migration 7 in development. Select a saved course and open Make a pack from class material. Paste a short lecture excerpt, then test one text PDF. Free limits: 8000 extracted characters/one upload per UTC day; Pro: 12000/five. Oversized and scanned PDFs must fail clearly without saving a ready pack.
2. Include a sentence saying ignore previous instructions in the source: outputs must still be source-grounded cards/quiz/notes. Compare every correct answer and note against the cited chunks. Short sources may produce fewer cards/questions.
3. Download the pack, enable airplane mode, reopen /offline and study. Verify another account cannot GET/delete/sync it. Delete from account while online, then sync a second device and confirm its cached copy is removed. Copies on disconnected devices cannot be remotely erased until reconnecting.
4. node --test tests/grounding.test.mjs passes. Synthetic one-page PDF text extraction passed locally. Real lecture PDFs, AI generation, daily upload caps in Supabase, and real-phone offline playback were not tested.

## Verification and limits

`npm run lint` and `npm run build` passed on this branch. `.next/static`: 2223 KiB; JavaScript: 1711 KiB. Artifact totals are not page transfer sizes. Lighthouse and real-device performance are not measured: no production or authenticated-device test was performed. Existing macOS SWC WASM fallback warnings remain. No paid AI calls, real payments, production changes, or real-student trials were made. Dependencies need the final security review before beta.
