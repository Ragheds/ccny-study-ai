# Phase 10

## What changed

SKIPPED: voice conversation is gated on stable Phases 0–9. No microphone, barge-in or voice-turn feature was added. Existing browser narration and typed whiteboard remain available. Migrations, billing, generated lessons, sync on real phones, and the stronger Code model need development-project verification before the gate can pass.

## Read first

Read `docs/ARCHITECTURE.md` for the data flow, then the files listed above. Server routes verify a session and use database quotas. Browser checks are convenience only. All new SQL is listed in `docs/MIGRATIONS-TO-RUN.md`; none was applied.

## How to test

Before resuming Phase 10: apply migrations 5–8 in a development project; verify unauthenticated/quota/cross-account requests; run Stripe test checkout and duplicate/out-of-order webhooks; test packs and queued edits in airplane mode on iPhone and Android; run the 20 algebra questions against generated lessons; verify Code entitlements/caps after setting a budget; resolve dependency advisories. Then test microphone permission denial, unsupported browser, transcript correction, interruptions and first-response latency on both phones. None of these stability gates was claimed passed.

## Verification and limits

`npm run lint` and `npm run build` passed on this branch. `.next/static`: 4546 KiB; JavaScript: 2736 KiB. Artifact totals are not page transfer sizes. Lighthouse and real-device performance are not measured: no production or authenticated-device test was performed. Existing macOS SWC WASM fallback warnings remain. No paid AI calls, real payments, production changes, or real-student trials were made. Dependencies need the final security review before beta.
