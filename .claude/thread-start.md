# Thread start

A Claude Duet thread reads this page after `CLAUDE.md`. The thread starts outside the repository, so nothing in `.claude/` loads by itself: no hook, no agents, no skills, and no `@` import. Read `AGENTS.md` and `.claude/pstack-models.md` as files. This page says how to use the checked-in pstack copy. It does not download pstack.

## 1. pstack is already here

[pstack-claude](https://github.com/michael-denyer/pstack-claude) is checked in at the `pin=` line in `.claude/update-pstack.sh`. Its skills are in `.claude/skills/`, its agents in `.claude/agents/`, and its licenses in `.claude/skills/poteto-mode/references/licenses/`. `.claude/pstack-files.txt` lists the skills and agents the copy holds. The repository's own `verify` skill is the one skill there that is not pstack's.

Do not download or install pstack, and do not run `update-pstack.sh`. The weekly `pstack update` workflow opens a pull request when upstream changes. If something in the copy looks out of date, say so in the reply.

## 2. Read pstack the way this repository needs

pstack is written for a plugin install, so these adaptations apply to every thread.

- **Skills.** The `Skill` tool does not list the checked-in skills in a thread. Where pstack names a skill, as `pstack:<name>` or by its name, read `.claude/skills/<name>/SKILL.md`. A `<plugin>` path means `.claude`. A skill that ships with Claude Code is not in the copy. Use it when the session has it, and say so when it does not.
- **Skip these skills:** `babysit`, `fix-ci`, `fix-merge-conflicts`, `get-pr-comments` and `setup-pstack`. They are not in the copy. Home's `playbooks/review-before-pr.md` and `playbooks/waiting-on-ci.md`, with the repo lines in `AGENTS.md`, replace them. The `babysit` and `opening-a-pr` playbooks under `.claude/skills/poteto-mode/playbooks/` stay, and those overlays change them. Read `.claude/pstack-models.md` before the first `Agent` call. The sheet names no Fable role.
- **Agents.** The thread registers no agent types from `.claude/agents/`. Where a skill spawns `pstack:poteto-agent` or another agent in that folder, spawn `subagent_type: "general-purpose"` and start its prompt with the text of `.claude/agents/<agent>.md` below its frontmatter. For `poteto-agent`, also give the absolute path of `.claude/skills/poteto-mode/SKILL.md`. Tell every stand-in that a skill its text names is at `.claude/skills/<name>/SKILL.md`, and that it reads GitHub through the GitHub MCP tools, not `gh`.
- **Effort.** The vendored poteto-mode skill sets a reasoning level by switching `subagent_type` to an effort agent, `effort-<level>` or `poteto-agent-<level>`. A thread does not register those types. Pass the level as the `effort` field of the `general-purpose` call instead. The model you pass still decides the model.
- **Read-only subagents.** `Agent` has no `readonly` parameter. Where a skill spawns one with `readonly: true`, tell it in its prompt not to edit files, commit or push.
- **Subagents and pull requests.** The thread's own session does every write to a pull request: opening, pushing, replying, marking ready or draft, and subscribing. Say that in every subagent's brief. A subagent commits on its own worktree branch and returns. Its worktree never goes into a commit. The thread's session brings that work into its own branch before the review round. Nobody hard-resets the session's branch, whatever pstack says, because that drops commits not yet pushed.
- **One pull request per thread.** Where the work needs more than one, tell Ben it needs one thread per pull request and wait.
- **Verify.** The verify skill is `.claude/skills/verify/SKILL.md`. Where pstack names the project `verify` skill or `/create-verification-skill`, read that file. Cursor uses the same file. There is no `.cursor/skills/verify/`.
- **Scripts.** Scripts under `.claude/skills/` come from upstream, and the session may block them. When one is blocked, work without it and say so.
- **Briefs.** Write each subagent brief from `.claude/task-prompt.md`, and keep its Rules part.
- **Precedence.** Ben's direct requests, `CLAUDE.md` and `AGENTS.md` take precedence over pstack. Home's overlays win where they replace a pstack step, so opening a pull request starts a babysit in `drive` mode. The thread's own session runs the review round and drives the pull request. Status comes from GitHub MCP reads. Git follows home's `standards/git.md`.

This repo has no `.agents/playbooks/`. Do not run `check-playbooks.mjs` against home's review and CI playbooks. If a quoted anchor in those files is missing from this pin's `opening-a-pr.md` or `babysit.md`, tell Ben which line and do not guess where the change belongs.

## 3. Choose the route

Follow poteto-mode, read in full at `.claude/skills/poteto-mode/SKILL.md`, when a task touches more than one file or changes a signature other files call, involves a design or architecture choice, or is a bug whose cause is not yet known, or a performance issue. When the intent is already specific, enter that skill directly: `tdd`, `architect`, `how`, `why`, `arena` or `interrogate`. For a smaller task, such as a contained change to one file with an obvious test, a question, or a one-line edit, work directly and verify on the real artifact.

A task that opens a pull request, or pushes new work to one, follows home's `playbooks/review-before-pr.md` and `playbooks/waiting-on-ci.md` with the repo lines in `AGENTS.md`, together with the pstack playbooks they change.

When the task names an existing pull request, read it first. If it is open, work on its head branch. If you cannot push there, tell Ben and do not open a replacement. If it merged or closed, tell Ben and ask before opening a new one.
