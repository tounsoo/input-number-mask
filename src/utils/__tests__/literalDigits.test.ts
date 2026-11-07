import { describe, it, expect } from 'vitest';
import { calculateMaskState } from '../maskUtils';

// Templates whose literals include digits, like the country code in "+1 (ddd)".
// Re-parsing an edited value used to read the literal 1 as a typed digit once
// the edit shifted it out of place.
describe('calculateMaskState with literal digits in the template', () => {
    const template = '+1 (ddd)';

    it('types into the first slot when the caret is before the country code', () => {
        const first = calculateMaskState('+1 (', template, undefined, 0, 0, 'insert', '2');
        expect(first).toEqual({ value: '+1 (2', cursor: 5 });

        const second = calculateMaskState('+1 (2', template, undefined, 0, 0, 'insert', '3');
        expect(second?.value).toBe('+1 (32');
    });

    it('types at the caret inside the leading literals', () => {
        expect(calculateMaskState('+1 (', template, undefined, 2, 2, 'insert', '2')).toEqual({ value: '+1 (2', cursor: 5 });
    });

    it('keeps the placeholder and fills the first slot', () => {
        const result = calculateMaskState('+1 (___)', template, '+1 (___)', 0, 0, 'insert', '2');
        expect(result).toEqual({ value: '+1 (2__)', cursor: 5 });
    });

    it('replaces a selection that covers the literals', () => {
        expect(calculateMaskState('+1 (234)', template, undefined, 0, 8, 'insert', '5')).toEqual({ value: '+1 (5', cursor: 5 });
    });

    it('still parses a pasted formatted number', () => {
        expect(calculateMaskState('+1 (', template, undefined, 0, 0, 'insert', '+1 (234)')?.value).toBe('+1 (234)');
    });

    it('handles a literal digit between slots', () => {
        const mid = 'dd1dd';
        expect(calculateMaskState('121', mid, undefined, 1, 1, 'insert', '5')?.value).toBe('1512');
        expect(calculateMaskState('12134', mid, undefined, 0, 1, 'deleteForward')?.value).toBe('2314');
        expect(calculateMaskState('12134', mid, undefined, 1, 1, 'deleteBackward')?.value).toBe('2314');
        expect(calculateMaskState('12134', mid, undefined, 0, 2, 'deleteBackward')?.value).toBe('341');
    });
});

describe('pasting digits that repeat a literal digit of the template', () => {
    const template = '+1 (ddd) ddd-dddd';

    it('drops the country code from a pasted 11-digit number at the start', () => {
        expect(calculateMaskState('+1 (', template, undefined, 0, 0, 'insert', '15551234567')?.value).toBe('+1 (555) 123-4567');
        expect(calculateMaskState('+1 (', template, undefined, 0, 4, 'insert', '15551234567')?.value).toBe('+1 (555) 123-4567');
    });

    it('replaces a full selection with a pasted 11-digit number', () => {
        expect(calculateMaskState('+1 (555) 123-4567', template, undefined, 0, 17, 'insert', '15559876543')?.value).toBe('+1 (555) 987-6543');
        expect(calculateMaskState('+1 (___) ___-____', template, '+1 (___) ___-____', 0, 17, 'insert', '15551234567')?.value).toBe('+1 (555) 123-4567');
    });

    it('keeps a pasted number without the country code', () => {
        expect(calculateMaskState('+1 (', template, undefined, 0, 0, 'insert', '555')?.value).toBe('+1 (555) ');
        expect(calculateMaskState('+1 (', template, undefined, 0, 0, 'insert', '5551234567')?.value).toBe('+1 (555) 123-4567');
    });

    it('skips a literal digit between slots in pasted text', () => {
        expect(calculateMaskState('', 'dd1dd', undefined, 0, 0, 'insert', '12134')?.value).toBe('12134');
    });

    it('still types a single 1 before the country code', () => {
        expect(calculateMaskState('+1 (', template, undefined, 0, 0, 'insert', '1')?.value).toBe('+1 (1');
    });
});
