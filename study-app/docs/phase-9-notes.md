# Phase 9

## What changed

CodeWorkspace is a separate lazy-loaded workspace with hints first, saved per-course replies and solution explanations only after an attempt. /api/code derives selection from authenticated user_app_state and verifies it against user_courses. Server plan and feature quotas apply; lib/models.ts configures the stronger model, gated by AI_ENABLE_HIGHER_TIERS until an owner budget is set. The general tutor rejects privileged action names.

## Read first

Read `docs/ARCHITECTURE.md` for the data flow, then the files listed above. Server routes verify a session and use database quotas. Browser checks are convenience only. All new SQL is listed in `docs/MIGRATIONS-TO-RUN.md`; none was applied.

## How to test

1. In a development Supabase project, redeem a beta invite and save CSC 103 plus MATH 201. Select CSC, wait for sync, then open Code. With higher tiers disabled, expect the budget message without an AI charge.\n2. After setting a budget and enabling the flag in development, ask for a hint. Add a 20-character attempt, then request a solution. Verify ai_usage records code and the configured model.\n3. Change to MATH; Code disappears and a direct ?tab=code renders Chat. Forge expectedCourse=CSC while saved selection is MATH: expect 403. A stale supported selection must return 409.\n4. Free accounts get 403; exceed codePerDay (currently 10 Pro) and expect 429. All usage also obeys daily token/request and minute caps.\n5. Switch courses and accounts: saved replies must remain scoped. Unit tests for prefix eligibility and saved selection pass. No authenticated or stronger-model request was made.

## Verification and limits

`npm run lint` and `npm run build` passed on this branch. `.next/static`: 4546 KiB; JavaScript: 2736 KiB. Artifact totals are not page transfer sizes. Lighthouse and real-device performance are not measured: no production or authenticated-device test was performed. Existing macOS SWC WASM fallback warnings remain. No paid AI calls, real payments, production changes, or real-student trials were made. Dependencies need the final security review before beta.
