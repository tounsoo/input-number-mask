import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, describe, it, expect } from 'vitest';
import {
    CheckError,
    PAGE_PATH,
    detectChecks,
    detectPages,
    detectSections,
    headingsOf,
    main,
    runsOnPullRequest,
} from './check-claude-docs.mjs';

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
        ['indented code in a list item leaves a following list-item heading', '- item\n\n      ```\n  # no\n      ```\n# Real', ['no', 'Real']],
        ['fence behind a blockquote', '> ```\n> # no\n> ```\n# Real', ['Real']],
        ['shorter closing fence does not close', '````\n```\n# no\n````\n# Real', ['Real']],
        ['other fence char does not close', '```\n~~~\n# no\n```\n# Real', ['Real']],
        ['closing fence with text does not close', '```\n``` x\n# no\n```\n# Real', ['Real']],
        ['single-line HTML comment', '<!-- # no -->\n# Real', ['Real']],
        ['multi-line HTML comment', '<!--\n# no\n-->\n# Real', ['Real']],
        ['fence inside a comment is ignored', '<!--\n```\n-->\n# Real', ['Real']],
        ['inline triple backticks are not a fence', '```js``` text\n# Real', ['Real']],
        ['backtick opener with a backtick in its info string', '```a`b\n# Real', ['Real']],
        ['tilde opener may contain backticks', '~~~ a`b\n# no\n~~~\n# Real', ['Real']],
        ['a one-line comment block ends there, so the next heading counts', '<!-- a --><!--\n# no\n-->\n# Real', ['no', 'Real']],
        ['<!-- mid-paragraph is not a comment block', 'text <!--\n# no\n-->\n# Real', ['no', 'Real']],
        ['comment block closed by --> ends there', '<!--\n--> x <!--\n# no\n-->\n# Real', ['no', 'Real']],
        ['heading text keeps a trailing <!--', '# Real <!--\n# no\n-->', ['Real <!--', 'no']],
        ['comment spans a fence line', '<!--\n```\n# no\n-->\n# Real', ['Real']],
        [
            'fence opening an ordered list item',
            '# Title\n## Install\n1. ```bash\n   # comment\n   ```\n## Usage\n## API',
            ['Title', 'Install', 'Usage', 'API'],
        ],
        ['fence opening a dash list item', '- ```bash\n  # comment\n  ```\n## B', ['B']],
        ['<!-- inside an inline code span', 'Type `<!--` to open one.\n## A', ['A']],
        ['setext heading', 'Title\n=====\n\nSub\n---', ['Title', 'Sub']],
        ['heading inside a list item', '- item\n\n  ## Nested', ['Nested']],
    ])('%s', (_name, markdown, expected) => {
        expect(headingsOf(markdown)).toEqual(expected);
    });
});

describe('headingsOf front matter', () => {
    it.each([
        ['README', false],
        ['MDX', true],
    ])('%s skips leading front matter', (_name, mdx) => {
        expect(headingsOf('---\ntitle: Button\nsidebar: true\n---\n\n## Install\n', { mdx })).toEqual(['Install']);
    });
    it('a later --- block is not front matter', () => {
        expect(headingsOf('# A\n\n---\ntitle: x\n---\n')).toEqual(['A', 'title: x']);
    });
});

describe('headingsOf in MDX', () => {
    it.each([
        ['single-line MDX comment', '{/* # no */}\n# Real', ['Real']],
        ['multi-line MDX comment', '{/*\n# no\n*/}\n# Real', ['Real']],
        ['MDX comment mid-line', 'text {/* # no */} more\n# Real', ['Real']],
        ['heading right after a JSX line', '<Meta title="Getting Started" />\n# Title\n\n## A', ['Title', 'A']],
        ['heading right after a self-closing component', '#### Props\n<ArgTypes of={P} />\n#### Options', ['Props', 'Options']],
        ['headings around a JSX block', '<Canvas>\n\n## Inside\n\n</Canvas>\n## After', ['Inside', 'After']],
        ['{/* in inline code opens no comment', 'Write `{/*` to open one.\n\n## A\n\nand `*/}` to close.\n## B', ['A', 'B']],
        ['{/* in a fence opens no comment', '```\n{/*\n```\n\n## A\n\n{/* todo */}\n\n## B', ['A', 'B']],
        ['a fenced # line still is not a heading', '```bash\n# comment\n```\n# Real', ['Real']],
    ])('%s', (_name, markdown, expected) => {
        expect(headingsOf(markdown, { mdx: true })).toEqual(expected);
    });

    it('README keeps GitHub rules: a JSX-looking line starts an HTML block', () => {
        expect(headingsOf('<p align="center">\n</p>\n## Hidden\n\n## Shown')).toEqual(['Shown']);
    });

    it('README does not strip {/* */}', () => {
        expect(headingsOf('Write `{/*` here.\n\n## A\n\n`*/}`\n## B')).toEqual(['A', 'B']);
    });
});

describe('detectSections in MDX', () => {
    it('adding blank lines after JSX does not fire', () => {
        const base = '<Meta title="A" />\n# A\n\nText\n\n#### Props\n<ArgTypes of={P} />\n#### Options\n<ArgTypes of={O} />\n';
        const head = '<Meta title="A" />\n\n# A\n\nText\n\n#### Props\n\n<ArgTypes of={P} />\n\n#### Options\n\n<ArgTypes of={O} />\n';
        expect(run(detectSections, { 'src/a.mdx': base }, { 'src/a.mdx': head })).toEqual([]);
    });

    it('a heading added right under JSX fires', () => {
        const base = '#### Props\n<ArgTypes of={P} />\n';
        const head = `${base}#### Return Values\n<ArgTypes of={R} />\n`;
        expect(run(detectSections, { 'src/a.mdx': base }, { 'src/a.mdx': head })).toHaveLength(1);
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

    it('a heading moved between files names nothing new but a duplicate does', () => {
        const [finding] = run(
            detectSections,
            { 'README.md': '# A\n## Setup\n' },
            { 'README.md': '# A\n## Setup\n', 'src/G.mdx': '## Setup\n' },
        );
        expect(finding.file).toBe('src/G.mdx');
        expect(finding.detail).toBe('Docs have 3 headings, up from 2 (new: "Setup" in src/G.mdx)');
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

    it('pluralises a single page', () => {
        const [finding] = run(detectPages, {}, { [story]: '' });
        expect(finding.detail).toBe(`Storybook has 1 page, up from 0 (new: ${story})`);
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

    it('a read failure that is not a YAML error is not swallowed', () => {
        const unreadable = {
            files: new Set([ci]),
            read: () => {
                throw new Error('boom');
            },
        };
        expect(() => detectChecks({ base: unreadable, head: unreadable })).toThrow('boom');
    });

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

    it('a job named like an existing job in another file is still named', () => {
        const other = '.github/workflows/other.yml';
        const { findings } = check({ [ci]: base[ci], [other]: workflow('pull_request', { test: 1 }) });
        expect(findings.map((f) => f.detail)).toEqual([
            `PR workflows have 3 jobs, up from 2 (new: test in ${other})`,
            `PR workflows have 4 steps, up from 3 (more in: ${other})`,
        ]);
        expect(findings[0].file).toBe(other);
    });

    it('pluralises one job and one step', () => {
        const { findings } = check({ [ci]: workflow('pull_request', { a: 1 }) }, {});
        expect(findings.map((f) => f.detail)).toEqual([
            `PR workflows have 1 job, up from 0 (new: a in ${ci})`,
            `PR workflows have 1 step, up from 0 (more in: ${ci})`,
        ]);
    });

    it('repairing a workflow that was invalid at base fires', () => {
        const wf = '.github/workflows/pr.yml';
        const { findings, warnings } = check({ [wf]: workflow('pull_request', { a: 1 }) }, { [wf]: 'on: [pull_request\n' });
        expect(findings).toHaveLength(2);
        expect(warnings).toEqual([]);
    });

    it('a workflow invalid at head is dropped from base too', () => {
        const { findings } = check({ [ci]: 'on: [pull_request\n' });
        expect(findings).toEqual([]);
    });

    it('is silent about invalid YAML at base', () => {
        const bad = '.github/workflows/old.yml';
        const { warnings } = check(base, { ...base, [bad]: 'on: [pull_request\n' });
        expect(warnings).toEqual([]);
    });
});

describe('main', () => {
    const dirs = [];
    afterAll(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

    const gitIn = (cwd, ...args) =>
        execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], { cwd, stdio: 'pipe' });
    const write = (cwd, files) => {
        for (const [path, content] of Object.entries(files)) {
            mkdirSync(dirname(join(cwd, path)), { recursive: true });
            writeFileSync(join(cwd, path), content);
        }
    };
    // Commits `baseFiles` on main, then `headFiles` and `removed` on a branch.
    const repo = (baseFiles, headFiles, removed = []) => {
        const cwd = mkdtempSync(join(tmpdir(), 'claude-docs-'));
        dirs.push(cwd);
        gitIn(cwd, 'init', '-q', '-b', 'main');
        write(cwd, { 'README.md': '# T\n', ...baseFiles });
        gitIn(cwd, 'add', '-A');
        gitIn(cwd, 'commit', '-qm', 'base');
        gitIn(cwd, 'checkout', '-qb', 'feat');
        write(cwd, headFiles);
        for (const path of removed) rmSync(join(cwd, path));
        gitIn(cwd, 'add', '-A');
        gitIn(cwd, 'commit', '-qm', 'head');
        return cwd;
    };
    const exec = (cwd, env = {}, args = ['main', 'HEAD']) => {
        const out = [];
        const err = [];
        const code = main({ args, env, cwd, log: (line) => out.push(line), error: (line) => err.push(line) });
        return { code, out: out.join('\n'), err: err.join('\n') };
    };
    const story = { 'src/New.stories.tsx': '' };
    const docs = { 'CLAUDE.md': 'x', '.claude/skills/verify/x.md': 'x' };

    it('passes when nothing is added', () => {
        const { code, out } = exec(repo({}, { 'src/util.ts': '' }));
        expect(code).toBe(0);
        expect(out).toContain('No new page');
    });

    it('fails and names both missing docs for a new story', () => {
        const { code, out, err } = exec(repo({}, story));
        expect(code).toBe(1);
        expect(out).toContain('::error file=src/New.stories.tsx::Storybook has 1 page');
        expect(err).toContain('Update CLAUDE.md and .claude/skills/verify/ in the same PR');
    });

    it('names only the doc that is missing', () => {
        const { code, err } = exec(repo({}, { ...story, 'CLAUDE.md': 'x' }));
        expect(code).toBe(1);
        expect(err).toContain('Update .claude/skills/verify/ in the same PR');
    });

    it('passes when CLAUDE.md and the verify skill change too', () => {
        const { code, out } = exec(repo({}, { ...story, ...docs }));
        expect(code).toBe(0);
        expect(out).toContain('and updates CLAUDE.md and the verify skill');
    });

    it('warns instead of failing when SKIP_CLAUDE_DOCS is true', () => {
        const { code, out, err } = exec(repo({}, story), { SKIP_CLAUDE_DOCS: 'true' });
        expect(code).toBe(0);
        expect(out).toContain('::warning::');
        expect(err).toBe('');
    });

    it('does not skip for other SKIP_CLAUDE_DOCS values', () => {
        expect(exec(repo({}, story), { SKIP_CLAUDE_DOCS: '' }).code).toBe(1);
    });

    it('counts a file moved out of the verify skill as changing it', () => {
        const cwd = repo({ '.claude/skills/verify/old.md': 'x' }, { ...story, 'CLAUDE.md': 'x', 'docs/old.md': 'x' }, [
            '.claude/skills/verify/old.md',
        ]);
        expect(exec(cwd).code).toBe(0);
    });

    it('throws CheckError for a base ref that does not exist', () => {
        const cwd = repo({}, story);
        expect(() => exec(cwd, {}, ['nope', 'HEAD'])).toThrow(CheckError);
        expect(() => exec(cwd, {}, ['nope', 'HEAD'])).toThrow(/merge-base nope HEAD failed/);
    });

    it('throws CheckError outside a repository', () => {
        const cwd = mkdtempSync(join(tmpdir(), 'claude-docs-'));
        dirs.push(cwd);
        expect(() => exec(cwd, {}, ['main', 'HEAD'])).toThrow(CheckError);
    });

    it('throws CheckError for too many arguments', () => {
        expect(() => main({ args: ['a', 'b', 'c'] })).toThrow(/usage/);
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
