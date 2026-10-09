# Migrations to run (owner checklist)

No migrations were applied by Codex. Test in a separate Supabase development project first. Do not paste development service keys into the browser.

For each file, in order: open your chosen Supabase project → SQL Editor → New query → paste the entire file → Run → check for success before the next file. Keep a database backup before a release. Files are additive; existing data is preserved. Already applied files do not need to run again (the first four policies are not rerunnable).

Already reported applied through Phase 2:
1. `202610030001_phase0_ai_usage.sql`
2. `202610030002_failed_usage_excluded.sql`
3. `202610030003_phase1_data.sql`
4. `202610030004_phase2_study_mode.sql`

New, unapplied:
5. `202610090005_phase3_plans.sql` — plan expiry, signed billing event receipts, atomic invite redemption, plan quota reservation and cost estimates.

After 5, create a beta invite in SQL Editor using a long random code you keep private:
```sql
insert into public.study_invites(code_hash,expires_at,max_uses,pro_days)
values(encode(sha256(convert_to('REPLACE_WITH_A_RANDOM_24_CHARACTER_CODE','UTF8')),'hex'),now()+interval '30 days',50,90);
```
Never commit the actual invite or expose the invites table. Each account redeems once; the database locks redemptions and enforces the usage ceiling. Verify authenticated users can only read their own subscription and cannot write it.

6. `202610090006_phase4_offline.sql` — private packs, device edits, atomic pack course caps and authenticated sync. Verify cross-account pack reads and sync fail.

7. `202610090007_phase5_material.sql` — private source chunks and pack provenance. Original PDF files are not retained.

8. `202610090008_phase6_beta.sql` — opt-in counters and owner feedback. Review retention before beta; owner-only aggregate RPC has no authenticated grant.
