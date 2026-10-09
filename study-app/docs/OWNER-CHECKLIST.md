# Owner checklist after Phase 11

## Configuration (development first)

Use `.env.example` as the list of names. Add your development Supabase URL, publishable key and server-only service-role key, a development OpenRouter key, `sk_test_` Stripe key, test webhook signing secret, localhost `APP_ORIGIN`, and your development auth UUID in `ADMIN_USER_IDS`. Never put server keys in a `NEXT_PUBLIC_` variable. Keep `AI_ENABLE_HIGHER_TIERS=false` until you set an AI budget. Code generation intentionally remains gated; ordinary chat and typed boards use the cheap model.

Use a separate development database. For a fresh database apply migrations 1–8; for the already-updated project only the unapplied files 5–8 are new. Exact SQL Editor steps and invite creation SQL are in `MIGRATIONS-TO-RUN.md`. None was run by Codex. After migration 5, check Free/Pro expiry and invite redemption; after 6, test cross-account RLS and offline sync; after 7, test private sources and deletion; after 8, check analytics opt-in and owner-only metrics.

## Required manual tests

- Auth/quota: anonymous requests fail; Free cannot access Whiteboard/Code; failed requests release daily totals but still count per minute; simultaneous requests cannot exceed caps. Test model 429/5xx/no-body fallback and verify one usage row records the answering model. Never send course content to a production endpoint for testing.
- Billing: use Stripe CLI forwarding to `/api/billing/webhook`, test card `4242 4242 4242 4242`, future date and any CVC. Check checkout, cancellation, expiry, duplicate and out-of-order webhook events. No real payments.
- Devices: sign in on two devices; switch courses across Chat/Whiteboard/Notes/Code, including an ineligible `?tab=code`. Let course selection sync before Code. Forge browser course values: they must never grant Code access.
- iPhone and Android: install the development PWA, download a generated and an uploaded pack, close/reopen in airplane mode, review cards, answer a quiz, edit notes and replay a saved lesson. Reconnect, confirm sync once, and confirm notes on a second device. Test a newer edit during sync, failed sync and account switching. Detailed audio spike, screen-lock and caption fallback steps: `phase-4-notes.md`.
- Material: small text PDF, scanned PDF, 5 MB boundary, >100 pages, missing Content-Length, too much extracted text, pasted prompt injection, incorrect source quotes, account privacy and deletion. Disconnected devices cannot be remotely erased until they reconnect; clearing device storage removes their copy.
- Whiteboard: run all 20 questions in `lib/whiteboard/algebraCases.ts` against the model; compare points, slope, roots, intercepts and asymptotes. Unit fixtures verify renderer arithmetic, not model accuracy. Check invalid NDJSON repair/fallback, free cache replay, caption/voice timing, pause, next/previous, themes and speed.
- Code: after setting a budget, enable higher tiers in development. Check hints first, solution only after an attempt, server saved-course eligibility, stale selection, Free denial and ten Pro requests/day. Judge the model on actual assignments before releasing it.
- Accessibility/performance: keyboard-only, screen reader, light/dark, reduced motion, 360px layout, Slow 4G on a mid-range Android. Measure Lighthouse and React Profiler; targets and local artifact measurements are in `PERFORMANCE.md`. Real-device targets are still unverified.

## Demo and release

Run `npm ci`, `npm run lint`, `npm run test`, `npm run build`, `npm run check:bundle`, `npm run start`. Open `/demo`; it has prepared lessons, a flashcard and computed graphs, with no AI/auth/billing/sync calls. Narration uses a browser voice and captions remain visible. The normal configured build is still required for signed-in development tests; the last isolated browser-test build had public Supabase configuration disabled deliberately.

Review privacy and terms drafts, add support contact and a retention schedule, then use `BETA-INVITE.md` to invite 20–50 commuters and interview ten. No invitations were sent and there are no real weekly-use metrics yet. Activity counters are opt-in and deduplicated by hour, not exact session/download totals.

Merge sequentially: Phase 3 → 4 → 5 → 6 → 7 → 8 → 9 → Phase 10 skip notes → 11. Review the complete Phase 11 stack before any deployment: earlier branches predate security and usability fixes. `codex/*` branches have Vercel Git deployments disabled to allow GitHub review without preview deployment. Keep Phase 10 skipped until stability checks pass. Phase 12 has not started.

## Remaining limitations

Production dependency audit: zero advisories after Next 16.4.0 and compatible fixes. Five development-only advisories remain in the `eslint-config-next` → `fast-glob` → `micromatch` → `braces` chain. The registry offers a breaking downgrade to Next 14's lint config, not a compatible patch; do not force it. Recheck advisories before beta.

Pro's offline allowance is currently a generous 1,000 distinct courses, not literal unlimited storage; tune server plan placeholders after real usage. A worker/process crash can leave a pending pack reservation; inspect pending rows in development if a course slot is stuck. The owner must verify SQL/RLS, Stripe, paid models, real-phone behavior and retention before claiming beta readiness or stability.
