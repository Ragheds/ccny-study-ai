<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Owner working rules

- Follow the phases in the master build brief in order. Work autonomously within a phase. At each phase end, commit, write `docs/phase-N-notes.md`, send a short summary, and wait for "go". "Go all" or "go through Phase N" overrides the pause.
- Make routine engineering decisions and record each in one line in `docs/DECISIONS.md`. Use the brief's defaults. Ask only for credentials, money, destructive changes to user data, non-additive production database changes, or a bug still unresolved after three serious attempts. Batch necessary questions and continue independent work.
- Create one branch per phase and small readable commits. Run `npm run lint` and `npm run build` before completing a phase. Prefer targeted edits; split large components rather than growing them.
- Keep `docs/ARCHITECTURE.md` current and read it before later phases. Write roughly one page of plain-language learning notes per phase.
- Never open, print, or commit `.env.local`. Never expose service-role keys or API keys to client code. Enforce plans, limits, and entitlements on the server.
- Keep chat updates short. The phase-end message should explain what changed, exact ways to try it, untested phone/offline/payment behavior, and any owner action in at most about ten lines.
- Batch related reads and edits. Read the relevant Next.js 16 documentation from `node_modules/next/dist/docs/` before Next.js changes.
