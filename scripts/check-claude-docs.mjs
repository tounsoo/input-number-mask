// Enforces the repo rule that a PR adding a page, a section or a check also updates
// CLAUDE.md and the verify skill. Usage: node scripts/check-claude-docs.mjs [base] [head]
// PR_LABELS holds a JSON array of the PR's label names.
import { execFileSync } from 'node:child_process';
import { load } from 'js-yaml';

const SKIP_LABEL = 'skip-claude-docs-check';

const REQUIRED_DOCS = [
    { label: 'CLAUDE.md', matches: (path) => path === 'CLAUDE.md', update: 'the CLAUDE.md at the repo root' },
    {
        label: '.claude/skills/verify/',
        matches: (path) => path.startsWith('.claude/skills/verify/'),
        update: 'the verify skill under .claude/skills/verify/',
    },
];

// The same globs .storybook/main.ts gives Storybook.
const PAGE_PATH = /^src\/.*(?:\.mdx|\.stories\.(?:js|jsx|mjs|ts|tsx))$/;
const SECTION_PATH = /^(?:README\.md|src\/.*\.mdx)$/;
const WORKFLOW_PATH = /^\.github\/workflows\/[^/]+\.ya?ml$/;
const PR_TRIGGERS = ['pull_request', 'pull_request_target'];

const HEADING = /^ {0,3}#{1,6}(?:[ \t]|$)/;
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})\s*$/;

class UsageError extends Error {}

const git = (...args) => {
    try {
        return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
        throw new UsageError(`git ${args.join(' ')} failed: ${String(error.stderr || error.message).trim()}`);
    }
};
const gitPaths = (...args) => git(...args, '-z').split('\0').filter(Boolean);

const snapshot = (rev) => {
    const files = new Set(gitPaths('ls-tree', '-r', '--name-only', rev));
    return { files, read: (path) => git('show', `${rev}:${path}`) };
};

const detectPages = ({ added }) =>
    added
        .filter((path) => PAGE_PATH.test(path))
        .map((file) => ({ kind: 'page', file, detail: `New Storybook page ${file}` }));

// Skips ATX-looking lines in fenced code, such as `# comment` in a bash block.
const headingsOf = (markdown) => {
    const found = [];
    let fence = null;
    for (const line of markdown.split(/\r?\n/)) {
        if (fence) {
            const close = FENCE_CLOSE.exec(line);
            if (close && close[1][0] === fence.char && close[1].length >= fence.length) fence = null;
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

// A file new at head is a page, not a section, so only files present in both snapshots count.
const detectSections = ({ base, head }) => {
    const findings = [];
    for (const file of [...head.files].filter((path) => SECTION_PATH.test(path) && base.files.has(path))) {
        const before = headingsOf(base.read(file));
        const after = headingsOf(head.read(file));
        if (after.length <= before.length) continue;
        const known = new Set(before);
        const added = after.filter((text) => !known.has(text)).map((text) => `"${text}"`);
        const names = added.length ? `: ${added.join(', ')}` : '';
        findings.push({
            kind: 'section',
            file,
            detail: `${file} has ${after.length} headings, up from ${before.length} (new section${names})`,
        });
    }
    return findings;
};

const runsOnPullRequest = (on) => {
    if (typeof on === 'string') return PR_TRIGGERS.includes(on);
    if (Array.isArray(on)) return on.some((trigger) => PR_TRIGGERS.includes(trigger));
    if (on && typeof on === 'object') return PR_TRIGGERS.some((trigger) => trigger in on);
    return false;
};

// Maps job id to step count for each PR workflow. Reusable-workflow jobs have no steps and count 0.
const prJobs = (snap, { strict }) => {
    const workflows = new Map();
    for (const file of [...snap.files].filter((path) => WORKFLOW_PATH.test(path))) {
        let doc;
        try {
            doc = load(snap.read(file));
        } catch (error) {
            if (strict) throw new UsageError(`${file} is not valid YAML: ${error.message}`);
            continue;
        }
        if (!doc || typeof doc !== 'object' || !runsOnPullRequest(doc.on)) continue;
        const jobs = new Map();
        for (const [id, job] of Object.entries(doc.jobs ?? {})) {
            jobs.set(id, Array.isArray(job?.steps) ? job.steps.length : 0);
        }
        workflows.set(file, jobs);
    }
    return workflows;
};

const detectChecks = ({ base, head }) => {
    const before = prJobs(base, { strict: false });
    const findings = [];
    for (const [file, jobs] of prJobs(head, { strict: true })) {
        for (const [id, steps] of jobs) {
            const previous = before.get(file)?.get(id);
            if (previous === undefined) {
                findings.push({ kind: 'check', file, detail: `New CI job ${id} in ${file}` });
            } else if (steps > previous) {
                findings.push({
                    kind: 'check',
                    file,
                    detail: `Job ${id} in ${file} has ${steps} steps, up from ${previous} (new check)`,
                });
            }
        }
    }
    return findings;
};

const detectors = [detectPages, detectSections, detectChecks];

const parseLabels = (raw) => {
    if (!raw || !raw.trim()) return [];
    let labels;
    try {
        labels = JSON.parse(raw);
    } catch {
        throw new UsageError('PR_LABELS must be a JSON array of label names');
    }
    if (!Array.isArray(labels) || !labels.every((label) => typeof label === 'string')) {
        throw new UsageError('PR_LABELS must be a JSON array of label names');
    }
    return labels;
};

const escapeData = (text) => text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProperty = (text) => escapeData(text).replace(/:/g, '%3A').replace(/,/g, '%2C');

const main = () => {
    const args = process.argv.slice(2);
    if (args.length > 2) throw new UsageError('usage: node scripts/check-claude-docs.mjs [base] [head]');
    const [baseRef = 'origin/main', headRef = 'HEAD'] = args;
    const labels = parseLabels(process.env.PR_LABELS);

    const mergeBase = git('merge-base', baseRef, headRef).trim();
    const head = git('rev-parse', '--verify', `${headRef}^{commit}`).trim();
    const context = {
        base: snapshot(mergeBase),
        head: snapshot(head),
        added: gitPaths('diff', '--name-only', '--diff-filter=A', '--find-renames', mergeBase, head),
    };
    const findings = detectors.flatMap((detect) => detect(context));

    if (findings.length === 0) {
        console.log('✓ No new page, section or check, so CLAUDE.md and the verify skill need no update');
        return 0;
    }

    const changed = gitPaths('diff', '--name-only', mergeBase, head);
    const missing = REQUIRED_DOCS.filter((doc) => !changed.some(doc.matches));
    const summary = findings.map((f) => `  - [${f.kind}] ${f.detail}`).join('\n');

    if (missing.length === 0) {
        console.log(`✓ This PR adds:\n${summary}\nand updates CLAUDE.md and the verify skill`);
        return 0;
    }
    if (labels.includes(SKIP_LABEL)) {
        console.log(`This PR adds:\n${summary}`);
        console.log(`::warning::The ${SKIP_LABEL} label skips the CLAUDE.md and verify skill check`);
        return 0;
    }

    for (const f of findings) console.log(`::error file=${escapeProperty(f.file)}::${escapeData(f.detail)}`);
    console.error(
        [
            `This PR adds:\n${summary}`,
            '',
            `A PR that adds a page, a section or a check also updates CLAUDE.md and the verify skill in the same PR. Missing from this PR: ${missing.map((doc) => doc.label).join(' and ')}.`,
            `Update ${missing.map((doc) => doc.update).join(' and ')} to describe the change.`,
            `If this is a false positive, a maintainer can add the ${SKIP_LABEL} label.`,
        ].join('\n'),
    );
    return 1;
};

try {
    process.exit(main());
} catch (error) {
    if (!(error instanceof UsageError)) throw error;
    console.error(error.message);
    process.exit(2);
}
