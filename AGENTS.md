# Agent notes

This file is for anyone changing `@tounsoo/input-number-mask`, including agents. It holds the rules that are specific to this repo. Shared rules live in Ben's home repo, [tounsoo/home](https://github.com/tounsoo/home) (private). Clone it to `~/repos/home` when that directory is missing (`https://github.com/tounsoo/home.git`) and read these before opening or driving a pull request:

- `AGENTS.md` there: the memory split, the learnings ladder, and how Cursor and Claude find pstack. A fact in this file overrides home.
- `CLAUDE.md` there: the Claude-only lines. This repo's `CLAUDE.md` adapts them for the vendored pstack copy in `.claude/`.
- `standards/git.md` and `standards/pull-requests.md`
- `playbooks/review-before-pr.md` and `playbooks/waiting-on-ci.md`. The **Repo lines** below fill those in.
- `pstack.pin.json` records the Cursor pstack pin and a pstack-claude pin. Threads in this repo read the vendored copy. Its commit is the `pin=` line in `.claude/update-pstack.sh`. Home's pstack-claude pin is a newer commit, and these threads stay on this repo's pin.

`@tounsoo/input-number-mask` is a small React 19 library: two components (`InputNumberMask`, `InputNumberMaskContentEditable`) and two hooks (`useInputNumberMask`, `useContentEditableMask`), exported from `src/index.ts`. Storybook is the docs site and the browser test bed.

## Set up

Use Node 24, the version CI runs. The repository does not pin it: there is no `.nvmrc` and no `engines` field. Install pnpm with Corepack so the version matches `packageManager` in `package.json`, then run `pnpm install --frozen-lockfile`.

## Commands

These are the `package.json` scripts the CI `Test` job runs, in that job's order.

| Command | What it does |
| --- | --- |
| `pnpm lint` | ESLint on `**/*.{ts,tsx}`. Ignores `dist`, `coverage`, `storybook-static` and `.claude`, which holds the vendored pstack scripts. |
| `pnpm test:ci` | Unit tests in jsdom (`vitest.config.ci.ts`, `src/**/*.test.{ts,tsx}` and `scripts/**/*.test.mjs`). |
| `pnpm build:lib` | Type-checks the library (`tsconfig.lib.json`), builds `dist/index.mjs` and `dist/index.cjs` with Vite, then bundles the types into `dist/index.d.ts` and `dist/index.d.cts` with rollup-plugin-dts. |
| `pnpm check:package` | `publint --strict`, `attw --pack .` and `scripts/check-exports.mjs`, which checks that the ESM, CJS and type entries export exactly the public names. Needs `build:lib` first. |
| `pnpm build-storybook` | Static Storybook in `storybook-static/`. The `Test` job builds it on pull requests. `build-storybook.yml` deploys it to GitHub Pages from `main`. |

Others:

- `pnpm exec tsc -b` type-checks the app and node configs (`tsconfig.app.json`, `tsconfig.node.json`), stories and tests included. CI does not run it on its own.
- `pnpm test` runs Vitest with `vitest.config.ts` in headless Chromium through `@storybook/addon-vitest`, so the stories' play functions run as tests. It needs Playwright's Chromium (`pnpm exec playwright install chromium`). CI does not run it.
- `pnpm test:coverage` writes a coverage report to `coverage/`, which is gitignored.
- `node scripts/check-claude-docs.mjs` runs the `Claude docs` check on the committed branch against `origin/main`. Fetch `origin/main` first. CI runs it on every pull request in `.github/workflows/claude-docs.yml`, and again when a label changes. Conventions says what it checks. It is not a required status check. The weekly `pstack update` pull request is opened with the workflow token, so this workflow does not run there.
- `pnpm storybook` starts Storybook on port 6006.
- `pnpm build`, `pnpm dev` and `pnpm preview` are left over from the Vite app template. There is no `index.html`, so `pnpm build` fails after `tsc -b`. Use `build:lib` for the package and Storybook for a running page.

## Verify

Prove every change with [`.claude/skills/verify/SKILL.md`](.claude/skills/verify/SKILL.md). The skill says which of its steps the change needs, and it ends in PASS, FAIL or BLOCKED. Cursor and Claude use this same skill. There is no `.cursor/skills/verify/`.

## Repo lines

These fill the **Repo lines** in home's `playbooks/review-before-pr.md` and `playbooks/waiting-on-ci.md`.

- Base branch: `main`.
- Checks, in this order: `pnpm lint`, `pnpm exec tsc -b`, `pnpm test:ci`, `pnpm build:lib`, `pnpm check:package`, `pnpm build-storybook`, `pnpm lint` again, then `node scripts/check-claude-docs.mjs` after `git fetch origin main`. The CI `Test` job runs `pnpm lint`, `pnpm test:ci`, `pnpm build:lib`, `pnpm check:package`, and, on a pull request, `pnpm build-storybook`. It does not run `tsc -b` or the Claude docs script. Run the verify skill on the commit that ends the review round.
- Dependents to pass as context: importers of a changed export from `src/index.ts` (`InputNumberMask`, `InputNumberMaskContentEditable`, `useInputNumberMask`, `useContentEditableMask`, and their exported prop and return types). Also `README.md`, the stories in `src/stories/` that describe the changed behavior, and the tests that cover it. This repo is a single package.
- Push builds a preview: no. A pull request builds Storybook inside `Test` and does not publish it. GitHub Pages updates from `main` only, in `Build and Deploy Storybook`.
- Drafts: allowed. Open a pull request as a draft. `Test` runs on a draft. Mark the draft ready once `Test` is green.
- Required check name: `Test`. The ruleset `Standard Branch Protection` on the default branch requires that name. `CLAUDE.md and verify skill` is not in the ruleset, so it does not block merge. A failure there still needs a fix. The weekly `pstack update` pull request does not run that workflow.
- Regenerate after a merge of `origin/main`: nothing. `dist/` and `storybook-static/` are gitignored. The Release workflow on `main` opens the "chore: version packages" pull request from `.changeset/` and publishes when that pull request merges.
- Pull request body: this repo has no `.github/pull_request_template.md`. Use the three sections in home's `standards/pull-requests.md`.

## Conventions

- A change that ships in the package carries a changeset: `pnpm changeset`, then commit the file in `.changeset/`. A change to tests, stories, CI, `AGENTS.md`, `CLAUDE.md` or `.claude/` alone needs none. The release workflow opens a "chore: version packages" pull request from the changesets and publishes to npm when that pull request merges.
- Only `dist/`, `README.md` and `LICENSE` ship (`files` in `package.json`).
- `README.md` and the stories in `src/stories/` are the public docs. Keep them in step with the exports.
- Git follows home's `standards/git.md`. This repo's base branch is `main`.
- A change to `AGENTS.md`, `CLAUDE.md` or anything in `.claude/` needs Ben's yes. Home's `standards/git.md` covers the shared half of that rule. The `.claude` entry in the `ignores` list in `eslint.config.js` is part of it: ESLint does not lint the vendored copy.
- A pull request that adds a page, a section or a check also changes `CLAUDE.md` and the verify skill (`.claude/skills/verify/`) in the same pull request. `scripts/check-claude-docs.mjs` fails it otherwise. Ben's yes to those `.claude/` changes comes with the merge ask. The check compares totals at the merge base and at the head, so only a higher total counts. Renaming a file, heading, job or step does not, and neither does adding one heading while removing another. A file renamed into the stories globs, or a job moved into a pull request workflow, does. The check runs the pull request's own copy of the script, so it is a reminder rather than a gate: review changes to `scripts/check-claude-docs.mjs` and `claude-docs.yml` by hand.
  - A page is a Storybook file matching the `stories` globs in `.storybook/main.ts`: `src/**/*.mdx` and `src/**/*.stories.{js,jsx,mjs,ts,tsx}`. It counts when there are more of them.
  - A section is a heading in `README.md` or a `src/**/*.mdx` file. The script parses both with Storybook's own MDX compiler: `README.md` as CommonMark, skipping leading front matter, and `.mdx` as MDX, the way Storybook parses the page. Headings in lists, quotes and HTML elements such as `<div>` count. Headings inside a component such as `<Canvas>`, which may not render its children, do not, and neither do lines in code, HTML blocks, comments or JSX expressions. An `.mdx` file that does not compile, for example one with an HTML comment (MDX takes only `{/* */}`), is left out on both sides, with a warning when it is broken at head. It counts when there are more headings in total.
  - A check is a job or a step in a workflow that runs on `pull_request` or `pull_request_target`. It counts when those workflows have more jobs or more steps in total. A new test file is not a check: `pnpm test:ci` already runs it.
  - The check only asks that both changed. Make the change useful: for a page or a section, update the feature map in `.claude/skills/verify/features/`. For a check, update the commands here and step 1 of the verify skill.
  - The `skip-claude-docs-check` label passes the check with a warning, for a true false positive. Only Ben adds or removes it. Agents never do. Name the false positive in the merge ask instead. Nothing checks who added it. The label skips every run while it stays on the pull request, so remove it once the false positive is past.
- Where these instructions and the code disagree, follow the code, as home's `AGENTS.md` says, and list each mismatch in the pull request.

## pstack in this repo

Work here uses [pstack-claude](https://github.com/michael-denyer/pstack-claude), checked in at one pinned commit so no session downloads it. Its skills are in `.claude/skills/`, its agents in `.claude/agents/`, and its licenses in `.claude/skills/poteto-mode/references/licenses/`. The `pin=` line in `.claude/update-pstack.sh` records the commit, and `.claude/pstack-files.txt` lists the skills and agents the copy holds. The repository's own `verify` skill sits beside them and is not in that list.

- The weekly `pstack update` workflow (`.github/workflows/pstack-update.yml`) runs `sh .claude/update-pstack.sh --check`. When upstream has changed the copied files, it copies the new commit in and opens one pull request from the `pstack/update` branch, or refreshes the one already open. It closes that pull request when main already matches upstream. That workflow force-pushes `pstack/update` because it rebuilds the branch from `main`. Agents do not. Review that diff like any other change before it merges.
- To move the pin by hand, run `sh .claude/update-pstack.sh <commit>` locally and review the diff. Threads do not run it. The script leaves out `babysit`, `fix-ci`, `fix-merge-conflicts`, `get-pr-comments` and `setup-pstack`, rewrites any skill or agent default that names `fable` to `opus`, drops the `pstack:` prefix from the routing text, and lists the Fable mentions left for a reviewer to check. The `babysit` playbook inside `poteto-mode` stays. The skipped names are skill directories.
- `.claude/pstack-models.md` is the model sheet. Where a pstack skill names the `pstack-models.md` sheet, read that file. A change to a role's model or effort goes there, with Ben's yes. The sheet names no Fable role. Fable runs only when a line there names it, or when Ben approves it in his own message in that run.
- This repo has no `.agents/playbooks/`. Repo-specific procedure stays in this file. Home's review and CI playbooks are read from `~/repos/home`, not copied.

## Where the tools look

- Cursor reads this file. This repo has no `.cursor/` directory. The verify skill stays at `.claude/skills/verify/SKILL.md`. Cursor's installed pstack reads the user sheet home describes (`~/.cursor/rules/pstack-models.mdc`, written by `/setup-pstack`).
- Claude reads `CLAUDE.md`, which imports this file and `.claude/pstack-models.md`. A local Claude Code session loads the skills and agents from `.claude/`. `.claude/settings.json` prints `.claude/pstack-session-start.md` at session start, so tasks route to `poteto-mode`. That hook does not read a `session hook` line in the model sheet.
- A Duet thread follows `.claude/thread-start.md`. A thread loads nothing in `.claude/` by itself, and an `@` import does not expand.
- Briefs use `.claude/task-prompt.md`.
