# Decisions

- Phase 0: Use a Postgres advisory lock in a service-role-only reservation function so quotas stay consistent across concurrent server instances.
- Phase 0: Reserve estimated input plus the output maximum before an AI call; conservative accounting prevents stream cancellation from avoiding the daily cap.
- Phase 0: Make one OpenRouter attempt per tutor request while usage accounting is introduced; model selection and paid-model pricing belong to Phase 3.
- Phase 0: Use the existing beaver artwork for the 192 and 512 pixel manifest icons to avoid adding a new brand direction.
- Phase 0: Build with webpack because this macOS checkout has only the Next SWC WASM fallback, which Turbopack cannot use.
