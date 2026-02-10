import { describe, it, expect } from 'vitest';
import { cleanInput } from '../maskUtils';

describe('cleanInput', () => {
    describe('basic extraction', () => {
        it('should extract digits from valid input', () => {
            expect(cleanInput('12/25/2025', 'dd/dd/dddd')).toBe('12252025');
        });

        it('should extract digits from phone format', () => {
            expect(cleanInput('+1 (222) 333', '+1 (ddd) ddd-dddd')).toBe('222333');
        });

        it('should extract digits from credit card format', () => {
            expect(cleanInput('1234 5678 9012 3456', 'dddd dddd dddd dddd')).toBe('1234567890123456');
        });
    });

    describe('partial input', () => {
        it('should handle partial input with literals', () => {
            expect(cleanInput('12/', 'dd/dd/dddd')).toBe('12');
        });

        it('should handle partial phone input', () => {
            expect(cleanInput('+1 (23', '+1 (ddd) ddd-dddd')).toBe('23');
        });

        it('should handle empty input', () => {
            expect(cleanInput('', 'dd/dd/dddd')).toBe('');
        });
    });

    describe('mismatched input', () => {
        it('should sync after literal mismatch if possible', () => {
            expect(cleanInput('12-25', 'dd/dd/dddd')).toBe('1225');
        });

        it('should skip non-digit characters in digit slots', () => {
            expect(cleanInput('1a2b3', 'ddddd')).toBe('123');
        });

        it('should handle completely wrong literals', () => {
            expect(cleanInput('12.25.2025', 'dd/dd/dddd')).toBe('12252025');
        });
    });

    describe('edge cases', () => {
        it('should handle input longer than template', () => {
            expect(cleanInput('12/25/202599', 'dd/dd/dddd')).toBe('12252025');
        });

        it('should handle purely literal template prefix', () => {
            expect(cleanInput('+1 ', '+1 (ddd)')).toBe('');
        });

        it('should handle digits only input', () => {
            expect(cleanInput('12345678', 'dd/dd/dddd')).toBe('12345678');
        });
    });
});
