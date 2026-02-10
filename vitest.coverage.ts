
import { mergeConfig } from 'vitest/config';
import config from './vitest.config.ci';

export default mergeConfig(config, {
    test: {
        include: ['src/**/__tests__/*.test.{ts,tsx}'],
        exclude: ['src/stories/**', '**/*.stories.tsx', 'node_modules'],
        coverage: {
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/**/__tests__/**', 'src/stories/**', '**/*.stories.tsx', '**/*.d.ts', 'src/setupTests.ts', 'src/testUtils.ts'],
            provider: 'v8'
        }
    },
});
