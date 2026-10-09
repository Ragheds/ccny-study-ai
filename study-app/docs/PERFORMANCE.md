# Performance and demo verification

Targets on a mid-range Android with Slow 4G: LCP <2.5 s, INP <200 ms, CLS <0.1. These are release targets, not measured claims. Lighthouse and React Profiler were not available through the browser testing surface; authenticated pages, phone audio and real-device frame rate remain unmeasured. Run Lighthouse in Chrome DevTools on a development release (three mobile runs, median score), then record the React Profiler trace while streaming and switching modes.

Every phase note records total `.next/static` and JS artifact sizes. Totals include lazy chunks and font files and are not first-page transfer sizes. Phase 11 additionally runs `npm run check:bundle`: all JS chunks gzip total must stay below 900 KiB, any one gzip chunk below 120 KiB. Current result: 750 KiB total and 101 KiB largest. This is a regression budget set around the current artifact, not proof of phone performance. Graphs now use the number-only mathjs entry; graph/KaTeX/markdown/workspaces remain lazy-loaded.

Local production demo browser check: 360px viewport, content width 360px, equation and two graphs rendered, Next control and flashcard reveal worked, no console errors/warnings. No real phone or offline narration was tested. `/demo` uses prepared text and local graph evaluation and does not mount account/auth/sync services. The browser test build explicitly disabled public Supabase configuration.

Keyboard focus is visible, workspace controls have a 44px minimum height, all animation/transition rules honor reduced motion, chat updates remain frame-batched and follow only near the bottom. AITutor was reduced to 394 lines by extracting UI and transport modules. Whiteboard pauses reveal animations with narration; tick labels use readable numbers and a normal text font.

Provider estimates: the cheap fallback uses [Ministral 3 3B](https://openrouter.ai/mistralai/ministral-3b-2512), currently $0.10/M input and output. Primary/tier estimates are centralized in server-only `lib/models.ts`; no paid calls or comparative accuracy tests were made. Fallback behavior is tested with a local mock and one usage completion.

Deployment guard reference: [Vercel Git deployment configuration](https://vercel.com/docs/project-configuration/git-configuration) supports branch patterns. The `codex/*` rule prevents automatic Git deployments of this review stack. No deploy command was run.
