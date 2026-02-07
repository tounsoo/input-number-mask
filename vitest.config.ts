import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { resolve } from 'path';

export default defineConfig({
    plugins: [storybookTest()],
    test: {
        browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [
                { browser: 'chromium' },
            ],
        },
        isolate: false,
        setupFiles: ['./.storybook/vitest.setup.ts'],
        alias: {
            'react': resolve(__dirname, './node_modules/react'),
            'react-dom': resolve(__dirname, './node_modules/react-dom'),
        },
    },
    resolve: {
        dedupe: ['react', 'react-dom'],
    },
});
