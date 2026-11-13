# Claude instructions

`@tounsoo/input-number-mask` is a small React 19 library: two components (`InputNumberMask`, `InputNumberMaskContentEditable`) and two hooks (`useInputNumberMask`, `useContentEditableMask`), exported from `src/index.ts`. Storybook is the docs site and the browser test bed.

## pstack

Work here uses [pstack-claude](https://github.com/michael-denyer/pstack-claude), checked in at one pinned commit so no session downloads it. Its skills are in `.claude/skills/`, its agents in `.claude/agents/`, and its licenses in `.claude/skills/poteto-mode/references/licenses/`. The `pin=` line in `.claude/update-pstack.sh` records the commit, and `.claude/pstack-files.txt` lists the skills and agents the copy holds. The repository's own `verify` skill sits beside them.

- A local Claude Code session loads the skills and agents from `.claude/`, and `.claude/settings.json` prints `.claude/pstack-session-start.md` at session start, so tasks route to `poteto-mode`. Skills and agents are project files, so they have no plugin prefix: where pstack names `pstack:<name>`, use `<name>`. A `<plugin>` path in a skill means `.claude`.
- Duet threads: read [`.claude/thread-start.md`](.claude/thread-start.md) next. A thread attaches the repository after it starts, so nothing in `.claude/` loads by itself there, and that page says how to use the copy by hand.
- The weekly `pstack update` workflow (`.github/workflows/pstack-update.yml`) runs `sh .claude/update-pstack.sh --check`. When upstream has changed the copied files, it copies the new commit in and opens one pull request from the `pstack/update` branch, or refreshes the one already open. It closes that pull request when main already matches upstream. Review that diff like any other change before it merges.
- To move the pin by hand, run `sh .claude/update-pstack.sh <commit>` locally and review the diff. Threads don't run it. The script leaves out `babysit`, `fix-ci`, `fix-merge-conflicts`, `get-pr-comments` and `setup-pstack`, rewrites any skill or agent default that names `fable` to `opus`, drops the `pstack:` prefix from the routing text, and lists the Fable mentions left for a reviewer to check.

`.claude/models.md` is the pstack model sheet. Where pstack names the `pstack-models.md` sheet, read that file. A change to a role's model or effort goes there, with Ben's yes. Fable never runs here.

## Set up

Use Node 24, the version CI runs. The repository doesn't pin it. Install pnpm with Corepack so it matches `packageManager` in `package.json`, then run `pnpm install --frozen-lockfile`.

## Commands

These are the `package.json` scripts CI relies on, in the order the CI `Test` job runs them.

| Command | What it does |
| --- | --- |
| `pnpm lint` | ESLint on `**/*.{ts,tsx}`. Ignores `dist`, `coverage`, `storybook-static` and `.claude`, which holds the vendored pstack scripts. |
| `pnpm test:ci` | Unit tests in jsdom (`vitest.config.ci.ts`, `src/**/*.test.{ts,tsx}` and `scripts/**/*.test.mjs`). |
| `pnpm build:lib` | Type-checks the library (`tsconfig.lib.json`), builds `dist/index.mjs` and `dist/index.cjs` with Vite, then bundles the types into `dist/index.d.ts` and `dist/index.d.cts` with rollup-plugin-dts. |
| `pnpm check:package` | `publint --strict`, `attw --pack .` and `scripts/check-exports.mjs`, which checks that the ESM, CJS and type entries export exactly the public names. Needs `build:lib` first. |
| `pnpm build-storybook` | Static Storybook in `storybook-static/`. CI builds it on pull requests; `build-storybook.yml` deploys it to GitHub Pages from `main`. |

Others:

- `pnpm exec tsc -b` type-checks the app and node configs (`tsconfig.app.json`, `tsconfig.node.json`), stories and tests included. CI doesn't run it on its own.
- `pnpm test` runs Vitest with `vitest.config.ts` in headless Chromium through `@storybook/addon-vitest`, so the stories' play functions run as tests. It needs Playwright's Chromium (`pnpm exec playwright install chromium`). CI doesn't run it.
- `pnpm test:coverage` writes a coverage report to `coverage/`, which is gitignored.
- `node scripts/check-claude-docs.mjs` runs the `Claude docs` check on the committed branch against `origin/main` (fetch it first). CI runs it on every pull request in `.github/workflows/claude-docs.yml`, and again when a label changes. Conventions says what it checks. It isn't a required status check: the weekly `pstack update` pull request is opened with the workflow token, so this workflow never runs there.
- `pnpm storybook` starts Storybook on port 6006.
- `pnpm build`, `pnpm dev` and `pnpm preview` are left over from the Vite app template. There is no `index.html`, so `pnpm build` fails after `tsc -b`. Use `build:lib` for the package and Storybook for a running page.

## Verify

Prove every change with [`.claude/skills/verify/SKILL.md`](.claude/skills/verify/SKILL.md). It runs the CI commands above, then drives the packed package the way a consumer installs it, and ends in PASS, FAIL or BLOCKED.

## Conventions

- A change that ships in the package carries a changeset: `pnpm changeset`, then commit the file in `.changeset/`. A change to tests, stories, CI or `.claude/` alone needs none. The release workflow opens a "chore: version packages" pull request from the changesets and publishes to npm when that pull request merges.
- Only `dist/`, `README.md` and `LICENSE` ship (`files` in `package.json`).
- `README.md` and the stories in `src/stories/` are the public docs. Keep them in step with the exports.
- Agents don't merge, delete branches, force-push or rebase. Each waits for Ben's yes.
- Push only once lint, tests and the build are green locally. Open pull requests as drafts; mark one ready once its CI is green.
- Change `CLAUDE.md` and anything in `.claude/` only with Ben's yes.
- A pull request that adds a page, a section or a check also changes `CLAUDE.md` and the verify skill (`.claude/skills/verify/`) in the same pull request. The `Claude docs` workflow (`scripts/check-claude-docs.mjs`) fails it otherwise. Ben's yes to those `.claude/` changes comes with the merge ask. The check compares totals at the merge base and at the head, so a rename or a move never counts. Only a net increase does.
  - A page is a Storybook file matching the `stories` globs in `.storybook/main.ts`: `src/**/*.mdx` and `src/**/*.stories.{js,jsx,mjs,ts,tsx}`. It counts when there are more of them.
  - A section is a Markdown heading in `README.md` or a `src/**/*.mdx` file. Lines in code blocks and in HTML or MDX comments don't count. It counts when there are more headings in total.
  - A check is a job or a step in a workflow that runs on `pull_request` or `pull_request_target`. It counts when those workflows have more jobs or more steps in total. A new test file isn't a check: `pnpm test:ci` already runs it.
  - The check only asks that both changed. Make the change useful: for a page or a section, update the feature map in `.claude/skills/verify/features/`. For a check, update the commands here and step 1 of the verify skill.
  - The `skip-claude-docs-check` label passes the check with a warning, for a true false positive. Only Ben adds or removes it. Agents never do; they name the false positive in the merge ask instead. The label skips every run while it stays on the pull request, so remove it once the false positive is past.
- Where these docs and the code disagree, follow the code and say so in the pull request.
