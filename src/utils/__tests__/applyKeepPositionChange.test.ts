import { describe, it, expect } from 'vitest';
import { applyKeepPositionChange, isMatchWithMask } from '../maskUtils';

describe('applyKeepPositionChange', () => {
    const template = 'dd/dd/dddd';
    const placeholder = 'dd/mm/yyyy';

    describe('deletion (char === "")', () => {
        it('should replace a single digit slot with placeholder', () => {
            // "12/15/2024" -> delete index 4 (the '5') -> "12/1m/2024"
            const result = applyKeepPositionChange('12/15/2024', template, placeholder, 4, 5, '');
            expect(result.value).toBe('12/1m/2024');
            expect(result.cursor).toBe(4);
        });

        it('should replace a range of digit slots with placeholders', () => {
            // "12/15/2024" -> delete indices 3-5 ("15") -> "12/mm/2024"
            const result = applyKeepPositionChange('12/15/2024', template, placeholder, 3, 5, '');
            expect(result.value).toBe('12/mm/2024');
            expect(result.cursor).toBe(3);
        });

        it('should skip literal positions in range', () => {
            // "12/15/2024" -> delete indices 0-3 ("12/") -> "dd/15/2024" (only 0,1 are digit slots)
            const result = applyKeepPositionChange('12/15/2024', template, placeholder, 0, 3, '');
            expect(result.value).toBe('dd/15/2024');
            expect(result.cursor).toBe(0);
        });

        it('should use underscore if no placeholder', () => {
            const result = applyKeepPositionChange('12/15/2024', template, undefined, 4, 5, '');
            expect(result.value).toBe('12/1_/2024');
            expect(result.cursor).toBe(4);
        });

        it('should handle empty range (start === end, no-op for delete)', () => {
            const result = applyKeepPositionChange('12/15/2024', template, placeholder, 3, 3, '');
            expect(result.value).toBe('12/15/2024'); // No change
            expect(result.cursor).toBe(3);
        });

        it('should handle deleting placeholder characters (mm)', () => {
            // Original bug scenario step: "12/mm/2024" -> select "mm" (indices 3-5) and delete
            // Since "mm" are already placeholders, deleting them should keep them as placeholders
            const result = applyKeepPositionChange('12/mm/2024', template, placeholder, 3, 5, '');
            expect(result.value).toBe('12/mm/2024'); // No change (already placeholders)
            expect(result.cursor).toBe(3);
        });
    });

    describe('replacement (start !== end, char !== "")', () => {
        it('original bug: "12/15/2024" -> delete "15" -> "12/mm/2024"', () => {
            // Step 1: "12/15/2024" -> select "15" (indices 3-5) and delete -> "12/mm/2024"
            const result = applyKeepPositionChange('12/15/2024', template, placeholder, 3, 5, '');
            expect(result.value).toBe('12/mm/2024');
            expect(result.cursor).toBe(3);
        });

        it('original bug: "12/mm/2024" -> select "mm" and type "3" -> "12/3m/2024"', () => {
            // Step 2: "12/mm/2024" -> select "mm" (indices 3-5), type "3" -> "12/3m/2024"
            // Year "2024" should stay in position (not shift)
            const result = applyKeepPositionChange('12/mm/2024', template, placeholder, 3, 5, '3');
            expect(result.value).toBe('12/3m/2024');
            expect(result.cursor).toBe(4);
        });

        it('should clear range across literal and insert at first slot', () => {
            // "12/15/2024" -> select indices 1-5 ("2/15"), type "9" -> "19/mm/2024" (clear 1,3,4 to placeholders, insert '9' at 1)
            const result = applyKeepPositionChange('12/15/2024', template, placeholder, 1, 5, '9');
            expect(result.value).toBe('19/mm/2024');
            expect(result.cursor).toBe(2);
        });

        it('should not insert non-digit character but still clear', () => {
            // "12/15/2024" -> select indices 3-5 ("15"), type "a" -> "12/mm/2024" (cleared, no insert)
            const result = applyKeepPositionChange('12/15/2024', template, placeholder, 3, 5, 'a');
            expect(result.value).toBe('12/mm/2024');
            expect(result.cursor).toBe(3); // Cursor stays at start
        });

        it('should handle selecting digit+placeholder and typing replacement', () => {
            // Bug case: "12/3m/2024" -> select "3m" (indices 3-5), type "3"
            // User expectation: position 3 keeps "3", position 4 gets the NEW "3"
            // Result: "12/33/2024" with cursor at position 5
            const result = applyKeepPositionChange('12/3m/2024', template, placeholder, 3, 5, '3');
            expect(result.value).toBe('12/33/2024');
            expect(result.cursor).toBe(5);
        });

        it('should replace selection normally when first char differs from typed char', () => {
            // "12/5m/2024" -> select "5m" (indices 3-5), type "3"
            // Since "5" != "3", clear selection and insert "3" at first slot
            const result = applyKeepPositionChange('12/5m/2024', template, placeholder, 3, 5, '3');
            expect(result.value).toBe('12/3m/2024');
            expect(result.cursor).toBe(4);
        });
    });

    describe('insertion (start === end, char !== "")', () => {
        it('should insert digit at current position if it is a digit slot', () => {
            // "12/mm/2024" -> cursor at 3, type "5" -> "12/5m/2024"
            const result = applyKeepPositionChange('12/mm/2024', template, placeholder, 3, 3, '5');
            expect(result.value).toBe('12/5m/2024');
            expect(result.cursor).toBe(4);
        });

        it('should skip literal and insert at next digit slot', () => {
            // "12/mm/2024" -> cursor at 2 (on '/'), type "5" -> "12/5m/2024" (inserts at 3)
            const result = applyKeepPositionChange('12/mm/2024', template, placeholder, 2, 2, '5');
            expect(result.value).toBe('12/5m/2024');
            expect(result.cursor).toBe(4);
        });

        it('should not insert non-digit character', () => {
            // "12/mm/2024" -> cursor at 3, type "a" -> "12/mm/2024" (no change)
            const result = applyKeepPositionChange('12/mm/2024', template, placeholder, 3, 3, 'a');
            expect(result.value).toBe('12/mm/2024');
            expect(result.cursor).toBe(3);
        });

        it('should not insert if cursor is past template length', () => {
            // "12/15/2024" -> cursor at 10 (end), type "5" -> "12/15/2024" (no change)
            const result = applyKeepPositionChange('12/15/2024', template, placeholder, 10, 10, '5');
            expect(result.value).toBe('12/15/2024');
            expect(result.cursor).toBe(10);
        });
    });

    describe('integration with isMatchWithMask', () => {
        // Ensures that the output of applyKeepPositionChange is always considered a valid "match"
        // by the validation logic used in the hook. If this fails, the hook would accidentally 
        // re-format the valid keepPosition value, causing the bug.

        it('should produce a value that passes isMatchWithMask', () => {
            // "12/15/2024" -> delete '5' -> "12/1m/2024"
            const result = applyKeepPositionChange('12/15/2024', template, placeholder, 4, 5, '');
            expect(isMatchWithMask(result.value, template, placeholder)).toBe(true);
        });

        it('should pass with underscores if no placeholder provided', () => {
            const result = applyKeepPositionChange('12/15/2024', template, undefined, 4, 5, '');
            // "12/1_/2024"
            expect(isMatchWithMask(result.value, template, undefined)).toBe(true);
        });
    });
});
