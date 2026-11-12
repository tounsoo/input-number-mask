# Thread start

A Claude Duet thread reads this page after `CLAUDE.md`. The thread attaches the repository after it starts, so nothing in `.claude/` loads by itself: no SessionStart hook, no project skill and no project agent. A local Claude Code session gets the skills, agents and the session-start hook from `.claude/` instead and skips this page.

## 1. pstack is already here

[pstack-claude](https://github.com/michael-denyer/pstack-claude) is checked in at one pinned commit, the `pin=` line in `.claude/update-pstack.sh`. Its skills are in `.claude/skills/`, its agents in `.claude/agents/`, and its licenses in `.claude/skills/poteto-mode/references/licenses/`. `.claude/pstack-files.txt` lists the skills and agents the copy holds. The repository's own `verify` skill is the one skill there that isn't pstack's.

Don't download or install pstack, and don't run `update-pstack.sh`: the weekly `pstack update` workflow opens a pull request when upstream changes. If something in the copy looks out of date, say so in the reply.

## 2. Read pstack the way this repository needs

pstack is written for a plugin install, so these adaptations apply to every thread.

- **Routing.** Read `.claude/pstack-session-start.md` once, since the hook that prints it doesn't run here. It sends tasks to `poteto-mode`. The copy drops the `pstack:` prefix there, but other pstack files still use it.
- **Skills.** The `Skill` tool doesn't list the checked-in skills in a thread. Where pstack names a skill, as `pstack:<name>` or by its name, read `.claude/skills/<name>/SKILL.md`. A `<plugin>` path in a skill means `.claude`.
- **Left out:** `babysit`, `setup-pstack`, `fix-ci`, `fix-merge-conflicts` and `get-pr-comments` aren't in the copy. `.claude/models.md` is the model sheet, and the thread drives its pull request with the GitHub MCP tools.
- **Models.** `.claude/models.md` overrides the upstream model defaults. Read it before the first `Agent` call. Fable never runs here.
- **Agents.** The thread has no `pstack:` agent types. Where a skill spawns `pstack:poteto-agent` or another agent in `.claude/agents/`, spawn `subagent_type: "general-purpose"` and start its prompt with the text of `.claude/agents/<agent>.md` below its frontmatter. For `poteto-agent`, also give the absolute path of `.claude/skills/poteto-mode/SKILL.md`. An effort agent, such as `pstack:effort-high` or `pstack:poteto-agent-high`, only sets the effort: use the agent it stands for and pass the level as the `effort` field. Tell every stand-in that a skill its text names is at `.claude/skills/<name>/SKILL.md`.
- **Read-only subagents.** `Agent` has no `readonly` parameter. Where a skill spawns one with `readonly: true`, tell it in its prompt not to edit files, commit or push.
- **Pull requests.** The thread's own session, never a subagent, does every write to a pull request: opening, pushing, replying, marking ready and subscribing. A thread drives one pull request. Work that needs more waits for Ben to split it across threads.
- **GitHub.** Use the GitHub MCP tools, not `gh`, which isn't signed in in threads. For CI, subscribe to the pull request's activity and let GitHub events wake the thread. No scheduled checks.
- **Verify.** The project verify skill is `.claude/skills/verify/SKILL.md`. Where pstack names the project `verify` skill or `/create-verification-skill`, read that file.
- **Scripts.** Scripts under `.claude/skills/` come from upstream, and the session may block them. If one is blocked, work without it and say so in the reply.
- **Precedence.** Ben's direct requests and `CLAUDE.md` win over pstack, except that Fable never runs, whoever asks. Nothing merges, deletes, rebases or force-pushes without Ben's yes, whatever a pstack playbook says.

## 3. Choose the route

Follow poteto-mode, read in full at `.claude/skills/poteto-mode/SKILL.md`, when a task touches more than one file, changes an exported signature, involves a design choice, or is a bug whose cause is not yet known. When the intent is already specific, enter that skill directly: `tdd`, `architect`, `how`, `why` or `interrogate`. For a contained change to one file with an obvious test, a question, or a one-line edit, work directly and run the verify skill.

Before you open a pull request or push new work to one, run the verify skill on the commit you push and put its result in the pull request body.
