# Courts Korea repository rules

## Git safety

- Never implement a feature directly on `main`. `main` is the production branch.
- Use `develop` as the integration branch for the next release.
- Start each independent Codex task in its own Git worktree and branch created from `develop`.
- Use `feature/<short-name>` for features and `fix/<short-name>` for bug fixes.
- Before editing, run `git status --short --branch` and confirm that the current worktree contains no unrelated user changes.
- Do not reset, clean, discard, overwrite, or move existing changes without explicit user approval.
- Do not merge, push, deploy, or modify production data unless the user explicitly requests it.

## Integration

- Keep one task per branch. Commit only files that belong to that task.
- Run `npm run build` for web changes.
- Run `./node_modules/.bin/tsc --noEmit` from `apps/mobile` for mobile changes.
- Merge completed and verified feature branches into `develop`.
- Merge `develop` into `main` only for an approved production release.
- Archive the task worktree after its branch has been safely integrated.

## Data and generated files

- Never commit `.env*`, credentials, service-role keys, signing keys, APK/AAB files, build outputs, caches, or temporary database state.
- Treat applied Supabase migrations as immutable. Add a new migration for later schema changes.
- A Git worktree isolates source files only; it does not isolate Supabase, Vercel, Firebase, Expo, ports, or other shared external resources.

See `docs/git-workflow.md` for the human-facing workflow.
