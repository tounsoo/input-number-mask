@AGENTS.md

## Claude only

- Work happens in T3 Code threads (Claude Code) on a branch named `t3/<slug>`. A thread opens a ready pull request into `main`, gets CI green, and has a Gemini 4 Neon review subagent review it, at most 3 rounds.
- Mike, Ben's engineering lead bot, merges only on Ben's word. Threads never merge or force-push, and do not edit `AGENTS.md`, `CLAUDE.md` or `.claude/` outside a pull request Ben approves.
- GitHub work may use `gh` or the GitHub MCP tools.
- Matt Pocock's skills replace any other workflow skills: `tdd`, `diagnosing-bugs`, `code-review`, `pr`, `grill-with-docs`, `to-spec` and `to-tickets`. Prove each change with the repo's `verify` skill, `.claude/skills/verify/SKILL.md`.
- `Agent` has no `readonly` parameter. Where a skill spawns a read-only subagent, tell it in its prompt not to edit files, commit or push.
- Run `pnpm check:self` with the other checks. Home's `standards/self-correcting.md` is the format; this file does not copy it.
