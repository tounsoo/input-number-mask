# Agent notes

This file is for anyone changing `@tounsoo/input-number-mask`, including agents. It holds the rules that are specific to this repo.

## How work happens

- Work happens in T3 Code threads (Claude Code) on Ben's machine, each on a branch named `t3/<slug>`. A Cursor cloud agent is a fallback only.
- A thread opens a ready pull request into `main`, gets CI green, and has a Gemini 4 Neon review subagent review it, at most 3 rounds.
- Mike merges only on Ben's word. Threads never merge or force-push, and do not edit `AGENTS.md` or `CLAUDE.md` outside a pull request Ben approves.
- Threads may use `gh` and the GitHub MCP tools.
- Matt Pocock's skills (mattpocock-skills) are the workflow skills: `tdd`, `diagnosing-bugs`, `code-review`, `pr`, `grill-with-docs`, `to-spec` and `to-tickets`. They come from the user's install, not this repo. This repo keeps only its own `verify` skill in `.claude/skills/verify/`.

## Home repo

Shared rules live in Ben's home repo, [tounsoo/home](https://github.com/tounsoo/home) (private). Use `/agent/repos/home` when that directory exists (a Cursor cloud environment). Otherwise use `~/repos/home` (a local session). Clone `https://github.com/tounsoo/home.git` there when it is missing. Only when neither path works, read the same files through `gh` or the GitHub MCP tools (owner `tounsoo`, repo `home`, branch `main`). Read them before opening or driving a pull request:

- `AGENTS.md` there: the memory split and the learnings ladder. A fact in this file overrides home.
- `CLAUDE.md` there: the Claude-only lines. This repo's `CLAUDE.md` adapts them.
- `standards/git.md` and `standards/pull-requests.md`
- `playbooks/review-before-pr.md` and `playbooks/waiting-on-ci.md`. The **Repo lines** below fill those in.

`@tounsoo/input-number-mask` is a small React 19 library: two components (`InputNumberMask`, `InputNumberMaskContentEditable`) and two hooks (`useInputNumberMask`, `useContentEditableMask`), exported from `src/index.ts`. Storybook is the docs site and the browser test bed.

## Set up

Use Node 24, the version CI runs. The repository does not pin it: there is no `.nvmrc` and no `engines` field. Install pnpm with Corepack so the version matches `packageManager` in `package.json`, then run `pnpm install --frozen-lockfile`.

## Commands

What each check guards is the [rule table](#rule-table). Operational notes:

- `pnpm typecheck` runs `tsc -b`. It type-checks the app and node configs (`tsconfig.app.json`, `tsconfig.node.json`), stories and tests included. CI does not run it on its own.
- `pnpm check:self` is the `self` row. The formats are home's [self-correcting standard](https://github.com/tounsoo/home/blob/main/standards/self-correcting.md).
- `pnpm test` runs Vitest with `vitest.config.ts` in headless Chromium through `@storybook/addon-vitest`, so the stories' play functions run as tests. It needs Playwright's Chromium (`pnpm exec playwright install chromium`). CI does not run it.
- `pnpm test:coverage` writes a coverage report to `coverage/`, which is gitignored.
- `pnpm check:package` needs `pnpm build:lib` first.
- `node scripts/check-claude-docs.mjs` runs the `Claude docs` check on the committed branch against `origin/main`. Fetch `origin/main` first. CI runs it on every pull request in `.github/workflows/claude-docs.yml`, and again when a label changes. Conventions says what it checks. It is not a required status check.
- `pnpm storybook` starts Storybook on port 6006.
- `pnpm build`, `pnpm dev` and `pnpm preview` are left over from the Vite app template. There is no `index.html`, so `pnpm build` fails after `tsc -b`. Use `build:lib` for the package and Storybook for a running page.

## Verify

Prove every change with [`.claude/skills/verify/SKILL.md`](.claude/skills/verify/SKILL.md). The skill says which of its steps the change needs, and it ends in PASS, FAIL or BLOCKED. Cursor and Claude use this same skill. There is no `.cursor/skills/verify/`.

## Repo lines

These fill the **Repo lines** in home's `playbooks/review-before-pr.md` and `playbooks/waiting-on-ci.md`.

- Base branch: `main`.
- Checks, in this order: `pnpm lint`, `pnpm typecheck`, `pnpm test:ci`, `pnpm check:self`, `pnpm build:lib`, `pnpm check:package`, `pnpm build-storybook`, `pnpm lint` again, then `node scripts/check-claude-docs.mjs` after `git fetch origin main`. The CI `Test` job runs `pnpm lint`, `pnpm test:ci`, `pnpm build:lib`, `pnpm check:package`, and, on a pull request, `pnpm build-storybook`. The `rule-checker` job runs `pnpm check:self`. Neither runs `pnpm typecheck` or the Claude docs script. Run the verify skill on the commit that ends the review round.
- Dependents to pass as context: importers of a changed export from `src/index.ts` (`InputNumberMask`, `InputNumberMaskContentEditable`, `useInputNumberMask`, `useContentEditableMask`, and their exported prop and return types). Also `README.md`, the stories in `src/stories/` that describe the changed behavior, and the tests that cover it. This repo is a single package.
- Push builds a preview: no. A pull request builds Storybook inside `Test` and does not publish it. GitHub Pages updates from `main` only, in `Build and Deploy Storybook`.
- Drafts: allowed, and `Test` runs on a draft. A thread opens its pull request ready for review.
- Required checks: `Test` and `rule-checker`. The ruleset `Standard Branch Protection` on the default branch requires both. `CLAUDE.md and verify skill` is not in the ruleset, so it does not block merge. A failure there still needs a fix.
- Regenerate after a merge of `origin/main`: nothing. `dist/` and `storybook-static/` are gitignored. The Release workflow on `main` opens the "chore: version packages" pull request from `.changeset/` and publishes when that pull request merges.
- Pull request body: this repo has no `.github/pull_request_template.md`. Use the three sections in home's `standards/pull-requests.md`.

The `self` row is `pnpm check:self`. Formats are home's [self-correcting standard](https://github.com/tounsoo/home/blob/main/standards/self-correcting.md).

## Rule table

Tier: T0

| ID | Rule | Enforcer | Evidence | Status |
| --- | --- | --- | --- | --- |
| lint | ESLint | `pnpm lint` | 90adf6c7a8a0475716cb545775d7b263b6ab6328 | seeded |
| typecheck | Typecheck | `pnpm typecheck` | #34 | seeded |
| test-ci | Unit tests | `pnpm test:ci` | 2714c428c7101235d383b595f591baae6bd43ae1 | seeded |
| browser-test | Browser story tests | `pnpm test` | 90adf6c7a8a0475716cb545775d7b263b6ab6328 | seeded |
| build-lib | Library build | `pnpm build:lib` | f71c702b0371a4686c15bc3e7082d3772e5322ea | seeded |
| check-package | Package entries | `pnpm check:package` | #29 | seeded |
| build-storybook | Storybook build | `pnpm build-storybook` | 90adf6c7a8a0475716cb545775d7b263b6ab6328 | seeded |
| consumer-smoke | Packed package smoke | `.claude/skills/verify/consumer-smoke.mjs` | #34 | seeded |
| claude-docs | Claude docs check | `scripts/check-claude-docs.mjs`, `.github/workflows/claude-docs.yml` | #41 | seeded |
| ci-test | CI Test job | `.github/workflows/ci.yml` | df47da8dc472741fbbc70598ccf19898bf420209 | seeded |
| storybook-pages | Storybook Pages workflow | `.github/workflows/build-storybook.yml` | be2d1bc1baf52a6186517ed4c3c073ff7ec4c0a7 | seeded |
| release | Release workflow | `.github/workflows/release.yml` | 4339ba83111445c38bc2896473b122feceb3f21e | seeded |
| self | Rule table, weeds log and suppressions | `pnpm check:self` | #43 | seeded |

## Conventions

- A change that ships in the package carries a changeset: `pnpm changeset`, then commit the file in `.changeset/`. A change to tests, stories, CI, `AGENTS.md`, `CLAUDE.md` or `.claude/` alone needs none. The release workflow opens a "chore: version packages" pull request from the changesets and publishes to npm when that pull request merges.
- Only `dist/`, `README.md` and `LICENSE` ship (`files` in `package.json`).
- `README.md` and the stories in `src/stories/` are the public docs. Keep them in step with the exports.
- Git follows home's `standards/git.md`. This repo's base branch is `main`.
- A change to `AGENTS.md`, `CLAUDE.md` or anything in `.claude/` needs Ben's yes. Home's `standards/git.md` covers the shared half of that rule. The `.claude` entry in the `ignores` list in `eslint.config.js` is part of it: ESLint does not lint `.claude/`.
- A pull request that adds a page, a section or a check also changes `CLAUDE.md` and the verify skill (`.claude/skills/verify/`) in the same pull request. `scripts/check-claude-docs.mjs` fails it otherwise. Ben's yes to those `.claude/` changes comes with the merge ask. The check compares totals at the merge base and at the head, so only a higher total counts. Renaming a file, heading, job or step does not, and neither does adding one heading while removing another. A file renamed into the stories globs, or a job moved into a pull request workflow, does. The check runs the pull request's own copy of the script, so it is a reminder rather than a gate: review changes to `scripts/check-claude-docs.mjs` and `claude-docs.yml` by hand.
  - A page is a Storybook file matching the `stories` globs in `.storybook/main.ts`: `src/**/*.mdx` and `src/**/*.stories.{js,jsx,mjs,ts,tsx}`. It counts when there are more of them.
  - A section is a heading in `README.md` or a `src/**/*.mdx` file. The script parses both with Storybook's own MDX compiler: `README.md` as CommonMark, skipping leading front matter, and `.mdx` as MDX, the way Storybook parses the page. Headings in lists, quotes and HTML elements such as `<div>` count. Headings inside a component such as `<Canvas>`, which may not render its children, do not, and neither do lines in code, HTML blocks, comments or JSX expressions. An `.mdx` file that does not compile, for example one with an HTML comment (MDX takes only `{/* */}`), is left out on both sides, with a warning when it is broken at head. It counts when there are more headings in total.
  - A check is a job or a step in a workflow that runs on `pull_request` or `pull_request_target`. It counts when those workflows have more jobs or more steps in total. A new test file is not a check: `pnpm test:ci` already runs it.
  - The check only asks that both changed. Make the change useful: for a page or a section, update the feature map in `.claude/skills/verify/features/`. For a check, update the commands here and step 1 of the verify skill.
  - The `skip-claude-docs-check` label passes the check with a warning, for a true false positive. Only Ben adds or removes it. Agents never do. Name the false positive in the merge ask instead. Nothing checks who added it. The label skips every run while it stays on the pull request, so remove it once the false positive is past.
- Where these instructions and the code disagree, follow the code, as home's `AGENTS.md` says, and list each mismatch in the pull request.

## Agent files

- `.claude/` holds only the `verify` skill and the brief template `.claude/task-prompt.md`.
- This repo has no `.agents/playbooks/`. The weeds log is `.agents/weeds.tsv` and the suppression baseline is `.agents/suppression-baseline.json`. Appending a weeds row needs no yes. Repo-specific procedure stays in this file. Home's review and CI playbooks are read from the home checkout named above. They are not copied.

## Where the tools look

- Claude Code reads `CLAUDE.md`, which imports this file, and loads the `verify` skill from `.claude/skills/`.
- A Cursor cloud agent (the fallback) reads this file. This repo has no `.cursor/` directory. The verify skill stays at `.claude/skills/verify/SKILL.md`.
- Briefs use `.claude/task-prompt.md`.
