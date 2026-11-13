// Enforces the repo rule that a PR adding a page, a section or a check also updates
// CLAUDE.md and the verify skill. Usage: node scripts/check-claude-docs.mjs [base] [head]
// The workflow sets SKIP_CLAUDE_DOCS=true when the PR carries the skip label.
// Every detector compares totals at the merge base and at head, so only a net increase fires.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Loaded lazily so a missing install exits 2 in the CLI instead of crashing on import.
let load;
let YAMLException;
let mdxLoader;
let loadError;
try {
    ({ load, YAMLException } = await import('js-yaml'));
    ({ default: mdxLoader } = await import('@storybook/addon-docs/mdx-loader'));
} catch (error) {
    loadError = error;
}

const SKIP_LABEL = 'skip-claude-docs-check';

// Mirrors the `stories` globs in .storybook/main.ts; the test suite guards against drift.
export const PAGE_PATH = /^src\/.*(?:\.mdx|\.stories\.(?:js|jsx|mjs|ts|tsx))$/;
const SECTION_PATH = /^(?:README\.md|src\/.*\.mdx)$/;
const WORKFLOW_PATH = /^\.github\/workflows\/[^/]+\.ya?ml$/;
const PR_TRIGGERS = ['pull_request', 'pull_request_target'];

export class CheckError extends Error {}

const requireModules = () => {
    if (loadError) throw new CheckError('js-yaml or @storybook/addon-docs is not installed; run `pnpm install --frozen-lockfile`');
};

const git = (cwd, ...args) => {
    try {
        return execFileSync('git', args, {
            cwd,
            encoding: 'utf8',
            maxBuffer: 64 * 1024 * 1024,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
    } catch (error) {
        throw new CheckError(`git ${args.join(' ')} failed: ${String(error.stderr || error.message).trim()}`);
    }
};
const gitPaths = (cwd, ...args) =>
    git(cwd, ...args, '-z')
        .split('\0')
        .filter(Boolean);

const snapshot = (cwd, rev) => ({
    files: new Set(gitPaths(cwd, 'ls-tree', '-r', '--name-only', rev)),
    read: (path) => git(cwd, 'show', `${rev}:${path}`),
});

const list = (items, limit = 5) =>
    items.length > limit ? `${items.slice(0, limit).join(', ')} and ${items.length - limit} more` : items.join(', ');

const count = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;

// Every detector reports items { key, file, label } for one snapshot. A larger head total fires;
// the items head has beyond base (matched by key, duplicates counted) are the new ones, so a
// larger total always leaves at least one.
const grew = ({ kind, subject, noun, word = 'new', before, after }) => {
    if (after.length <= before.length) return [];
    const unmatched = new Map();
    for (const { key } of before) unmatched.set(key, (unmatched.get(key) ?? 0) + 1);
    const fresh = after.filter(({ key }) => {
        const left = unmatched.get(key) ?? 0;
        if (left > 0) unmatched.set(key, left - 1);
        return left <= 0;
    });
    const names = list([...new Set(fresh.map(({ label }) => label))]);
    return [
        {
            kind,
            file: fresh[0].file,
            detail: `${subject} ${count(after.length, noun)}, up from ${before.length} (${word}: ${names})`,
        },
    ];
};

const pagesOf = (snap) => [...snap.files].filter((path) => PAGE_PATH.test(path)).map((path) => ({ key: path, file: path, label: path }));

export const detectPages = ({ base, head }) =>
    grew({
        kind: 'page',
        subject: 'Storybook has',
        noun: 'page',
        before: pagesOf(base),
        after: pagesOf(head),
    });

// Front matter opens with a `key:` line, which tells it apart from a leading horizontal rule.
const FRONT_MATTER = /^﻿?---\r?\n(?=[\w-]+:)[\s\S]*?\r?\n---[ \t]*(?=\r?\n|$)/;
const blank = (text) => text.replace(/[^\n]/g, ' ');

const textOf = (node) => node.value ?? (node.children ?? []).map(textOf).join('');
// A component decides what to render, and Storybook's <Canvas> drops its children, so headings
// inside a component don't count. An HTML element such as <div> renders its children.
const isComponent = (node) => node.type.startsWith('mdxJsx') && /^[A-Z]|\./.test(node.name ?? '');
const collectNodes = (node, found) => {
    if (node.type === 'heading') found.push(textOf(node).trim());
    if (isComponent(node)) return found;
    for (const child of node.children ?? []) collectNodes(child, found);
    return found;
};

// Runs Storybook's MDX compiler, which parses with remark, and a remark plugin that reads the
// headings it parsed. As `md` it reads CommonMark, which GitHub's Markdown extends; as `mdx`, MDX.
const parseHeadings = (source, format, file) =>
    new Promise((settle, fail) => {
        let found;
        const readHeadings = () => (tree) => {
            found = collectNodes(tree, []);
        };
        const done = (error) => {
            if (error) fail(error);
            else if (!found)
                fail(new CheckError('@storybook/addon-docs/mdx-loader ran without the heading reader; its options may have changed'));
            else settle(found);
        };
        // A loader that throws before its own try rejects instead of calling back.
        Promise.resolve(
            mdxLoader.call(
                {
                    async: () => done,
                    getOptions: () => ({
                        mdxCompileOptions: { format, remarkPlugins: [readHeadings] },
                    }),
                    resourcePath: file,
                },
                source
            )
        ).catch(fail);
    });

// README.md is read as CommonMark, skipping front matter, which GitHub shows as a table.
// An .mdx file is read by the compiler Storybook renders it with, so a page's headings match.
export const headingsOf = async (markdown, { mdx = false, file = 'docs.mdx' } = {}) => {
    requireModules();
    return mdx ? parseHeadings(markdown, 'mdx', file) : parseHeadings(markdown.replace(FRONT_MATTER, blank), 'md', file);
};

// The MDX compiler reports a syntax error as a vfile message.
const isMdxError = (error) => typeof error?.reason === 'string' && 'ruleId' in error;

const parseDocs = async (snap) => {
    const docs = new Map();
    const invalid = new Set();
    for (const file of [...snap.files].filter((path) => SECTION_PATH.test(path))) {
        try {
            docs.set(file, await headingsOf(snap.read(file), { mdx: file.endsWith('.mdx'), file }));
        } catch (error) {
            if (!isMdxError(error)) throw error;
            invalid.add(file);
        }
    }
    return { docs, invalid };
};

// Compared by text alone, so a heading moved between files names nothing new.
const headingItems = ({ docs }, skip) =>
    [...docs]
        .filter(([file]) => !skip.has(file))
        .flatMap(([file, headings]) =>
            headings.map((text) => ({
                key: text,
                file,
                label: `"${text}" in ${file}`,
            }))
        );

// Storybook's build reports a broken .mdx file itself. One invalid on either side is left out of
// both, so neither breaking nor repairing it counts its headings as new.
export const detectSections = async ({ base, head, warn = console.log }) => {
    const baseParsed = await parseDocs(base);
    const headParsed = await parseDocs(head);
    for (const file of headParsed.invalid) {
        warn(`::warning file=${escapeProperty(file)}::${escapeData(`${file} is not valid MDX, so the Claude docs check skips it`)}`);
    }
    const skip = new Set([...baseParsed.invalid, ...headParsed.invalid]);
    return grew({
        kind: 'section',
        subject: 'Docs have',
        noun: 'heading',
        before: headingItems(baseParsed, skip),
        after: headingItems(headParsed, skip),
    });
};

export const runsOnPullRequest = (on) => {
    if (typeof on === 'string') return PR_TRIGGERS.includes(on);
    if (Array.isArray(on)) return on.some((trigger) => PR_TRIGGERS.includes(trigger));
    if (on && typeof on === 'object') return PR_TRIGGERS.some((trigger) => trigger in on);
    return false;
};

// Parses every workflow once. A job without steps (a reusable-workflow call) counts 0 steps.
const parseWorkflows = (snap) => {
    requireModules();
    const workflows = new Map();
    const invalid = new Set();
    for (const file of [...snap.files].filter((path) => WORKFLOW_PATH.test(path))) {
        try {
            workflows.set(file, load(snap.read(file)));
        } catch (error) {
            if (!(error instanceof YAMLException)) throw error;
            invalid.add(file);
        }
    }
    return { workflows, invalid };
};

const prJobs = ({ workflows }, skip) =>
    [...workflows]
        .filter(([file, doc]) => !skip.has(file) && doc && typeof doc === 'object' && runsOnPullRequest(doc.on))
        .flatMap(([file, doc]) =>
            Object.entries(doc.jobs ?? {}).map(([id, job]) => ({
                file,
                id,
                steps: Array.isArray(job?.steps) ? job.steps.length : 0,
            }))
        );

const jobItems = (jobs) =>
    jobs.map(({ file, id }) => ({
        key: `${file}:${id}`,
        file,
        label: `${id} in ${file}`,
    }));
const stepItems = (jobs) => jobs.flatMap(({ file, steps }) => Array.from({ length: steps }, () => ({ key: file, file, label: file })));

// GitHub reports a broken workflow itself. One invalid at head is left out of both sides; one
// invalid only at base never ran, so it counts as empty there and repairing it fires.
export const detectChecks = ({ base, head, warn = console.log }) => {
    const baseParsed = parseWorkflows(base);
    const headParsed = parseWorkflows(head);
    for (const file of headParsed.invalid) {
        warn(`::warning file=${escapeProperty(file)}::${escapeData(`${file} is not valid YAML, so the Claude docs check skips it`)}`);
    }
    const before = prJobs(baseParsed, headParsed.invalid);
    const after = prJobs(headParsed, headParsed.invalid);
    const subject = 'PR workflows have';
    return [
        ...grew({
            kind: 'check',
            subject,
            noun: 'job',
            before: jobItems(before),
            after: jobItems(after),
        }),
        ...grew({
            kind: 'check',
            subject,
            noun: 'step',
            word: 'more in',
            before: stepItems(before),
            after: stepItems(after),
        }),
    ];
};

const detectors = [detectPages, detectSections, detectChecks];

const escapeData = (text) => text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProperty = (text) => escapeData(text).replace(/:/g, '%3A').replace(/,/g, '%2C');

// Returns the exit code: 0 passes, 1 means docs are missing. Failures to run throw CheckError.
export const main = async ({ args = [], env = {}, cwd = process.cwd(), log = console.log, error = console.error } = {}) => {
    if (args.length > 2) throw new CheckError('usage: node scripts/check-claude-docs.mjs [base] [head]');
    const [baseRef = 'origin/main', headRef = 'HEAD'] = args;

    let mergeBase;
    try {
        mergeBase = git(cwd, 'merge-base', baseRef, headRef).trim();
    } catch (cause) {
        const hint =
            args.length < 1 ? ' Run `git fetch origin main` first; in a shallow clone, fetch more history (`git fetch --unshallow`).' : '';
        throw new CheckError(`${cause.message}${hint}`);
    }
    const head = git(cwd, 'rev-parse', '--verify', `${headRef}^{commit}`).trim();
    const context = {
        base: snapshot(cwd, mergeBase),
        head: snapshot(cwd, head),
        warn: log,
    };
    const findings = [];
    for (const detect of detectors) findings.push(...(await detect(context)));

    if (findings.length === 0) {
        log('✓ No new page, section or check, so CLAUDE.md and the verify skill need no update');
        return 0;
    }

    // --no-renames lists both sides, so moving a file out of the verify skill still counts as changing it.
    const changed = gitPaths(cwd, 'diff', '--name-only', '--no-renames', mergeBase, head);
    const missing = [];
    if (!changed.includes('CLAUDE.md')) missing.push('CLAUDE.md');
    if (!changed.some((path) => path.startsWith('.claude/skills/verify/'))) missing.push('.claude/skills/verify/');
    const summary = findings.map((f) => `  - [${f.kind}] ${f.detail}`).join('\n');

    if (missing.length === 0) {
        log(`✓ This PR adds:\n${summary}\nand updates CLAUDE.md and the verify skill`);
        return 0;
    }
    if (env.SKIP_CLAUDE_DOCS === 'true') {
        log(`This PR adds:\n${summary}`);
        log(`::warning::The ${SKIP_LABEL} label skips the check that this PR updates ${missing.join(' and ')}`);
        return 0;
    }

    for (const f of findings) log(`::error file=${escapeProperty(f.file)}::${escapeData(f.detail)}`);
    error(
        [
            `This PR adds:\n${summary}`,
            '',
            `Update ${missing.join(
                ' and '
            )} in the same PR to describe the change. The Conventions section of CLAUDE.md defines what counts as a page, a section and a check.`,
            `If this is a false positive, a maintainer can add the ${SKIP_LABEL} label.`,
        ].join('\n')
    );
    return 1;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        requireModules();
        process.exit(await main({ args: process.argv.slice(2), env: process.env }));
    } catch (error) {
        console.error(error instanceof CheckError ? error.message : error?.stack ?? String(error));
        process.exit(2);
    }
}
