import { describe, it, expect } from 'vitest';
import { formatWithMask } from '../maskUtils';

describe('formatWithMask', () => {
    describe('basic formatting', () => {
        it('should format digits with template', () => {
            expect(formatWithMask('12252025', 'dd/dd/dddd')).toBe('12/25/2025');
        });

        it('should format phone number', () => {
            expect(formatWithMask('2223334444', '+1 (ddd) ddd-dddd')).toBe('+1 (222) 333-4444');
        });

        it('should format credit card', () => {
            expect(formatWithMask('1234567890123456', 'dddd dddd dddd dddd')).toBe('1234 5678 9012 3456');
        });
    });

    describe('placeholder handling', () => {
        it('should use placeholder for empty slots', () => {
            expect(formatWithMask('1', 'dd/dd/dddd', 'dd/mm/yyyy')).toBe('1d/mm/yyyy');
        });

        it('should show full placeholder when empty', () => {
            expect(formatWithMask('', 'dd/dd/dddd', 'dd/mm/yyyy')).toBe('dd/mm/yyyy');
        });

        it('should fill remaining slots with placeholder', () => {
            expect(formatWithMask('12', 'dd/dd/dddd', 'dd/mm/yyyy')).toBe('12/mm/yyyy');
        });

        it('should handle phone placeholder', () => {
            expect(formatWithMask('222', '+1 (ddd) ddd-dddd', '+1 (___) ___-____')).toBe('+1 (222) ___-____');
        });
    });

    describe('no placeholder', () => {
        it('should stop formatting if no placeholder and partial', () => {
            expect(formatWithMask('12', 'dd/dd/dddd')).toBe('12/');
        });

        it('should handle prefix in format', () => {
            expect(formatWithMask('222', '+1 (ddd) ddd-dddd')).toBe('+1 (222) ');
        });

        it('should only show literal after complete slot', () => {
            expect(formatWithMask('1', 'dd/dd')).toBe('1');
        });
    });

    describe('edge cases', () => {
        it('should handle more digits than slots', () => {
            // Extra digits are ignored
            expect(formatWithMask('123456789', 'dd/dd/dddd')).toBe('12/34/5678');
        });

        it('should handle template with only literals at end', () => {
            expect(formatWithMask('12', 'dd!', 'mm!')).toBe('12!');
        });

        it('should handle consecutive literals', () => {
            expect(formatWithMask('12', 'd--d', '_--_')).toBe('1--2');
        });
    });
});
