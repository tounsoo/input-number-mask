
import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useInputNumberMask } from './useInputNumberMask';

describe('useInputNumberMask', () => {
    describe('Initialization', () => {
        it('initializes with empty string by default', () => {
            const { result } = renderHook(() => useInputNumberMask({ template: 'dd-dd' }));
            expect(result.current.value).toBe('');
        });
    });

    describe('Controlled', () => {
        it('initializes with formatted controlled value', () => {
            const { result } = renderHook(() =>
                useInputNumberMask({ template: 'dd-dd', value: '1234' })
            );
            expect(result.current.value).toBe('12-34');
        });

        it('updates when controlled value changes', () => {
            const { result, rerender } = renderHook(
                ({ value }) => useInputNumberMask({ template: 'dd-dd', value }),
                { initialProps: { value: '1234' } }
            );

            expect(result.current.value).toBe('12-34');

            // Update prop
            rerender({ value: '5678' });

            expect(result.current.value).toBe('56-78');
        });

        it('handles partial controlled value updates without placeholder', () => {
            const { result } = renderHook(
                () => useInputNumberMask({ template: 'dd-dd', value: '12' })
            );
            // "12" -> "12-"
            expect(result.current.value).toBe('12-');
        });

        it('handles partial controlled value updates with placeholder', () => {
            const { result } = renderHook(
                () => useInputNumberMask({
                    template: 'dd-dd',
                    value: '12',
                    placeholder: 'dd-dd'
                })
            );
            // "12" -> "12-dd"
            expect(result.current.value).toBe('12-dd');
        });
    });
});
