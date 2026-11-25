# Task prompt template

Use this template for every brief that starts work on input-number-mask in a T3 Code thread, and for the brief a thread gives a subagent. The reader knows only what the brief says, so fill each part or write "None". Delete the comments, and keep every line that is not a comment.

```md
# <Title>

## Why

<!-- Ben's words for what he wants, quoted, then one sentence on the problem it solves. -->

## Task

<!-- The change, as files, behaviors, or a pull request number. Say what to leave alone and what earlier work already settled. -->

- Repo: tounsoo/input-number-mask. Read `AGENTS.md` and `CLAUDE.md` first.
- Base: `main`
- Branch: `t3/<slug>`

## Promised behaviors

<!--
A numbered list of results Ben can check. For a code change, name the change type from
`.claude/skills/verify/SKILL.md` and say that the verify run on the final commit ends PASS,
or that each BLOCKED step is listed in the pull request.
-->

1.

## Rules

- One pull request on the branch above into `main`, opened ready for review. This repo has no pull request template. The body follows tounsoo/home `standards/pull-requests.md` and the `pr` skill.
- Git follows tounsoo/home `standards/git.md`. Never merge, force-push or rebase pushed history. To bring in the base, merge `origin/main`. Mike merges only on Ben's word.
- Changes to `AGENTS.md`, `CLAUDE.md` and `.claude/` need Ben's yes.
- `gh` and the GitHub MCP tools are both fine.
- After pushing, watch CI on the head commit until it concludes, and fix failures. The Gemini 4 Neon review subagent reviews the pull request, at most 3 rounds.
- A subagent does not open, push to or comment on a pull request. It commits on its own branch and reports its commit SHA.

## Report

<!--
What to send back: the pull request link, the tested commit, the CI state, the review result,
and any question only Ben can answer. A subagent reports its commit SHA, the commands it ran
with their results, and what it could not do, with the reason.
-->
```
