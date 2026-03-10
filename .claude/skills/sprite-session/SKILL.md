---
name: sprite-session
description: Use this skill at the beginning and end of a coding session in a Sprite VM. At session start, it checks out main and pulls latest. At session end, it ensures tests pass, commits on a branch, and creates a PR. Invoke this skill when the user starts a session, says they're done, wants to wrap up, or asks to create a PR for their work.
---

# Sprite Session Workflow

This skill manages the lifecycle of a coding session in a Sprite VM.

## Session Start

When starting a new session, perform these steps in order:

1. **Checkout main and pull latest:**
   ```
   git checkout main && git pull
   ```
2. **Confirm clean state** by running `git status`. If there are uncommitted changes, warn the user before proceeding.
3. **Ask the user** what they'd like to work on this session.

## Session End

When the user indicates they are done, wants to wrap up, or asks to commit/PR their work:

1. **Run all tests** to make sure everything passes:
   - `mix test`
   - `npm run test --prefix assets`
   If tests fail, fix them before proceeding. Do NOT create a PR with failing tests.

2. **Create a descriptive branch name** based on the work done (e.g., `feature/add-user-avatars`, `fix/chat-scroll-bug`). Use kebab-case with a conventional prefix (`feature/`, `fix/`, `refactor/`, `chore/`).

3. **Create the branch and commit:**
   ```
   git checkout -b <branch-name>
   ```
   Stage relevant files (prefer specific files over `git add -A`), then commit with a clear message summarizing the work.

4. **Push and create a PR:**
   ```
   git push -u origin <branch-name>
   ```
   Then create a PR using `gh pr create` targeting `main` with:
   - A concise title (under 70 characters)
   - A body with a summary of changes and a test plan

5. **Return the PR URL** to the user so they can review it.

## Important Notes

- Always run the code review skill (`/code-review`) before wrapping up if new feature work was done.
- If the user hasn't indicated what to do, ask — don't assume session start vs. end.
- Create a checkpoint before creating the PR branch, so the user can restore if needed.
