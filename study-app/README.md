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

Supabase provides authentication. Major, saved courses, chats, notes, flashcards, and quiz history are still cached in account-scoped browser storage. Cross-device sync and offline packs are planned, not available yet. The tutor requires a signed-in user and uses server-side limits of 5 requests per minute, 15 requests and 12,000 reserved tokens per UTC day. Free models remain in use until the paid-model evaluation phase.

See [FEATURES.md](FEATURES.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the current feature map.
