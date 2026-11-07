# Claude instructions

`@tounsoo/input-number-mask` is a small React 19 library: two components (`InputNumberMask`, `InputNumberMaskContentEditable`) and two hooks (`useInputNumberMask`, `useContentEditableMask`), exported from `src/index.ts`. Storybook is the docs site and the browser test bed.

## pstack

Work here uses [pstack-claude](https://github.com/michael-denyer/pstack-claude). A local Claude Code session gets the `pstack` plugin from `.claude/settings.json` once the folder is trusted. Duet threads: read [`.claude/thread-start.md`](.claude/thread-start.md) next. A thread attaches the repository after it starts, so nothing in `.claude/` loads by itself there, and that page installs pstack by hand.

`.claude/models.md` is the pstack model sheet. Where pstack names the `pstack-models.md` sheet, read that file. A change to a role's model or effort goes there, with Ben's yes.

## Set up

Use Node 24, the version CI runs. The repository doesn't pin it. Install pnpm with Corepack so it matches `packageManager` in `package.json`, then run `pnpm install --frozen-lockfile`.

## Commands

These are the `package.json` scripts CI relies on, in the order the CI `Test` job runs them.

| Command | What it does |
| --- | --- |
| `pnpm lint` | ESLint on `**/*.{ts,tsx}`. Ignores `dist`, `coverage` and `storybook-static`. |
| `pnpm test:ci` | Unit tests in jsdom (`vitest.config.ci.ts`, `src/**/*.test.{ts,tsx}`). |
| `pnpm build:lib` | Type-checks the library (`tsconfig.lib.json`), builds `dist/index.mjs` and `dist/index.cjs` with Vite, then bundles the types into `dist/index.d.ts` and `dist/index.d.cts` with rollup-plugin-dts. |
| `pnpm check:package` | `publint --strict`, `attw --pack .` and `scripts/check-exports.mjs`, which checks that the ESM, CJS and type entries export exactly the public names. Needs `build:lib` first. |
| `pnpm build-storybook` | Static Storybook in `storybook-static/`. CI builds it on pull requests; `build-storybook.yml` deploys it to GitHub Pages from `main`. |

Others:

- `pnpm exec tsc -b` type-checks the app and node configs (`tsconfig.app.json`, `tsconfig.node.json`), stories and tests included. CI doesn't run it on its own.
- `pnpm test` runs Vitest with `vitest.config.ts` in headless Chromium through `@storybook/addon-vitest`, so the stories' play functions run as tests. It needs Playwright's Chromium (`pnpm exec playwright install chromium`). CI doesn't run it.
- `pnpm test:coverage` writes a coverage report to `coverage/`, which is gitignored.
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
- Where these docs and the code disagree, follow the code and say so in the pull request.
