// Enforces the repo rule that a PR adding a page, a section or a check also updates
// CLAUDE.md and the verify skill. Usage: node scripts/check-claude-docs.mjs [base] [head]
// The workflow sets SKIP_CLAUDE_DOCS=true when the PR carries the skip label.
// Every detector compares totals at the merge base and at head, so moving or renaming
// something never fires; only a net increase does.
import { execFileSync } from 'node:child_process';
import { load } from 'js-yaml';

const SKIP_LABEL = 'skip-claude-docs-check';

// Mirrors the `stories` globs in .storybook/main.ts; the test suite guards against drift.
export const PAGE_PATH = /^src\/.*(?:\.mdx|\.stories\.(?:js|jsx|mjs|ts|tsx))$/;
const SECTION_PATH = /^(?:README\.md|src\/.*\.mdx)$/;
const WORKFLOW_DIR = '.github/workflows';
const WORKFLOW_PATH = /^\.github\/workflows\/[^/]+\.ya?ml$/;
const PR_TRIGGERS = ['pull_request', 'pull_request_target'];

const HEADING = /^ {0,3}#{1,6}(?:[ \t]|$)/;
const FENCE_OPEN = /^[ \t>]*(`{3,}|~{3,})/;
const FENCE_CLOSE = /^[ \t>]*(`{3,}|~{3,})[ \t]*$/;
const COMMENTS = [
    { open: /^\s*<!--/, close: '-->' },
    { open: /^\s*\{\/\*/, close: '*/}' },
];

class CheckError extends Error {}

const git = (...args) => {
    try {
        return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
        throw new CheckError(`git ${args.join(' ')} failed: ${String(error.stderr || error.message).trim()}`);
    }
};
const gitPaths = (...args) => git(...args, '-z').split('\0').filter(Boolean);

const snapshot = (rev) => {
    const files = new Set(gitPaths('ls-tree', '-r', '--name-only', rev));
    return { files, read: (path) => git('show', `${rev}:${path}`) };
};

const list = (items, limit = 5) =>
    items.length > limit ? `${items.slice(0, limit).join(', ')} and ${items.length - limit} more` : items.join(', ');

const pagesOf = (snap) => [...snap.files].filter((path) => PAGE_PATH.test(path));

export const detectPages = ({ base, head }) => {
    const before = pagesOf(base);
    const after = pagesOf(head);
    if (after.length <= before.length) return [];
    const known = new Set(before);
    const added = after.filter((path) => !known.has(path));
    const names = added.length ? ` (new: ${list(added)})` : '';
    return [{ kind: 'page', file: added[0] ?? after[0], detail: `Storybook has ${after.length} pages, up from ${before.length}${names}` }];
};

// Skips ATX-looking lines in code fences and comments, such as `# comment` in a bash block.
export const headingsOf = (markdown) => {
    const found = [];
    let fence = null;
    let commentEnd = null;
    for (const line of markdown.split(/\r?\n/)) {
        if (fence) {
            const close = FENCE_CLOSE.exec(line);
            if (close && close[1][0] === fence.char && close[1].length >= fence.length) fence = null;
            continue;
        }
        if (commentEnd) {
            if (line.includes(commentEnd)) commentEnd = null;
            continue;
        }
        const comment = COMMENTS.find(({ open }) => open.test(line));
        if (comment) {
            const rest = line.replace(comment.open, '');
            if (!rest.includes(comment.close)) commentEnd = comment.close;
            continue;
        }
        const open = FENCE_OPEN.exec(line);
        if (open) {
            fence = { char: open[1][0], length: open[1].length };
        } else if (HEADING.test(line)) {
            found.push(line.replace(/^ {0,3}#{1,6}[ \t]*/, '').replace(/[ \t]+#+[ \t]*$/, '').trim());
        }
    }
    return found;
};

const headingsIn = (snap) =>
    [...snap.files]
        .filter((path) => SECTION_PATH.test(path))
        .flatMap((file) => headingsOf(snap.read(file)).map((text) => ({ file, text })));

export const detectSections = ({ base, head }) => {
    const before = headingsIn(base);
    const after = headingsIn(head);
    if (after.length <= before.length) return [];
    const remaining = new Map();
    for (const { text } of before) remaining.set(text, (remaining.get(text) ?? 0) + 1);
    const added = after.filter(({ text }) => {
        const left = remaining.get(text) ?? 0;
        remaining.set(text, left - 1);
        return left <= 0;
    });
    const names = added.length ? ` (new: ${list(added.map(({ file, text }) => `"${text}" in ${file}`))})` : '';
    return [
        {
            kind: 'section',
            file: added[0]?.file ?? 'README.md',
            detail: `Docs have ${after.length} headings, up from ${before.length}${names}`,
        },
    ];
};

export const runsOnPullRequest = (on) => {
    if (typeof on === 'string') return PR_TRIGGERS.includes(on);
    if (Array.isArray(on)) return on.some((trigger) => PR_TRIGGERS.includes(trigger));
    if (on && typeof on === 'object') return PR_TRIGGERS.some((trigger) => trigger in on);
    return false;
};

// Parses every workflow once. A job without steps (a reusable-workflow call) counts 0 steps.
const parseWorkflows = (snap) => {
    const workflows = new Map();
    const invalid = new Set();
    for (const file of [...snap.files].filter((path) => WORKFLOW_PATH.test(path))) {
        try {
            workflows.set(file, load(snap.read(file)));
        } catch {
            invalid.add(file);
        }
    }
    return { workflows, invalid };
};

const prJobs = ({ workflows }, skip) =>
    [...workflows]
        .filter(([file, doc]) => !skip.has(file) && doc && typeof doc === 'object' && runsOnPullRequest(doc.on))
        .flatMap(([file, doc]) =>
            Object.entries(doc.jobs ?? {}).map(([id, job]) => ({ file, id, steps: Array.isArray(job?.steps) ? job.steps.length : 0 })),
        );

const sum = (jobs) => jobs.reduce((total, job) => total + job.steps, 0);

// GitHub reports a broken workflow itself, so a file that does not parse is left out of both sides.
export const detectChecks = ({ base, head, warn = console.log }) => {
    const baseParsed = parseWorkflows(base);
    const headParsed = parseWorkflows(head);
    for (const file of headParsed.invalid) {
        warn(`::warning file=${escapeProperty(file)}::${escapeData(`${file} is not valid YAML, so the Claude docs check skips it`)}`);
    }
    const skip = new Set([...baseParsed.invalid, ...headParsed.invalid]);
    const before = prJobs(baseParsed, skip);
    const after = prJobs(headParsed, skip);
    const findings = [];

    if (after.length > before.length) {
        const known = new Set(before.map((job) => job.id));
        const added = after.filter((job) => !known.has(job.id));
        const names = added.length ? ` (new: ${list(added.map((job) => `${job.id} in ${job.file}`))})` : '';
        findings.push({
            kind: 'check',
            file: added[0]?.file ?? WORKFLOW_DIR,
            detail: `PR workflows have ${after.length} jobs, up from ${before.length}${names}`,
        });
    }
    if (sum(after) > sum(before)) {
        const stepsByFile = (jobs) => jobs.reduce((map, job) => map.set(job.file, (map.get(job.file) ?? 0) + job.steps), new Map());
        const previous = stepsByFile(before);
        const grown = [...stepsByFile(after)].filter(([file, steps]) => steps > (previous.get(file) ?? 0)).map(([file]) => file);
        findings.push({
            kind: 'check',
            file: grown[0] ?? WORKFLOW_DIR,
            detail: `PR workflows have ${sum(after)} steps, up from ${sum(before)}${grown.length ? ` (more in: ${list(grown)})` : ''}`,
        });
    }
    return findings;
};

const detectors = [detectPages, detectSections, detectChecks];

const escapeData = (text) => text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProperty = (text) => escapeData(text).replace(/:/g, '%3A').replace(/,/g, '%2C');

const main = () => {
    const args = process.argv.slice(2);
    if (args.length > 2) throw new CheckError('usage: node scripts/check-claude-docs.mjs [base] [head]');
    const [baseRef = 'origin/main', headRef = 'HEAD'] = args;

    let mergeBase;
    try {
        mergeBase = git('merge-base', baseRef, headRef).trim();
    } catch (error) {
        const hint = args.length < 1 ? ' Run `git fetch origin main` first; in a shallow clone, fetch more history (`git fetch --unshallow`).' : '';
        throw new CheckError(`${error.message}${hint}`);
    }
    const head = git('rev-parse', '--verify', `${headRef}^{commit}`).trim();
    const context = { base: snapshot(mergeBase), head: snapshot(head) };
    const findings = detectors.flatMap((detect) => detect(context));

    if (findings.length === 0) {
        console.log('✓ No new page, section or check, so CLAUDE.md and the verify skill need no update');
        return 0;
    }

    const changed = gitPaths('diff', '--name-only', mergeBase, head);
    const missing = [];
    if (!changed.includes('CLAUDE.md')) missing.push('CLAUDE.md');
    if (!changed.some((path) => path.startsWith('.claude/skills/verify/'))) missing.push('.claude/skills/verify/');
    const summary = findings.map((f) => `  - [${f.kind}] ${f.detail}`).join('\n');

    if (missing.length === 0) {
        console.log(`✓ This PR adds:\n${summary}\nand updates CLAUDE.md and the verify skill`);
        return 0;
    }
    if (process.env.SKIP_CLAUDE_DOCS === 'true') {
        console.log(`This PR adds:\n${summary}`);
        console.log(`::warning::The ${SKIP_LABEL} label skips the check that this PR updates ${missing.join(' and ')}`);
        return 0;
    }

    for (const f of findings) console.log(`::error file=${escapeProperty(f.file)}::${escapeData(f.detail)}`);
    console.error(
        [
            `This PR adds:\n${summary}`,
            '',
            `Update ${missing.join(' and ')} in the same PR to describe the change. The Conventions section of CLAUDE.md defines what counts as a page, a section and a check.`,
            `If this is a false positive, a maintainer can add the ${SKIP_LABEL} label.`,
        ].join('\n'),
    );
    return 1;
};

if (import.meta.main) {
    try {
        process.exit(main());
    } catch (error) {
        if (!(error instanceof CheckError)) throw error;
        console.error(error.message);
        process.exit(2);
    }
}
