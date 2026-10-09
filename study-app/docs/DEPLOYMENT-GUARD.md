# Review branches without deployment

The repository root and app root contain the same Vercel Git rule: `codex/*` deployments are disabled. Both possible project roots are covered. Other branches keep their existing default. This is repository configuration only; no project settings or production service were changed.

[Vercel documents branch-pattern deployment rules](https://vercel.com/docs/project-configuration/git-configuration). Added before publishing the phase stack so pushes can be reviewed on GitHub without starting Vercel previews. No deploy command was run. Recheck integrations before later enabling a release; independently configured external workflows are outside this repository rule.
