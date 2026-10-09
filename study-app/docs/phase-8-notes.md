# Phase 8

## What changed

lib/whiteboard/schema.ts validates lesson blocks with zod; lib/server/lessonStream.ts transforms provider SSE into validated NDJSON steps as they arrive, repairs once, then falls back to a normal text answer. One reservation covers attempts. Only predefined algebra topics enter the shared Supabase cache; custom questions remain private. WhiteboardTutor plays one narrated step at a time, writes with Caveat, renders lazy KaTeX and SVG graphs, and saves lessons for offline replay. mathjs expressions use a strict AST allowlist and x-only scope; sampling clips curves and separates asymptotes.

## Read first

Read `docs/ARCHITECTURE.md` for the data flow, then the files listed above. Server routes verify a session and use database quotas. Browser checks are convenience only. All new SQL is listed in `docs/MIGRATIONS-TO-RUN.md`; none was applied.

## How to test

1. No new SQL; use the existing Phase 1 lessons/user_lessons tables plus Phase 3 quotas. Redeem beta Pro on a development account and open Whiteboard. Ask one small algebra question with the cheap default model. First valid step should appear before the full response finishes. Pause/resume, replay, previous/next, captions, themes and speed must work.
2. Inject malformed NDJSON in a local mock: one repair is allowed; a second invalid script must clear the broken board and show a normal text fallback. Verify block IDs are unique and each student request has one usage row.
3. Use the predefined slope example twice; the second should hit the generic cache. Custom questions must not enter the shared lessons table. Sign in on another device and load saved lessons. Download, go offline, open /offline → Saved whiteboard lessons; replay with captions and device speech.
4. node --test tests/whiteboard.test.mjs passes: 20 algebra numeric/renderer checks plus dangerous-expression and NDJSON/schema checks. These do not validate model answers. On a real 360px phone, manually ask all questions in lib/whiteboard/algebraCases.ts and compare axes, slopes, roots, points and parabolas. Check 1/x has no line across its asymptote. Real AI accuracy, synchronized phone voice, and latency are untested.

## Verification and limits

`npm run lint` and `npm run build` passed on this branch. `.next/static`: 4541 KiB; JavaScript: 2731 KiB. Artifact totals are not page transfer sizes. Lighthouse and real-device performance are not measured: no production or authenticated-device test was performed. Existing macOS SWC WASM fallback warnings remain. No paid AI calls, real payments, production changes, or real-student trials were made. Dependencies need the final security review before beta.
