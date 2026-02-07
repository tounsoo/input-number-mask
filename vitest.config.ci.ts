/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CI-specific Vite config - runs unit tests only, no Storybook browser tests
export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/setupTests.ts',
        include: ['src/**/*.test.{ts,tsx}'],
        exclude: ['**/node_modules/**', '**/dist/**'],
    }
});
