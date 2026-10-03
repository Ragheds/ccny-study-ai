# Tutor limit and fallback fix

## Apply the SQL change

1. Open the same Supabase project used by the deployed app, then open **SQL Editor**.
2. Create a new query, paste the complete contents of `supabase/migrations/202610030002_failed_usage_excluded.sql`, and run it once. Do not re-run the older `202610030001` migration.
3. Verify `reserve_tutor_usage` still exists and `ai_usage` rows remain. The function now excludes `status = 'failed'` from UTC-day request and reserved-token totals. The rolling-minute count still includes every row.
4. Deploy the branch containing the matching API change. A failed tutor request should leave one `ai_usage` row marked `failed`, then allow another request after the minute cap clears. A successful fallback should leave one `completed` row whose `model` is the model that answered.

The temporary limits are in `lib/tutorLimits.ts`: 60 requests per UTC day, 80,000 reserved tokens per UTC day, and 5 requests per rolling minute. Phase 3 will replace them with plan limits. All fallback attempts for one student prompt share one reservation and one usage row.
