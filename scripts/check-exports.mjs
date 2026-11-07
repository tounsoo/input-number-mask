// Checks that the built package exposes the public API in all three places a
// consumer can reach it: the ESM entry, the CJS entry and both type entries.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const values = ['InputNumberMask', 'InputNumberMaskContentEditable', 'useInputNumberMask', 'useContentEditableMask'];
const types = [
    'InputNumberMaskProps',
    'InputNumberMaskContentEditableProps',
    'UseInputNumberMaskProps',
    'UseInputNumberMaskReturn',
    'UseContentEditableMaskProps',
    'UseContentEditableMaskReturn',
];

const failures = [];
const expectExact = (label, actual, expected) => {
    const missing = expected.filter((name) => !actual.includes(name));
    const extra = actual.filter((name) => !expected.includes(name));
    if (missing.length) failures.push(`${label} is missing: ${missing.join(', ')}`);
    if (extra.length) failures.push(`${label} has unexpected exports: ${extra.join(', ')}`);
};

const esm = await import('../dist/index.mjs');
expectExact('dist/index.mjs', Object.keys(esm), values);

const cjs = createRequire(import.meta.url)('../dist/index.cjs');
expectExact('dist/index.cjs', Object.keys(cjs), values);

for (const file of ['dist/index.d.ts', 'dist/index.d.cts']) {
    const path = fileURLToPath(new URL(`../${file}`, import.meta.url));
    const program = ts.createProgram([path], { noEmit: true, strict: true });
    const source = program.getSourceFile(path);
    if (!source) {
        failures.push(`${file} was not found`);
        continue;
    }
    for (const diagnostic of ts.getPreEmitDiagnostics(program, source)) {
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ');
        failures.push(`${file} has a type error: ${message}`);
    }
    const checker = program.getTypeChecker();
    const moduleSymbol = checker.getSymbolAtLocation(source);
    const names = moduleSymbol ? checker.getExportsOfModule(moduleSymbol).map((s) => s.getName()) : [];
    expectExact(file, names, [...values, ...types]);
}

if (failures.length) {
    console.error(failures.map((f) => `✗ ${f}`).join('\n'));
    process.exit(1);
}
console.log(`✓ ${values.length} values and ${types.length} types exported from ESM, CJS and both type entries`);
