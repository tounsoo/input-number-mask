// Packs the built library, unpacks the tarball into a scratch project the way
// npm would install it, and types into the packed components through both the
// ESM and the CJS entry, in jsdom. Run after `pnpm build:lib`:
//   node .claude/skills/verify/consumer-smoke.mjs
// Exit 0 = PASS, 1 = FAIL, 2 = BLOCKED. Evidence stays in the printed folder.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const root = resolve(import.meta.dirname, '../../..');
const blocked = (why) => {
    console.log(`BLOCKED: ${why}`);
    process.exit(2);
};
if (!existsSync(join(root, 'dist/index.mjs'))) blocked('dist/ is missing, run pnpm build:lib first');
if (!existsSync(join(root, 'node_modules/react'))) blocked('node_modules is missing, run pnpm install first');

const work = mkdtempSync(join(tmpdir(), 'inm-consumer-'));
execFileSync('pnpm', ['pack', '--pack-destination', work], { cwd: root, stdio: 'ignore' });
const tarball = readdirSync(work).find((name) => name.endsWith('.tgz'));
if (!tarball) blocked('pnpm pack wrote no tarball');
const pkgDir = join(work, 'node_modules/@tounsoo/input-number-mask');
mkdirSync(pkgDir, { recursive: true });
execFileSync('tar', ['-xzf', join(work, tarball), '-C', pkgDir, '--strip-components=1']);
for (const dep of ['react', 'react-dom', '@testing-library/user-event']) {
    const link = join(work, 'node_modules', dep);
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(join(root, 'node_modules', dep), link, 'dir');
}
writeFileSync(join(work, 'esm.mjs'), "export * from '@tounsoo/input-number-mask';\n");

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
for (const key of Object.getOwnPropertyNames(dom.window)) {
    if (!(key in globalThis)) globalThis[key] = dom.window[key];
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const require = createRequire(join(work, 'consumer.cjs'));
const React = require('react');
const { createRoot } = require('react-dom/client');
const userEvent = require('@testing-library/user-event').default;
const entries = {
    'ESM (import)': await import(pathToFileURL(join(work, 'esm.mjs')).href),
    'CJS (require)': require('@tounsoo/input-number-mask'),
};

const failures = [];
const expect = (label, actual, expected) => {
    const ok = actual === expected;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`);
    if (!ok) failures.push(label);
};

const act = (step) => React.act(step);

const mount = async (element) => {
    const host = document.body.appendChild(document.createElement('div'));
    const reactRoot = createRoot(host);
    await act(async () => reactRoot.render(element));
    return { host, unmount: () => act(async () => reactRoot.unmount()) };
};

for (const [name, lib] of Object.entries(entries)) {
    const user = userEvent.setup({ document });
    const changes = [];

    const component = await mount(React.createElement(lib.InputNumberMask, {
        template: '(ddd) ddd-dddd',
        returnRawValue: true,
        onValueChange: (value) => changes.push(value),
    }));
    const input = component.host.querySelector('input');
    await act(() => user.click(input));
    await act(() => user.keyboard('5551234567'));
    expect(`${name} InputNumberMask typed`, input.value, '(555) 123-4567');
    expect(`${name} InputNumberMask raw onValueChange`, changes.at(-1), '5551234567');
    await act(() => user.keyboard('{Backspace}'));
    expect(`${name} InputNumberMask after Backspace`, input.value, '(555) 123-456');
    await component.unmount();

    const HookInput = () => {
        const { ref, value, rawValue } = lib.useInputNumberMask({ template: 'dd/dd/dddd' });
        return React.createElement('label', null,
            React.createElement('input', { ref, value, onChange: () => {} }),
            React.createElement('output', null, rawValue));
    };
    const hook = await mount(React.createElement(HookInput));
    const hookInput = hook.host.querySelector('input');
    await act(() => user.click(hookInput));
    await act(() => user.keyboard('12252026'));
    expect(`${name} useInputNumberMask typed`, hookInput.value, '12/25/2026');
    expect(`${name} useInputNumberMask rawValue`, hook.host.querySelector('output').textContent, '12252026');
    await hook.unmount();
}

console.log(`evidence: ${work} (${tarball})`);
if (failures.length) {
    console.log(`FAIL: ${failures.length} check(s) failed`);
    process.exit(1);
}
console.log('PASS: the packed ESM and CJS entries mask typed input');
