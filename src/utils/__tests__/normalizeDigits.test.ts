import { describe, it, expect } from 'vitest';
import { applyCompositionChange, calculateMaskState, cleanInput, diffComposition, isMatchWithMask, normalizeDigits } from '../maskUtils';

describe('normalizeDigits', () => {
    it('maps full-width digits from CJK IMEs to ASCII', () => {
        expect(normalizeDigits('１２３４５６７８９０')).toBe('1234567890');
    });

    it('leaves ASCII and other characters alone', () => {
        expect(normalizeDigits('(123) abc-한글')).toBe('(123) abc-한글');
    });

    it('keeps the string length so caret offsets stay valid', () => {
        // ⑩ normalizes to two digits and 𝟏 is a surrogate pair: both are left as they are.
        const input = '１⑩𝟏２';
        expect(normalizeDigits(input)).toHaveLength(input.length);
        expect(normalizeDigits(input)).toBe('1⑩𝟏2');
    });
});

describe('full-width digits in the mask utilities', () => {
    it('cleanInput keeps full-width digits', () => {
        expect(cleanInput('（０１０）１２３４', '(ddd) dddd')).toBe('0101234');
        expect(cleanInput('１２/３４', 'dd/dd')).toBe('1234');
    });

    it('calculateMaskState inserts a full-width digit as ASCII', () => {
        expect(calculateMaskState('12-', 'dd-dd', undefined, 3, 3, 'insert', '３')).toEqual({ value: '12-3', cursor: 4 });
    });

    it('calculateMaskState inserts a full-width digit with keepPosition', () => {
        expect(calculateMaskState('1m/yy', 'dd/dd', 'mm/yy', 1, 1, 'insert', '２', true)).toEqual({ value: '12/yy', cursor: 2 });
    });

    it('isMatchWithMask accepts full-width digits', () => {
        expect(isMatchWithMask('１２/yy', 'dd/dd', 'mm/yy')).toBe(true);
    });
});

describe('diffComposition', () => {
    it('finds an insertion at the caret', () => {
        expect(diffComposition('12-', '12-３', 3, 3)).toEqual({ start: 3, end: 3, text: '３' });
    });

    it('finds a replacement before the caret', () => {
        expect(diffComposition('12-34', '12-3５', 5, 5)).toEqual({ start: 4, end: 5, text: '５' });
    });

    it("doesn't let repeated characters move the change past the selection", () => {
        expect(diffComposition('1m/yy', '11m/yy', 1, 1)).toEqual({ start: 1, end: 1, text: '1' });
    });

    it('finds a deletion', () => {
        expect(diffComposition('12-34', '12-3', 5, 5)).toEqual({ start: 4, end: 5, text: '' });
    });
});

describe('applyCompositionChange', () => {
    it('keeps only the digits of the committed text', () => {
        expect(applyCompositionChange('12-', 'dd-dd', undefined, { start: 3, end: 3, text: '한３' })).toEqual({ value: '12-3', cursor: 4 });
    });

    it('fills keepPosition slots one digit at a time', () => {
        expect(applyCompositionChange('mm/3y', 'dd/dd', 'mm/yy', { start: 0, end: 0, text: '한1' }, true)).toEqual({ value: '1m/3y', cursor: 1 });
        expect(applyCompositionChange('mm/yy', 'dd/dd', 'mm/yy', { start: 0, end: 0, text: '１２３' }, true)).toEqual({ value: '12/3y', cursor: 4 });
    });

    it('clears a replaced range with keepPosition when no digit came in', () => {
        expect(applyCompositionChange('12/34', 'dd/dd', 'mm/yy', { start: 3, end: 4, text: '한' }, true)).toEqual({ value: '12/y4', cursor: 3 });
    });

    it('leaves the value alone when nothing changed', () => {
        expect(applyCompositionChange('12-', 'dd-dd', undefined, { start: 3, end: 3, text: '한' }, true)).toEqual({ value: '12-', cursor: 3 });
    });
});
