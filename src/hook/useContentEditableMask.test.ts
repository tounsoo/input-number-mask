import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useContentEditableMask } from './useContentEditableMask';

// Mock window.getSelection and Range for hook internals
// The hook uses cleanInput/formatWithMask which are pure, but it also uses layout effects that might access DOM.
// However, renderHook generally renders in a test environment.
// useContentEditableMask accesses ref.current which might be null during initial renderHook if not attached?
// Actually, the hook returns a ref that the consumer attaches.
// In renderHook, we don't easily attach the ref to a real DOM element unless we use a wrapper.
// But we can test the state logic (value, initialization) which doesn't depend on the ref being attached immediately,
// except for the layout effects that might try to restore cursor.
// Let's see if we can test the value state without full DOM interaction.

describe('useContentEditableMask', () => {
    describe('Initialization', () => {
        it('initializes with formatted empty string by default', () => {
            const { result } = renderHook(() => useContentEditableMask({ template: 'dd-dd' }));
            // formatWithMask('', 'dd-dd') -> '__-__' (if default placeholder logic applies? 
            // Wait, formatWithMask implementation:
            // if digits empty, it appends placeholder if exists, or nothing if not?
            // Actually usually it formats to empty string if input empty?
            // Let's check formatWithMask behavior in previous steps.
            // step 249: formatWithMask loops template. if slot, checks digit. if no digit, uses placeholder or breaks if no placeholder.
            // If we don't provide placeholder, and digits are empty, it returns empty string?
            // "dd-dd", no placeholder.
            // i=0 d. digits empty. no placeholder. breaks.
            // result is empty.
            expect(result.current.value).toBe('');
        });

        it('initializes with formatted updated string if placeholder provided', () => {
            const { result } = renderHook(() => useContentEditableMask({ template: 'dd-dd', placeholder: '__-__' }));
            // "dd-dd", placeholder "__-__"
            // i=0 d. digits empty. uses placeholder '_'. res="_".
            // i=1 d. uses '_'. res="__".
            // i=2 -. literal. res="__-".
            // ...
            expect(result.current.value).toBe('__-__');
        });
    });

    describe('Controlled', () => {
        it('initializes with formatted controlled value', () => {
            const { result } = renderHook(() =>
                useContentEditableMask({ template: 'dd-dd', value: '1234' })
            );
            expect(result.current.value).toBe('12-34');
        });

        it('updates when controlled value changes', () => {
            const { result, rerender } = renderHook(
                ({ value }) => useContentEditableMask({ template: 'dd-dd', value }),
                { initialProps: { value: '1234' } }
            );

            expect(result.current.value).toBe('12-34');

            // Update prop
            rerender({ value: '5678' });

            expect(result.current.value).toBe('56-78');
        });

        it('handles partial controlled value updates without placeholder', () => {
            const { result } = renderHook(
                () => useContentEditableMask({ template: 'dd-dd', value: '12' })
            );
            // "12" -> "12-"
            expect(result.current.value).toBe('12-');
        });

        it('handles partial controlled value updates with placeholder', () => {
            const { result } = renderHook(
                () => useContentEditableMask({
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
                ({ value }) => useContentEditableMask({
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
                useContentEditableMask({
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
