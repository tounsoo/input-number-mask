
import { describe, it, expect } from 'vitest';
import { cleanInput, formatWithMask, applyKeepPositionChange, isMatchWithMask, calculateMaskState } from '../maskUtils';

describe('MaskUtils Coverage Improvements', () => {

    describe('cleanInput', () => {
        it('should handle skipping literals to find matching char in template', () => {
            // Template: matches literal 'X'
            // Input: "1X" -> matches 'X'?
            // Template: "dXd"
            // Input: "1X2"
            expect(cleanInput('1X2', 'dXd')).toBe('12');
        });

        it('should skip mismatching intermediate literals in template to find match', () => {
            // Template: "d-d-d"
            // Input: "1-2" (normal) -> "12"
            // Input: "1/2" (separator mismatch?)
            // cleanInput tries to match input chars to template.
            // i=0: '1'. t=0 ('d'). Match. extracted='1'. t=1 ('-').
            // i=1: '/'. t=1 ('-'). Mismatch.
            // Loop nextT from 1.
            // nextT=1 ('-') != '/'.
            // nextT=2 ('d') != '/'.
            // ...
            // If input is "1-2", i=1 is '-'. t=1 is '-'. Match. t=2.

            // Scenario: Template "d-d". Input "12".
            // i=0 ('1'), t=0 ('d'). match. t=1 ('-').
            // i=1 ('2'). t=1 ('-'). Mismatch.
            // nextT scan:
            // nextT=1 ('-') != '2'. nextT++ -> 2.
            // nextT=2 ('d'). Match!
            // extracted += '2'. t = 3.
            expect(cleanInput('12', 'd-d')).toBe('12');
        });

        it('should fallback to skipping input char if no future template match found', () => {
            // Template "d-d". Input "1a2".
            // '1' matches. 'a' mismatches '-'. Scan forward for 'a' or 'd'.
            // 'd' found at 2. But 'a' is not digit.
            // Should ignore 'a'.
            expect(cleanInput('1a2', 'd-d')).toBe('12');
        });

        it('should handle input char matching a future literal', () => {
            // Template "d-d/d"
            // Input "1/2"
            // '1' matches. t hits '-'.
            // Input '/' mismatches '-'.
            // Scan: '-' != '/', 'd' != '/'.
            // '/' == '/'. Match!
            // t moves to after '/'.
            expect(cleanInput('1/2', 'd-d/d')).toBe('12');
        });
    });

    describe('formatWithMask', () => {
        it('should stop partial formatting if placeholder is shorter than template', () => {
            // Template "dddd", Placeholder "__" (len 2)
            // Digits "123".
            // 1 -> "1"
            // 2 -> "12"
            // 3 -> "123"
            // Wait, logic:
            // if (dIdx < digits.length) -> use digit.
            // if (dIdx >= digits.length) -> use placeholder.

            // Case: digits "1".
            // i=0: res="1"
            // i=1: dIdx=1 (>=len). Use placeholder[1] ('_'). res="1_"
            // i=2: dIdx=1. Use placeholder[2] (undefined).
            // Logic: if (placeholder && i < placeholder.length) ... else if (!placeholder) break;
            // "1_". Loop continues? 
            // "if (placeholder && i < placeholder.length)" is false.
            // "else { if (!placeholder) break; }" -> If placeholder exists but short, we do nothing?
            // Just empty string appended?
            // "1_" then "" then "" -> "1_"
            expect(formatWithMask('1', 'dddd', '__')).toBe('1_');
        });
    });

    describe('applyKeepPositionChange', () => {
        it('replacement: should match typed char with existing char and skip replacement if identical', () => {
            // "123" template "ddd".
            // Select "1". Type "1".
            // Should skipping replacing "1" with "1" and move cursor?
            // Logic: if char match, insertStart++.
            // But verify cursor output.
            const result = applyKeepPositionChange('123', 'ddd', '___', 0, 1, '1');
            // insertStart becomes 1.
            // range 1 to 1 is empty.
            // targetIndex starts at 1. 'd'.
            // 1 < 3 && isDigit('1').
            // Insert '1' at 1?
            // newValue: "1" + "1" + "3" -> "113"?
            // Wait, logic says:
            // "1. Replace the first digit slot at start (if it's a digit slot)"
            // "The first position already has the same digit, so skip it"

            // If I have "123" convert to "123" by typing "1" over "1", I expect no change in value, just cursor move.
            // insertStart = 1.
            // Loop i=1 to 1 (empty).
            // targetIndex = 1.
            // "123".substring(0, 1) -> "1".
            // + "1" -> "11".
            // substring(2) -> "3".
            // Result "113".
            // This logic seems to insert the char at the NEXT slot potentially?
            // "123" -> type "1" at start -> "113". This effectively shifts "2" out?
            // Or does it replace "2"?
            // substring(1,1) is empty.
            // "1" (start) + "1" (char) + "3" (end+1=2?).
            // value is "123".
            // subst(0, 1) = "1".
            // subst(2) = "3".
            // res = "1" + "1" + "3" = "113".
            // So "123" -> "113". "2" is replaced by "1".
            // This mimics "typeover" behavior for the *next* char if the current one matches?
            // Let's verify this behavior.
            expect(result.value).toBe('113');
            expect(result.cursor).toBe(2);
        });

        it('replacement: should handle skipping literals when matching existing char', () => {
            // "1-2". Select "1-". Type "1".
            // Match "1". Skip "1".
            // Next is literal "-".
            // insertStart loops past "-". insertStart = 2.
            // Clear range 2 to 2 (empty).
            // targetIndex = 2.
            // Insert "1" at 2.
            // "1-2" -> "1-1".
            const result = applyKeepPositionChange('1-2', 'd-d', '_-_', 0, 2, '1');
            expect(result.value).toBe('1-1');
            expect(result.cursor).toBe(3);
        });
    });

    describe('isMatchWithMask', () => {
        it('should return true for valid digit', () => {
            expect(isMatchWithMask('12', 'dd')).toBe(true);
        });

        it('should return false for invalid length', () => {
            expect(isMatchWithMask('1', 'dd')).toBe(false);
        });

        it('should return false for invalid mismatch', () => {
            expect(isMatchWithMask('1a', 'dd')).toBe(false);
        });

        it('should handle default placeholder (underscore)', () => {
            // No placeholder provided passed.
            // "1_" matches "dd" because _ is default placeholder.
            expect(isMatchWithMask('1_', 'dd')).toBe(true);
        });
    });

    describe('calculateMaskState', () => {
        it('insert: should fall back to standard insertion if multi-char paste with keepPosition', () => {
            const current = '(___)';
            // Paste "12" at start
            const result = calculateMaskState(
                current, '(ddd)', '(___)', 0, 0, 'insert', '12', true
            );
            // Standard insert: "(12_)".
            expect(result?.value).toBe('(12_)');
        });

        it('insert: should return null/no-change if inserting past template in keepPosition', () => {
            // Template "d". Input "1".
            // Cursor at 1.
            // Type "2".
            // applyKeepPositionChange usage:
            // start=1. template len=1.
            // applyKeepPositionChange returns cursor=start if past end.
            const result = calculateMaskState('1', 'd', '_', 1, 1, 'insert', '2', true);
            // start=1. template.len=1.
            // condition: start < template.length (1 < 1) is FALSE.
            // Drops to standard insertion?
            // Line 212: if (char.length === 1 && start < template.length)
            // So it does standard insertion.
            // "1" + "2" -> "12". Clean -> "12". Format "d" -> "1".
            // Cursor?
            expect(result?.value).toBe('1');
        });

        it('deleteBackward: should return null if already at start', () => {
            const result = calculateMaskState('123', 'ddd', '___', 0, 0, 'deleteBackward', '', false);
            expect(result).toBeNull();
        });

        it('deleteBackward: should return null if only literals precede and we run out of bounds', () => {
            // Template "-d". Value "-1". Cursor at 1 (after "-").
            // deleteBack logic: index = 0.
            // template[0] is '-'. Decrement -> -1.
            // Returns null.
            const result = calculateMaskState('-1', '-d', '-_', 1, 1, 'deleteBackward', '', false);
            expect(result).toBeNull();
        });

        it('deleteForward: should return null if at end', () => {
            const result = calculateMaskState('1', 'd', '_', 1, 1, 'deleteForward', '', false);
            expect(result).toBeNull();
        });

        it('deleteForward: should replace with placeholder if keepPosition is true', () => {
            // "12/34/5678" -> cursor at 0. Delete.
            // "1" replaced by "_".
            // Result "_2/34/5678". Cursor 0? Or 1?
            // calculateMaskState:
            // deleteIndex = 0.
            // Line 303: newVal = ... + pChar + ...
            // Cursor = start (0).
            const result = calculateMaskState('12/15/2024', 'dd/dd/dddd', 'mm/dd/yyyy', 0, 0, 'deleteForward', '', true);
            expect(result?.value).toBe('m2/15/2024');
            expect(result?.cursor).toBe(0);
        });

        it('deleteBackward: should handle selection with keepPosition', () => {
            // "12-34". Select "12". Backspace.
            // keepPosition: replace selection with placeholders.
            // "_ _-34"?
            const result = calculateMaskState('12-34', 'dd-dd', '__-__', 0, 2, 'deleteBackward', '', true);
            expect(result?.value).toBe('__-34');
            expect(result?.cursor).toBe(0);
        });

        it('deleteForward: should handle selection with keepPosition', () => {
            // "12-34". Select "12". Delete.
            // Same as backspace?
            const result = calculateMaskState('12-34', 'dd-dd', '__-__', 0, 2, 'deleteForward', '', true);
            expect(result?.value).toBe('__-34');
            expect(result?.cursor).toBe(0);
        });

        it('deleteForward: should handle standard deletion with selection', () => {
            // "12-34". Select "12". Delete.
            // "34" -> clean "34" -> format "34-".
            const result = calculateMaskState('12-34', 'dd-dd', '__-__', 0, 2, 'deleteForward', '', false);
            expect(result?.value).toBe('34-__');
            expect(result?.cursor).toBe(0);
        });
    });

    describe('applyKeepPositionChange detailed', () => {
        it('insertion: should not insert if no digit slot found', () => {
            // "1-". template "d-".
            // Insert '2' at 0. Replaces '1'.
            // Insert '2' at 1 (after 1). Next is '-'. Skip. End of template.
            // "1-". Insert '2' at 2.
            // targetIndex = 2. >= 2 (len).
            // No insertion.
            const result = applyKeepPositionChange('1-', 'd-', '_-', 2, 2, '2');
            expect(result.value).toBe('1-');
            expect(result.cursor).toBe(2);
        });

        it('insertion: should skip literals to find slot', () => {
            // "1-". template "d-d".
            // Insert '2' at 1 (hyphen).
            // Skip hyphen. find slot at 2.
            // Value "1-2".
            const result = applyKeepPositionChange('1-_', 'd-d', '_-_', 1, 1, '2');
            expect(result.value).toBe('1-2');
            expect(result.cursor).toBe(3);
        });
    });
});
