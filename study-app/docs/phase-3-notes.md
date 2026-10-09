# Phase 3

## What changed

Server-only lib/plans.ts and lib/models.ts replace temporary limits. lib/server/access.ts verifies subscription expiry; /plans offers test checkout and atomic invite redemption. Signed Stripe webhooks are deduplicated and timestamp ordered. AI usage records cost estimates and failed requests release daily reservations.

## Read first

Read `docs/ARCHITECTURE.md` for the data flow, then the files listed above. Server routes verify a session and use database quotas. Browser checks are convenience only. All new SQL is listed in `docs/MIGRATIONS-TO-RUN.md`; none was applied.

## How to test

1. Apply migration 5 on a development Supabase project. Add development/test keys from .env.example. Open /plans signed in. Redeem an invite twice; the second attempt must fail. Verify a Free account cannot edit its subscription directly.\n2. Stripe CLI: stripe listen --forward-to localhost:3000/api/billing/webhook. Set its test signing secret locally. Buy with test card 4242 4242 4242 4242, future expiry, any CVC; verify subscription active. Cancel in Stripe test dashboard, replay and reorder events; expiry must revoke Pro. Never use live keys.\n3. With a separate development AI key, ask one tiny question, confirm one usage row and cost estimate. Send requests up to minute/daily quota and verify friendly 429. Failed model calls must not use the daily allowance. Paid tests were not run.

## Verification and limits

`npm run lint` and `npm run build` passed on this branch. `.next/static`: 2182 KiB; JavaScript: 1671 KiB. Artifact totals are not page transfer sizes. Lighthouse and real-device performance are not measured: no production or authenticated-device test was performed. Existing macOS SWC WASM fallback warnings remain. No paid AI calls, real payments, production changes, or real-student trials were made. Dependencies need the final security review before beta.

References: [OpenRouter pricing](https://openrouter.ai/google/gemini-2.5-flash-lite/pricing), [Stripe signatures](https://docs.stripe.com/webhooks). Higher tiers are disabled by default; estimates need a fresh comparison before enabling. No model accuracy benchmark was run.
