@AGENTS.md

## Claude only

- Work happens in T3 Code threads (Claude Code) on a branch named `t3/<slug>`. A thread opens a ready pull request into `main`, gets CI green, and has a Gemini 4 Neon review subagent review it, at most 3 rounds.
- Mike, Ben's engineering lead bot, merges only on Ben's word. Threads never merge or force-push, and do not edit `AGENTS.md`, `CLAUDE.md` or `.claude/` outside a pull request Ben approves.
- GitHub work may use `gh` or the GitHub MCP tools.
- Matt Pocock's skills replace any other workflow skills. A thread calls them with the `mattpocock-skills:` prefix (`mattpocock-skills:tdd`, `mattpocock-skills:diagnosing-bugs`, `mattpocock-skills:code-review`, `mattpocock-skills:pr` and the others `AGENTS.md` lists). Never call the bare `code-review`, which is Claude Code's built-in. The user-typed skills `AGENTS.md` lists, such as `grill-with-docs`, `to-spec` and `to-tickets`, are Ben's or Mike's to run, so a thread does not invoke them. Prove each change with the repo's `verify` skill, `.claude/skills/verify/SKILL.md`.
- `Agent` has no `readonly` parameter. Where a skill spawns a read-only subagent, tell it in its prompt not to edit files, commit or push.
- Run `pnpm check:self` with the other checks. Home's `standards/self-correcting.md` is the format; this file does not copy it.
