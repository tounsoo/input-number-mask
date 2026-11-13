import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { PAGE_PATH, detectChecks, detectPages, detectSections, headingsOf, runsOnPullRequest } from './check-claude-docs.mjs';

const snap = (files) => ({
    files: new Set(Object.keys(files)),
    read: (path) => {
        if (!(path in files)) throw new Error(`no ${path}`);
        return files[path];
    },
});
const run = (detect, base, head, extra = {}) => detect({ base: snap(base), head: snap(head), ...extra });

describe('headingsOf', () => {
    it.each([
        ['plain', '# A\n## B ##\n###### C', ['A', 'B', 'C']],
        ['seven hashes are not a heading', '####### A', []],
        ['indented four spaces is code', '    # A', []],
        ['trailing #s stripped', '## Title ###', ['Title']],
        ['backtick fence', '```bash\n# comment\n```\n# Real', ['Real']],
        ['tilde fence', '~~~\n# comment\n~~~\n# Real', ['Real']],
        ['indented fence in a list item', '- item\n\n      ```\n  # no\n      ```\n# Real', ['Real']],
        ['fence behind a blockquote', '> ```\n> # no\n> ```\n# Real', ['Real']],
        ['shorter closing fence does not close', '````\n```\n# no\n````\n# Real', ['Real']],
        ['other fence char does not close', '```\n~~~\n# no\n```\n# Real', ['Real']],
        ['closing fence with text does not close', '```\n``` x\n# no\n```\n# Real', ['Real']],
        ['single-line HTML comment', '<!-- # no -->\n# Real', ['Real']],
        ['multi-line HTML comment', '<!--\n# no\n-->\n# Real', ['Real']],
        ['single-line MDX comment', '{/* # no */}\n# Real', ['Real']],
        ['multi-line MDX comment', '{/*\n# no\n*/}\n# Real', ['Real']],
        ['fence inside a comment is ignored', '<!--\n```\n-->\n# Real', ['Real']],
    ])('%s', (_name, markdown, expected) => {
        expect(headingsOf(markdown)).toEqual(expected);
    });
});

describe('detectSections', () => {
    const readme = '# Title\n\n## Setup\n';
    it.each([
        ['added heading fires', { 'README.md': readme }, { 'README.md': `${readme}## New\n` }, 1],
        ['renamed heading does not', { 'README.md': readme }, { 'README.md': '# Title\n\n## Install\n' }, 0],
        [
            'section moved README to mdx does not',
            { 'README.md': readme },
            { 'README.md': '# Title\n', 'src/Guide.mdx': '## Setup\n' },
            0,
        ],
        [
            'renamed mdx with an added heading fires',
            { 'src/A.mdx': '# A\n' },
            { 'src/B.mdx': '# A\n## More\n' },
            1,
        ],
        ['renamed mdx alone does not', { 'src/A.mdx': '# A\n' }, { 'src/B.mdx': '# A\n' }, 0],
        ['new mdx page with headings fires', { 'README.md': readme }, { 'README.md': readme, 'src/N.mdx': '# N\n' }, 1],
        ['heading in a fence does not', { 'README.md': readme }, { 'README.md': `${readme}\`\`\`\n# x\n\`\`\`\n` }, 0],
        ['non-doc files are ignored', { 'a.md': '# A' }, { 'a.md': '# A\n# B' }, 0],
    ])('%s', (_name, base, head, count) => {
        expect(run(detectSections, base, head)).toHaveLength(count);
    });

    it('names the new heading and its file', () => {
        const [finding] = run(detectSections, { 'README.md': readme }, { 'README.md': `${readme}## New\n` });
        expect(finding.file).toBe('README.md');
        expect(finding.detail).toBe('Docs have 3 headings, up from 2 (new: "New" in README.md)');
    });
});

describe('detectPages', () => {
    const story = 'src/Button.stories.tsx';
    it.each([
        ['new stories file fires', {}, { [story]: '' }, 1],
        ['new mdx page fires', {}, { 'src/Intro.mdx': '' }, 1],
        ['rename does not', { [story]: '' }, { 'src/ui/Button.stories.tsx': '' }, 0],
        ['rename into the glob fires', { 'src/HookAPI.tsx': '' }, { 'src/HookAPI.stories.tsx': '' }, 1],
        ['rename out of the glob does not', { [story]: '' }, { 'src/Button.tsx': '' }, 0],
        ['non-story component does not', {}, { 'src/HookAPI.tsx': '' }, 0],
        ['stories outside src do not', {}, { 'docs/A.stories.tsx': '' }, 0],
        ['removal does not', { [story]: '' }, {}, 0],
    ])('%s', (_name, base, head, count) => {
        expect(run(detectPages, base, head)).toHaveLength(count);
    });

    it('names the new page', () => {
        const [finding] = run(detectPages, { 'src/A.mdx': '' }, { 'src/A.mdx': '', [story]: '' });
        expect(finding.file).toBe(story);
        expect(finding.detail).toBe(`Storybook has 2 pages, up from 1 (new: ${story})`);
    });
});

describe('runsOnPullRequest', () => {
    it.each([
        ['string', 'pull_request', true],
        ['target string', 'pull_request_target', true],
        ['other string', 'push', false],
        ['array', ['push', 'pull_request'], true],
        ['array without', ['push'], false],
        ['object', { pull_request: { types: ['opened'] } }, true],
        ['object with null value', { pull_request: null }, true],
        ['object without', { push: {} }, false],
        ['missing', undefined, false],
    ])('%s', (_name, on, expected) => {
        expect(runsOnPullRequest(on)).toBe(expected);
    });
});

describe('detectChecks', () => {
    const workflow = (on, jobs) =>
        `on: ${on}\njobs:\n${Object.entries(jobs)
            .map(([id, steps]) => `  ${id}:\n    runs-on: ubuntu-latest\n    steps:\n${'      - run: echo\n'.repeat(steps)}`)
            .join('')}`;
    const ci = '.github/workflows/ci.yml';
    const base = { [ci]: workflow('pull_request', { test: 2, lint: 1 }) };
    const check = (head, baseFiles = base) => {
        const warnings = [];
        const findings = run(detectChecks, baseFiles, head, { warn: (line) => warnings.push(line) });
        return { findings, warnings };
    };

    it.each([['pull_request'], ['[push, pull_request]'], ['{ pull_request: {} }'], ['pull_request_target']])(
        'extra step fires with on: %s',
        (on) => {
            const before = { [ci]: workflow(on, { test: 2 }) };
            expect(check({ [ci]: workflow(on, { test: 3 }) }, before).findings).toHaveLength(1);
        },
    );

    it.each([
        ['new job fires jobs and steps', { [ci]: workflow('pull_request', { test: 2, lint: 1, build: 1 }) }, 2],
        ['new job without steps fires once', { [ci]: `${base[ci]}  call:\n    uses: ./.github/workflows/x.yml\n` }, 1],
        ['renamed job id does not', { [ci]: workflow('pull_request', { test: 2, verify: 1 }) }, 0],
        ['step moved between jobs does not', { [ci]: workflow('pull_request', { test: 1, lint: 2 }) }, 0],
        ['renamed workflow file does not', { '.github/workflows/ci2.yml': base[ci] }, 0],
        ['removed step does not', { [ci]: workflow('pull_request', { test: 1, lint: 1 }) }, 0],
        ['push-only workflow change does not', { [ci]: base[ci], '.github/workflows/p.yml': workflow('push', { a: 4 }) }, 0],
        ['new PR workflow fires', { [ci]: base[ci], '.github/workflows/n.yml': workflow('pull_request', { a: 1 }) }, 2],
    ])('%s', (_name, head, count) => {
        expect(check(head).findings).toHaveLength(count);
    });

    it('a workflow gaining a pull_request trigger fires', () => {
        const pushOnly = { [ci]: workflow('push', { test: 2 }) };
        expect(check({ [ci]: workflow('pull_request', { test: 2 }) }, pushOnly).findings).toHaveLength(2);
    });

    it('reports totals and new job ids', () => {
        const { findings } = check({ [ci]: workflow('pull_request', { test: 2, lint: 1, build: 2 }) });
        expect(findings.map((f) => f.detail)).toEqual([
            `PR workflows have 3 jobs, up from 2 (new: build in ${ci})`,
            `PR workflows have 5 steps, up from 3 (more in: ${ci})`,
        ]);
    });

    it('skips invalid YAML at head with a warning and does not throw', () => {
        const bad = '.github/workflows/release.yml';
        const { findings, warnings } = check(
            { [ci]: base[ci], [bad]: 'on: [pull_request\n' },
            { [ci]: base[ci], [bad]: workflow('pull_request', { a: 1 }) },
        );
        expect(findings).toEqual([]);
        expect(warnings).toEqual([`::warning file=${bad}::${bad} is not valid YAML, so the Claude docs check skips it`]);
    });

    it('is silent about invalid YAML at base', () => {
        const bad = '.github/workflows/old.yml';
        const { warnings } = check(base, { ...base, [bad]: 'on: [pull_request\n' });
        expect(warnings).toEqual([]);
    });
});

// The page regex mirrors the `stories` globs in .storybook/main.ts. If someone edits the globs,
// this fails until PAGE_PATH is updated to match.
describe('Storybook glob drift guard', () => {
    const main = readFileSync(resolve(process.cwd(), '.storybook/main.ts'), 'utf8');
    const block = /stories:\s*\[([^\]]*)\]/.exec(main)?.[1] ?? '';
    const globs = [...block.matchAll(/["'`]([^"'`]+)["'`]/g)].map((match) => match[1]);

    it('lists exactly the globs PAGE_PATH mirrors', () => {
        expect(new Set(globs)).toEqual(new Set(['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)']));
    });

    it.each([
        ['src/Intro.mdx', true],
        ['src/a/b/Intro.mdx', true],
        ['src/Button.stories.js', true],
        ['src/Button.stories.jsx', true],
        ['src/Button.stories.mjs', true],
        ['src/Button.stories.ts', true],
        ['src/a/Button.stories.tsx', true],
        ['src/Button.tsx', false],
        ['src/Button.stories.css', false],
        ['src/Button.stories.cjs', false],
        ['lib/Intro.mdx', false],
        ['Button.stories.tsx', false],
    ])('%s matches: %s', (path, expected) => {
        expect(PAGE_PATH.test(path)).toBe(expected);
    });
});
