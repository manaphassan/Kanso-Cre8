---
name: kanso-scope-lock
description: >
  Execution discipline for Kanso Cre8 plan work. Keeps the agent inside the current
  task of docs/MASTER_PLAN.md: one task per commit, a file allow-list, mandatory gates,
  and a stop-and-ask list. Trigger: any execution of MASTER_PLAN phases, "execute phase",
  "run the plan", "fix the flaws", or any multi-step refactor of this repository.
---

# Kanso Scope Lock

## Purpose

Prevent drift. The agent does exactly the task it announced, proves it with a gate, commits, and stops.
This skill outranks speed and cleverness. If unsure, stop and ask.

## Inputs

- `docs/MASTER_PLAN.md` (source of truth for tasks, phases, decisions)
- `docs/ANTIGRAVITY_INSTRUCTION.md` (owner answers to decisions D1..D8)
- `AGENTS.md` (project law)

## Loop (repeat per task)

1. Announce: task ID (for example `P1.4`), the exact files to touch, the acceptance check.
2. Confirm the task is inside the approved phase. If the phase is not approved, stop.
3. Make the smallest change that satisfies the task. Move code before rewriting it.
4. Run the gate:
   - `powershell -ExecutionPolicy Bypass -File .\.agents\skills\kanso-guardian\scripts\verify-kanso.ps1` (0 warned / 0 failed)
   - from `src/app`: `npm run build:client` and `npm test`
5. Commit once: `type(scope): summary` + the required Co-Authored-By line. One task, one commit.
6. Report in 3 lines: what changed, gate result, next task. Do not narrate options.

## Allowed

- Files named in the announced task.
- Deleting code the plan lists for deletion.
- Adding the new files a task explicitly lists (for example `ConfigService.js`, `docs/SCHEMA.md`).

## Forbidden

- New features, new dependencies, new frameworks, new design tokens not in the token map.
- Renaming or moving anything not listed in the task.
- Reformatting files, bulk lint fixes, or "while I am here" cleanups.
- Editing generated output (`dist/`, `target/`, lockfiles except through the package manager).
- Printing or committing secrets, bank details, real client or studio identity.
- Emoji, hardcoded hex colors, mojibake, non-ASCII punctuation in code, docs or commit messages.
- Skipping or weakening a gate, `--no-verify`, deleting tests to make them pass.

## Stop and ask (do not guess)

- Any `DECISION` item whose answer is not recorded in `docs/ANTIGRAVITY_INSTRUCTION.md`.
- Any delete or rewrite inside a user vault directory (anything under a workspace root that is not `sample-workspace`).
- Any git history rewrite, force push, branch deletion, or key rotation.
- A gate that fails twice for the same task.
- A task that seems to need a file outside its allow-list.
- Two plan items that contradict each other, or a plan item that contradicts `AGENTS.md`.

## Out-of-scope findings

Append one line to `docs/PLAN_NOTES.md`: `date | file | observation | suggested task`. Then continue. Never fix it in the same commit.

## Done-when (per phase)

All task commits exist, the phase gate in the plan passes, `docs/PLAN_NOTES.md` is updated, and the agent has asked for "phase N approved" before continuing.

## Self-check before every commit

- Did I touch only announced files? (`git diff --stat`)
- Did I add any dependency, hex color, emoji, or secret? (`git diff | grep`)
- Would the owner be surprised by anything in this diff? If yes, split or ask.
