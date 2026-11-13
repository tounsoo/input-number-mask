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
| `pnpm test:ci` | Unit tests in jsdom (`vitest.config.ci.ts`, `src/**/*.test.{ts,tsx}`). |
| `pnpm build:lib` | Type-checks the library (`tsconfig.lib.json`), builds `dist/index.mjs` and `dist/index.cjs` with Vite, then bundles the types into `dist/index.d.ts` and `dist/index.d.cts` with rollup-plugin-dts. |
| `pnpm check:package` | `publint --strict`, `attw --pack .` and `scripts/check-exports.mjs`, which checks that the ESM, CJS and type entries export exactly the public names. Needs `build:lib` first. |
| `pnpm build-storybook` | Static Storybook in `storybook-static/`. CI builds it on pull requests; `build-storybook.yml` deploys it to GitHub Pages from `main`. |

Others:

- `pnpm exec tsc -b` type-checks the app and node configs (`tsconfig.app.json`, `tsconfig.node.json`), stories and tests included. CI doesn't run it on its own.
- `pnpm test` runs Vitest with `vitest.config.ts` in headless Chromium through `@storybook/addon-vitest`, so the stories' play functions run as tests. It needs Playwright's Chromium (`pnpm exec playwright install chromium`). CI doesn't run it.
- `pnpm test:coverage` writes a coverage report to `coverage/`, which is gitignored.
- `node scripts/check-claude-docs.mjs` runs the `Claude docs` check against `origin/main` (fetch it first). CI runs it on every pull request in `.github/workflows/claude-docs.yml`. Conventions says what it checks.
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
- A pull request that adds a page, a section or a check also changes `CLAUDE.md` and the verify skill (`.claude/skills/verify/`) in the same pull request, before the merge ask. The `Claude docs` workflow fails it otherwise.
  - A page is a new Storybook file: `src/**/*.mdx` or `src/**/*.stories.{js,jsx,mjs,ts,tsx}`, the globs in `.storybook/main.ts`. A renamed file isn't new.
  - A section is a new Markdown heading in `README.md` or in an `.mdx` file that already exists. Lines in code blocks don't count. The check compares the number of headings, so a renamed heading doesn't count.
  - A check is a new job, or a job with more steps, in a workflow that runs on `pull_request` or `pull_request_target`. A new test file isn't one: `pnpm test:ci` already runs it.
  - For a page or a section, update the feature map in `.claude/skills/verify/features/`. For a check, update `CLAUDE.md`'s commands and step 1 of the verify skill.
  - For a true false positive, a maintainer adds the `skip-claude-docs-check` label. That re-runs the check, which passes with a warning.
- Where these docs and the code disagree, follow the code and say so in the pull request.
