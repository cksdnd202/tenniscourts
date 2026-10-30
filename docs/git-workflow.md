# Courts Korea Git workflow

## Branch roles

| Branch | Purpose |
| --- | --- |
| `main` | Production-ready code. Web and app releases start here. |
| `develop` | Integration branch for the next release. |
| `feature/<name>` | One new feature developed in one Codex worktree. |
| `fix/<name>` | One bug fix developed in one Codex worktree. |
| `snapshot/pre-branch-reorg-20261030` | Recovery point containing the accumulated work that existed before this workflow was introduced. |

## Starting a Codex task

1. Open the real repository at `/Users/gangchan-ung/Developer/tennis/tenniscourts`.
2. Start a new Codex chat in **Worktree** mode.
3. Select `develop` as the starting branch.
4. Give the worktree a short task name, such as `facility-tooltip` or `badminton-filter`.
5. Keep that chat focused on that one task.

Codex should create a matching branch such as `feature/facility-tooltip` or `fix/detail-loading`.

## Finishing a task

1. Review the changed files and verify there are no unrelated edits.
2. Run the relevant build or type checks.
3. Commit the task on its feature or fix branch.
4. Merge the verified branch into `develop`.
5. Test the combined `develop` branch.
6. Archive the completed worktree after integration.

## Releasing

1. Confirm `develop` passes web and mobile verification.
2. Merge `develop` into `main` only after release approval.
3. Deploy the web or build the store artifact from `main`.
4. Tag or record the released commit so it can be restored later.

## Important limitation

Worktrees prevent source-code collisions between Codex chats. They do not create separate Supabase databases, Vercel projects, Firebase projects, Expo projects, or app-store releases. Changes to shared services must be coordinated separately.
