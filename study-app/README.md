# CCNY Study AI

CCNY Study AI is a student-built study workspace for City College of New York courses. It currently supports major and course selection, a streaming AI tutor, generated flashcards and quizzes, per-course notes, and progress views. It uses Next.js 16, React 19, Supabase Auth, and OpenRouter.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Configure Supabase and OpenRouter server environment variables in your own ignored `.env.local`. Never commit that file. Before using the tutor after Phase 0, apply `supabase/migrations/202610030001_phase0_ai_usage.sql` in your Supabase SQL editor; the tutor fails closed until it is applied.

```bash
npm run lint
npm run build
```

## Current storage and limits

Supabase provides authentication and, after the Phase 1 migration, stores major, courses, notes, flashcards, quiz results, and the compatibility state for chats and preferences. Browser storage is a fast account-scoped cache. Offline packs are planned, not available yet. The tutor requires a signed-in user and uses temporary server-side limits of 5 requests per minute, 60 requests and 80,000 reserved tokens per UTC day. Apply the SQL migrations in order using `docs/tutor-limit-fix-notes.md` and `docs/phase-1-notes.md`. Free models remain in use until the paid-model evaluation phase.

See [FEATURES.md](FEATURES.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the current feature map.
