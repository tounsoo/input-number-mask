import { describe, it, expect } from 'vitest';
import { cleanInput, formatWithMask } from './maskUtils';

describe('maskUtils', () => {
    describe('cleanInput', () => {
        it('should extract digits from valid input', () => {
            expect(cleanInput('12/25/2025', 'dd/dd/dddd')).toBe('12252025');
        });

        it('should handle partial input with literals', () => {
            expect(cleanInput('12/', 'dd/dd/dddd')).toBe('12');
        });

        it('should sync after literal mismatch if possible', () => {
            // "12-25" typed into "dd/dd..." -> should skip '-' and capture '2' if possible?
            // Current strict logic might fail this specific case depending on loop, 
            // but let's test the intended "skip garbage" behavior
            expect(cleanInput('12-25', 'dd/dd/dddd')).toBe('1225');
        });

        it('should handle complex prefix', () => {
            expect(cleanInput('+1 (222) 333', '+1 (ddd) ddd-dddd')).toBe('222333');
        });
    });

    describe('formatWithMask', () => {
        it('should formatting digits with template', () => {
            expect(formatWithMask('12252025', 'dd/dd/dddd')).toBe('12/25/2025');
        });

        it('should use placeholder for empty slots', () => {
            expect(formatWithMask('1', 'dd/dd/dddd', 'dd/mm/yyyy')).toBe('1d/mm/yyyy');
        });

        it('should show full placeholder when empty', () => {
            expect(formatWithMask('', 'dd/dd/dddd', 'dd/mm/yyyy')).toBe('dd/mm/yyyy');
        });

        it('should stop formats if no placeholder and partial', () => {
            expect(formatWithMask('12', 'dd/dd/dddd')).toBe('12/');
        });

        it('should handle prefix in format', () => {
            expect(formatWithMask('222', '+1 (ddd) ddd-dddd')).toBe('+1 (222) ');
            // Note: Trailing literal handling depends on logic. 
            // "If placeholder OR dIdx < digits.length".
            // Here no placeholder. dIdx=3. digits.length=3.
            // Loop for next char (space): dIdx (3) !< digits.length (3). Break.
            // Wait, logic says: `if (placeholder || dIdx < digits.length) res += template[i]`
            // when `i` is at the space (index 7).
            // Actually, let's trace:
            // digits="222".
            // +1 ( -> added.
            // ddd -> filled with 222. dIdx becomes 3.
            // ) -> Literal. dIdx (3) not < digits (3). condition fails?
            // Wait. `dIdx < digits.length` means "we have more digits to consume".
            // If we are at a literal, we usually want to show it if we JUST filled the previous slot?
            // Or if we have more digits?
            // If no placeholder, we stop at the last filled digit?
            // Let's verify standard behavior.
            // If I type "222", I expect "+1 (222)". The closing paren might not show up if strict.
            // But if I type "2223", I expect "+1 (222) 3".
            // Let's verify what the code does.
        });
    });
});
