import { dts } from 'rollup-plugin-dts';

// Bundles the library's declarations into one file per entry. A single file has no
// relative imports, so it resolves the same way under every moduleResolution mode.
// The .d.cts copy types the `require` entry as CommonJS, since the package is
// "type": "module" and a .d.ts would be read as ESM there.
export default {
    input: 'src/index.ts',
    output: [
        { file: 'dist/index.d.ts', format: 'es' },
        { file: 'dist/index.d.cts', format: 'es' },
    ],
    plugins: [dts({ tsconfig: 'tsconfig.lib.json' })],
};
