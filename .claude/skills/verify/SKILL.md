---
name: verify
description: "Prove a change to @tounsoo/input-number-mask, a React masked-input library, on the commit it was tested at: the CI checks, then the packed package driven the way a consumer installs it, then Storybook in a browser where one can run. Ends in PASS, FAIL or BLOCKED. Use before opening or pushing to a pull request, for /verify, or when asked how a change was tested."
---

# Verify an input-number-mask change

The user-facing surface is the npm package: a consumer installs the tarball, imports from it, and a person types into the input it renders. Storybook is the second surface, where the same components run in a real browser. Prove a change on the surface it touches, on the commit you will push.

Run every command from the repository root with Node 24, after `pnpm install --frozen-lockfile`.

## Verdicts

- `PASS`: every step the change needs ran on the tested commit and passed.
- `FAIL`: a step ran and failed. Fix the cause and run again.
- `BLOCKED`: a step could not run, so nothing proves the change either way. A missing browser, the wrong Node version and uncommitted changes are all `BLOCKED`.

`BLOCKED` is not a pass. Report each blocked step as unverified in the pull request, with its reason. Never write `PASS` for a run with a blocked step the change needed.

## Doctor

Run this first, and again whenever a result looks off.

```sh
node -v                       # v24.x, as CI runs
pnpm -v                       # matches packageManager in package.json
git status --short            # empty, so the tested commit is what you push
git rev-parse HEAD            # the tested commit, for the pull request body
```

A wrong Node major, or a dirty tree, is `BLOCKED` until fixed.

## Launch and drive

### 1. CI checks (every change)

The same commands, in the same order, as the CI `Test` job:

```sh
pnpm lint
pnpm exec tsc -b
pnpm test:ci
pnpm build:lib
pnpm check:package
pnpm build-storybook
pnpm lint                     # again: proves the Storybook output stays ignored
```

`tsc -b` isn't a CI step, but it type-checks the stories and tests that `build:lib` skips.

### 2. Consumer drive (any change under `src/`, the build config or `package.json`)

```sh
node .claude/skills/verify/consumer-smoke.mjs
```

It runs `pnpm pack`, unpacks the tarball into a scratch `node_modules` the way an install would, and types into the packed `InputNumberMask` and `useInputNumberMask` through both the ESM `import` entry and the CJS `require` entry, in jsdom with `@testing-library/user-event`. Each check prints `ok` or `FAIL` with the input's value. Exit 0 is `PASS`, 1 is `FAIL`, 2 is `BLOCKED` (no `dist/` or no `node_modules`). Run `pnpm build:lib` first.

When a change adds or changes behavior, add a check for it to `consumer-smoke.mjs` in the same pull request, through the public props only.

### 3. Browser drive (a change to a component, a hook, a story or Storybook config)

```sh
pnpm exec playwright install chromium
pnpm test
```

This runs Vitest with `vitest.config.ts`, which runs every story in `src/stories/` in headless Chromium, with its play function, through `@storybook/addon-vitest`. A story without a play function only has to render. The play functions type, delete and submit forms through the rendered input the way a person does. None of them pastes yet, so check a paste change by hand in `pnpm storybook`.

In a Claude Duet thread the Chromium download is blocked, so this step is `BLOCKED` there. Say so in the pull request, and name the stories a reviewer should try in `pnpm storybook` (port 6006). `features/` lists them per feature.

### What each change needs

| Change | Steps |
| --- | --- |
| `src/component/`, `src/hook/`, `src/utils/`, `src/index.ts` | 1, 2 and 3 |
| `src/stories/`, `.storybook/` | 1 and 3 |
| `vite.config.lib.ts`, `rollup.config.dts.mjs`, `tsconfig*.json`, `package.json`, `scripts/` | 1 and 2 |
| `.github/` | 1, then the pull request's CI run is the rest of the proof; link it |
| `README.md`, `CLAUDE.md`, `.claude/`, `.changeset/` | 1. Review covers the rest. |

## Evidence

Put the tested commit's full SHA and each command with its result in the pull request body. `consumer-smoke.mjs` prints the folder that holds the tarball and the scratch install; it stays there after the run. Proof standards:

- Drive the real path: type through the rendered input, never by calling a hook's internals or setting `value` on the element.
- Check the resulting state, the input's value and what `onValueChange` received, not only that nothing threw.
- A new behavior that only a unit test covers is half proven. Add it to step 2 or a story's play function.

## Cleanup

Each step cleans up after itself. Remove the scratch folders the smoke run printed (`/tmp/inm-consumer-*`) once the pull request is open, and `storybook-static/` if you want a clean tree; both are outside git. Don't kill a Storybook dev server you didn't start.
