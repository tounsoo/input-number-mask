@AGENTS.md

@.claude/pstack-models.md

## Claude only

- Skills and agents from the pstack-claude plugin have the `pstack:` prefix. This repo vendors the copy in `.claude/skills/` and `.claude/agents/`, so drop the prefix. A `<plugin>` path means `.claude`. Duet threads follow `.claude/thread-start.md`.
- `Agent` has no `readonly` parameter. Where a skill spawns a subagent with `readonly: true`, tell it in its prompt not to edit files, commit or push.
- GitHub work uses the GitHub MCP tools, not `gh` or the `watch-pr` script.
- Fable runs only where `.claude/pstack-models.md` names it or where Ben approves it in his own message in that run.
- Duet threads: nothing in `.claude/` loads by itself, and the `@` imports above do not expand. Read `AGENTS.md`, then `.claude/pstack-models.md`, then `.claude/thread-start.md`.
