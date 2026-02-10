
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

    describe('KeepPosition', () => {
        it('preserves position when controlled value matches mask pattern (no re-format)', () => {
            const { result, rerender } = renderHook(
                ({ value }) => useInputNumberMask({
                    template: 'dd/dd/dddd',
                    placeholder: 'mm/mm/yyyy',
                    keepPosition: true,
                    value
                }),
                { initialProps: { value: '12/12/2024' } }
            );

            expect(result.current.value).toBe('12/12/2024');

            // Simulate user deleting a digit (resulting in a placeholder)
            // The component would see the change and pass the new value prop
            rerender({ value: '12/1m/2024' });

            // Should NOT be re-formatted to '12/12/024m' or similar shift
            expect(result.current.value).toBe('12/1m/2024');
        });

        it('re-formats normally if value does not match mask pattern', () => {
            // This handles cases where maybe the parent passed a raw value or something unexpected
            const { result } = renderHook(() =>
                useInputNumberMask({
                    template: 'dd-dd',
                    placeholder: 'xx-xx',
                    keepPosition: true,
                    value: '1234' // Raw digits
                })
            );
            // Should format to '12-34'
            expect(result.current.value).toBe('12-34');
        });
    });
});
