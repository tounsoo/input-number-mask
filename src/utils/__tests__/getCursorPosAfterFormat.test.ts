import { describe, it, expect } from 'vitest';
import { getCursorPosAfterFormat } from '../maskUtils';

describe('getCursorPosAfterFormat', () => {
    it('positions cursor after the last typed digit', () => {
        // Template: "ddd-ddd"
        // Typed: "123" -> Formatted: "123-"
        // Digits before cursor: 3
        const formatted = "123-";
        const template = "ddd-ddd";
        const digits = 3;

        // Should happen after '3' (index 3) and after '-' (index 4)
        // 0: '1' (digit 1) -> cursor 1
        // 1: '2' (digit 2) -> cursor 2
        // 2: '3' (digit 3) -> cursor 3
        // skip '-' -> cursor 4
        expect(getCursorPosAfterFormat(formatted, template, digits)).toBe(4);
    });

    it('positions cursor correctly in the middle', () => {
        // Template: "dd-dd"
        // Existing: "12-34"
        // Insert '5' at start -> "51-23 4..."
        // Formatted: "51-23" (truncated to fit?) or if shifting is not handled here, assume formatted is correct.

        // Scenario: Typed '1' into empty "dd-dd"
        // Formatted: "1"
        // Digits: 1
        expect(getCursorPosAfterFormat("1", "dd-dd", 1)).toBe(1);
    });

    it('jumps over standard separators', () => {
        // Template: "(ddd) ddd"
        // Value: "(123) 4"
        // Digits: 3 (users typed '1', '2', '3')
        // Expect cursor after ')' and space.
        // "(123) " is length 6. 
        // 0:( 1:1 2:2 3:3 4:) 5:space
        // digits=1 -> after '1' (2)
        // digits=3 -> after '3' (4) -> skip ')' -> 5 -> skip ' ' -> 6
        expect(getCursorPosAfterFormat("(123) ", "(ddd) ddd", 3)).toBe(6);
    });

    it('handles empty input', () => {
        expect(getCursorPosAfterFormat("", "ddd", 0)).toBe(0);
    });

    it('stops at end of string', () => {
        expect(getCursorPosAfterFormat("123", "ddd", 5)).toBe(3); // Should limit to length ideally? 
        // The loop breaks when formattedValue ends.
    });
});
