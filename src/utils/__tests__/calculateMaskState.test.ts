import { describe, it, expect } from 'vitest';
import { calculateMaskState } from '../maskUtils';

describe('calculateMaskState', () => {
    const template = '(ddd) ddd-dddd';
    const placeholder = '(___) ___-____';

    it('handles basic insertion correctly', () => {
        // Initial state: empty mask "(___) ___-____"
        // User types '1' at index 1 (after first parenthesis)
        const current = '(___) ___-____';
        const result = calculateMaskState(
            current,
            template,
            placeholder,
            1, // start
            1, // end (no selection)
            'insert',
            '1',
            false // keepPosition
        );

        expect(result).toEqual({
            value: '(1__) ___-____',
            cursor: 2
        });
    });

    it('handles sequential insertion correctly (reproducing cursor bug)', () => {
        // Step 1: Type '1' -> "(1__) ..." cursor 2
        let current = '(1__) ___-____';

        // Step 2: Type '1' at cursor 2
        let result = calculateMaskState(
            current,
            template,
            placeholder,
            2,
            2,
            'insert',
            '1',
            false
        );

        expect(result).toEqual({
            value: '(11_) ___-____',
            cursor: 3
        });

        // Step 3: Type '1' at cursor 3
        current = result?.value || '';
        result = calculateMaskState(
            current,
            template,
            placeholder,
            3,
            3,
            'insert',
            '1',
            false
        );

        expect(result).toEqual({
            value: '(111) ___-____',
            cursor: 6 // Should skip ") "
        });

        // Step 4: Type '1' at cursor 6
        current = result?.value || '';
        result = calculateMaskState(
            current,
            template,
            placeholder,
            6,
            6,
            'insert',
            '1',
            false
        );

        expect(result).toEqual({
            value: '(111) 1__-____',
            cursor: 7
        });
    });

    it('handles backspace correctly', () => {
        const current = '(123) ___-____';
        // Cursor at 5 (after '3')
        const result = calculateMaskState(
            current,
            template,
            placeholder,
            5,
            5,
            'deleteBackward',
            '',
            false
        );

        expect(result).toEqual({
            value: '(12_) ___-____', // 3 removed
            cursor: 3 // Cursor moves back to before the deleted digit (index 3)
            // ( d d d )
            // 0 1 2 3 4
            // at index 1 is char 1
            // at index 2 is char 2
            // at index 3 is char 3
            // at index 4 is ')'
            // User cursor is at 5 (after ')')? Or at 4 (after '3')?
            // Test setup: "(123) " -> cursor probably at 6?
            // If cursor at 5 (after '3'), backspace removes '3'.
        });

        // Let's be precise.
        // "(123) "
        // 012345
        // '3' is at index 3.
        // If cursor is at 4 (after '3'), backspace removes 3.
        // Start=4, End=4.

        const res2 = calculateMaskState(
            '(123) ___-____',
            template,
            placeholder,
            4,
            4,
            'deleteBackward',
            '',
            false
        );

        expect(res2).toEqual({
            value: '(12_) ___-____',
            cursor: 3 // Should be before where 3 was
        });
    });

    it('handles keepPosition insertion (replace placeholder)', () => {
        // "(___) ..."
        // Type '1' at index 1
        const result = calculateMaskState(
            '(___) ___-____',
            template,
            placeholder,
            1,
            1,
            'insert',
            '1',
            true // keepPosition
        );

        expect(result).toEqual({
            value: '(1__) ___-____',
            cursor: 2
        });
    });

    it('handles backspace with keepPosition', () => {
        // "(1__) ..."
        // Cursor at 2. Backspace.
        const result = calculateMaskState(
            '(1__) ___-____',
            template,
            placeholder,
            2,
            2,
            'deleteBackward',
            '',
            true
        );

        expect(result).toEqual({
            value: '(___) ___-____',
            cursor: 1
        });
    });
});
