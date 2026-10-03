# Phase 0 — safety, hygiene, baseline

## What changed

The tutor API now checks the Supabase user before parsing a request. A signed-in call reserves a quota row in Supabase before OpenRouter is contacted. A database transaction lock makes parallel requests for the same user count together. The limits are currently 5 calls per rolling minute, 15 calls per UTC day, and 12,000 reserved tokens per UTC day. History is trimmed to eight messages, each at most 2,000 characters; user messages are limited to 8,000 characters. Each AI call records its feature, model, token counts, status, and a zero cost estimate for the current free models. The app returns a friendly daily-limit message.

The manifest now points to real 192 and 512 pixel icons. The README and feature list describe the current app. The dashboard got a Suspense boundary because its existing `useSearchParams` call prevented a production build. Existing uncommitted layout work was preserved.

## Apply the additive database change

1. In the Supabase project dashboard, open **SQL Editor**.
2. Paste and run `supabase/migrations/202610030001_phase0_ai_usage.sql`.
3. Confirm `public.ai_usage` has RLS enabled and `public.reserve_tutor_usage` exists. The function is executable only by the service role.
4. Ensure the deployment has server-side `SUPABASE_SERVICE_ROLE_KEY`, plus its existing Supabase and OpenRouter configuration. Do not expose the service-role key in `NEXT_PUBLIC_` variables.
5. Sign in and send one tutor prompt. Check `ai_usage` for a row with your user ID, feature, model, input/output tokens, and completed status. Send anonymous `POST /api/tutor` and expect 401. Quota reservation fails closed with 503 until the SQL is applied.

The SQL was not applied to the remote Supabase project from this workspace, so live signed-in logging and cap behavior remain to be verified after step 2. The database update is additive; no existing user data is deleted.

## Security check

`.env.local` is ignored by Git. No `.env.local` path appeared in reachable Git history. This does not prove it was never exposed elsewhere. If any environment file or secret was ever committed or shared, rotate the OpenRouter key, Supabase service-role key, and any other private credentials in that file; public Supabase URL and publishable key are not secrets. Never paste the file into an issue or chat.

## Baseline and verification

- `npm run lint`: pass, 0 warnings.
- `npm run build`: pass using webpack. Turbopack cannot run here because the native macOS SWC binding is absent; the build script now selects webpack. The existing Google Fonts fetch needs network access.
- Anonymous request to the production server: HTTP 401, `Sign in to use the tutor.`
- Lighthouse mobile performance on local production **landing page** (`/`): score 87, LCP 3.93 s, FCP 0.91 s, TBT 1 ms, CLS 0. The LCP misses the 2.5 s product target. INP requires real interaction and was not measured. Signed-in dashboard and real phone performance were not measured.
- Production `.next/static` size: 2,308 KiB; JavaScript chunks in `.next/static/chunks`: 1,752 KiB. These are total build artifacts, not per-page transfer sizes.
- Icon dimensions: 192×192 and 512×512.

## Read first

Read `app/api/tutor/route.ts` for the request flow, then `supabase/migrations/202610030001_phase0_ai_usage.sql` for the atomic reservation. `docs/ARCHITECTURE.md` maps the rest of the app. Phase 1 moves learning data out of browser-only storage.
