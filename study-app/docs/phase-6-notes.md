# Phase 6

## What changed

BetaTools adds a feedback form, optional account-linked activity counters, privacy/terms drafts and the professor-check reminder. /beta is restricted by server ADMIN_USER_IDS. Migration 8 deduplicates hourly counters, caps feedback and exposes aggregate metrics only to service_role. Error boundaries report categories without study content. docs/BETA-INVITE.md contains invitation copy and owner rollout steps.

## Read first

Read `docs/ARCHITECTURE.md` for the data flow, then the files listed above. Server routes verify a session and use database quotas. Browser checks are convenience only. All new SQL is listed in `docs/MIGRATIONS-TO-RUN.md`; none was applied.

## How to test

1. Apply migration 8 in development. Configure your own ADMIN_USER_IDS. Open /beta as owner; open it as another user and verify 404. Enable counters, visit study home and download a pack; check the session and pack_download rows. Leave counters off on another account and confirm no automatic events.
2. Send a short test feedback; verify it appears in study_feedback. Try six in one day; the sixth must be rejected. Simulate a client rendering failure, verify friendly retry/offline link and only a category counter when opted in.
3. Review Privacy and Terms, add owner contact and retention policy, test account deletion in development, then follow BETA-INVITE.md. No invitations were sent, no provider monitoring account was created, and weekly student activity/retention has not been measured. Metrics are opt-in hourly aggregates, not all users or exact pack-download counts.

## Verification and limits

`npm run lint` and `npm run build` passed on this branch. `.next/static`: 2233 KiB; JavaScript: 1722 KiB. Artifact totals are not page transfer sizes. Lighthouse and real-device performance are not measured: no production or authenticated-device test was performed. Existing macOS SWC WASM fallback warnings remain. No paid AI calls, real payments, production changes, or real-student trials were made. Dependencies need the final security review before beta.
