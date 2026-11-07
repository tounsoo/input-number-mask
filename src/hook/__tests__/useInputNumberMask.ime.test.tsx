import { act, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { useInputNumberMask } from '../useInputNumberMask';

const TestInput = ({
    template,
    placeholder,
    keepPosition = false,
    initialValue = '',
    onChange,
}: {
    template: string;
    placeholder?: string;
    keepPosition?: boolean;
    initialValue?: string;
    onChange?: (value: string) => void;
}) => {
    const [val, setVal] = useState(initialValue);
    const { ref, value } = useInputNumberMask({
        template,
        placeholder,
        keepPosition,
        value: val,
        onValueChange: (next) => {
            setVal(next);
            onChange?.(next);
        },
    });
    return <input ref={ref} value={value} onChange={() => { }} aria-label="masked-input" />;
};

const setNativeValue = (input: HTMLInputElement, value: string) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
};

// What a browser does while an IME composes: the text lands in the input first.
const composeTo = (input: HTMLInputElement, value: string, caret: number, isComposing = true) => {
    setNativeValue(input, value);
    input.setSelectionRange(caret, caret);
    fireEvent(input, new InputEvent('input', { bubbles: true, isComposing, inputType: 'insertCompositionText', data: value }));
};

// The commit waits for the next task (Chrome) unless an input event comes first (Safari).
const flushCommit = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

const fireInput = (input: HTMLInputElement, inputType: string, data: string | null = null) => {
    fireEvent(input, new InputEvent('input', { bubbles: true, isComposing: false, inputType, data }));
};

describe('useInputNumberMask with full-width digits and IMEs', () => {
    it('keeps full-width digits typed without composition', async () => {
        const user = userEvent.setup();
        render(<TestInput template="dd-dd" />);
        const input = screen.getByLabelText('masked-input') as HTMLInputElement;

        await user.type(input, '１２３４');

        expect(input).toHaveValue('12-34');
    });

    it('keeps a controlled value given in full-width digits', () => {
        render(<TestInput template="(ddd) ddd-dddd" initialValue="０１０１２３４５６７" />);
        expect(screen.getByLabelText('masked-input')).toHaveValue('(010) 123-4567');
    });

    it('leaves the text alone while composing and masks it after compositionend', async () => {
        const onChange = vi.fn();
        render(<TestInput template="dd-dd" onChange={onChange} />);
        const input = screen.getByLabelText('masked-input') as HTMLInputElement;
        input.focus();

        fireEvent.compositionStart(input);
        composeTo(input, '１', 1);
        expect(input).toHaveValue('１');
        composeTo(input, '１２', 2);
        expect(input).toHaveValue('１２');
        expect(onChange).not.toHaveBeenCalled();

        fireEvent.compositionEnd(input);
        await flushCommit();

        expect(input).toHaveValue('12-');
        expect(input.selectionStart).toBe(3);
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith('12-');
    });

    it("masks the text Safari writes after compositionend, once", async () => {
        const onChange = vi.fn();
        render(<TestInput template="dd-dd" onChange={onChange} />);
        const input = screen.getByLabelText('masked-input') as HTMLInputElement;
        input.focus();

        fireEvent.compositionStart(input);
        composeTo(input, '１', 1);
        fireEvent.compositionEnd(input);
        // Safari replaces the marked text with the committed text after compositionend.
        setNativeValue(input, '１２');
        input.setSelectionRange(2, 2);
        fireInput(input, 'insertFromComposition', '１２');
        await flushCommit();

        expect(input).toHaveValue('12-');
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith('12-');
    });

    it('keeps the gaps of a keepPosition value through a commit', async () => {
        render(<TestInput template="dd/dd" placeholder="mm/yy" keepPosition initialValue="mm/3y" />);
        const input = screen.getByLabelText('masked-input') as HTMLInputElement;
        input.focus();
        input.setSelectionRange(0, 0);

        fireEvent.compositionStart(input);
        composeTo(input, '１mm/3y', 1);
        fireEvent.compositionEnd(input);
        fireInput(input, 'insertFromComposition', '１');
        await flushCommit();

        expect(input).toHaveValue('1m/3y');
    });

    it('masks a digit typed right after a composed syllable (Chrome Korean IME)', async () => {
        render(<TestInput template="dd/dd" placeholder="mm/yy" keepPosition initialValue="1" />);
        const input = screen.getByLabelText('masked-input') as HTMLInputElement;
        input.focus();
        input.setSelectionRange(1, 1);

        fireEvent.compositionStart(input);
        composeTo(input, '1한m/yy', 2);
        // keydown for '2' ends the composition, then the digit is inserted.
        const keydown = new KeyboardEvent('keydown', { key: '2', bubbles: true, cancelable: true });
        fireEvent(input, keydown);
        fireEvent.compositionEnd(input);
        setNativeValue(input, '1한2m/yy');
        input.setSelectionRange(3, 3);
        fireInput(input, 'insertText', '2');
        await flushCommit();

        expect(input).toHaveValue('12/yy');
        expect(input.selectionStart).toBe(2); // same caret as typing 2 there with keepPosition
    });

    it('fills keepPosition slots when a syllable and a digit commit together', async () => {
        render(<TestInput template="dd/dd" placeholder="mm/yy" keepPosition initialValue="mm/3y" />);
        const input = screen.getByLabelText('masked-input') as HTMLInputElement;
        input.focus();
        input.setSelectionRange(0, 0);

        fireEvent.compositionStart(input);
        composeTo(input, '한mm/3y', 1);
        fireEvent.compositionEnd(input);
        setNativeValue(input, '한1mm/3y');
        input.setSelectionRange(2, 2);
        fireInput(input, 'insertText', '1');
        await flushCommit();

        expect(input).toHaveValue('1m/3y');
    });

    it('applies a composition that replaces text before the caret', async () => {
        render(<TestInput template="dd-dd" initialValue="1234" />);
        const input = screen.getByLabelText('masked-input') as HTMLInputElement;
        input.focus();
        input.setSelectionRange(5, 5);

        // Reconversion: the IME turns the last '4' into '５'.
        fireEvent.compositionStart(input);
        composeTo(input, '12-3５', 5);
        fireEvent.compositionEnd(input);
        await flushCommit();

        expect(input).toHaveValue('12-35');
    });

    it('inserts committed text at the composition point with keepPosition', async () => {
        render(<TestInput template="dd/dd" placeholder="mm/yy" keepPosition initialValue="1" />);
        const input = screen.getByLabelText('masked-input') as HTMLInputElement;
        expect(input).toHaveValue('1m/yy');
        input.focus();
        input.setSelectionRange(1, 1);

        fireEvent.compositionStart(input);
        composeTo(input, '1２m/yy', 2);
        fireEvent.compositionEnd(input);
        await flushCommit();

        expect(input).toHaveValue('12/yy');
    });

    it('drops committed text that has no digits', async () => {
        const onChange = vi.fn();
        render(<TestInput template="dd-dd" initialValue="12" onChange={onChange} />);
        const input = screen.getByLabelText('masked-input') as HTMLInputElement;
        input.focus();
        input.setSelectionRange(3, 3);

        fireEvent.compositionStart(input);
        composeTo(input, '12-한', 4);
        fireEvent.compositionEnd(input);
        await flushCommit();

        expect(input).toHaveValue('12-');
        expect(onChange).not.toHaveBeenCalled();
    });

    it("doesn't intercept Backspace during a composition", () => {
        render(<TestInput template="dd-dd" />);
        const input = screen.getByLabelText('masked-input') as HTMLInputElement;
        input.focus();

        fireEvent.compositionStart(input);
        const event = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true, isComposing: true });
        fireEvent(input, event);

        expect(event.defaultPrevented).toBe(false);
    });
});
