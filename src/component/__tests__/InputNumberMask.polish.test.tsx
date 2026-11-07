import { createRef, useState } from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { InputNumberMask } from '../InputNumberMask';
import { InputNumberMaskContentEditable } from '../InputNumberMaskContentEditable';
import { highlightApiGlobals } from '../../testUtils';

if (typeof window !== 'undefined' && !window.CSS) {
    const globals = highlightApiGlobals(window);
    globals.CSS = { highlights: new Map() };
    globals.Highlight = class { };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('showMaskWhenEmpty', () => {
    it('shows the mask in an empty field by default', () => {
        render(<InputNumberMask template="(ddd) ddd-dddd" placeholder="(___) ___-____" />);
        const input = screen.getByRole('textbox');
        expect(input).toHaveValue('(___) ___-____');
        expect(input).not.toHaveAttribute('placeholder');
    });

    it('keeps the value empty until the first digit and passes placeholder through', async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();
        render(
            <InputNumberMask
                template="(ddd) ddd-dddd"
                placeholder="(___) ___-____"
                showMaskWhenEmpty={false}
                onValueChange={onValueChange}
            />
        );
        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input).toHaveValue('');
        expect(input).toHaveAttribute('placeholder', '(___) ___-____');

        await user.type(input, '1');
        expect(input).toHaveValue('(1__) ___-____');
        expect(onValueChange).toHaveBeenLastCalledWith('(1__) ___-____');

        await user.keyboard('{Backspace}');
        expect(input).toHaveValue('');
        expect(onValueChange).toHaveBeenLastCalledWith('');
    });

    it('lets native required validation see an empty field', () => {
        render(
            <form aria-label="form">
                <InputNumberMask template="dd/dd" placeholder="mm/yy" showMaskWhenEmpty={false} required name="exp" />
            </form>
        );
        const form = screen.getByRole('form') as HTMLFormElement;
        expect(form.checkValidity()).toBe(false);
        expect(new FormData(form).get('exp')).toBe('');
    });

    it('works controlled', async () => {
        const user = userEvent.setup();
        const Controlled = () => {
            const [value, setValue] = useState('');
            return <InputNumberMask template="dd-dd" showMaskWhenEmpty={false} value={value} onValueChange={setValue} />;
        };
        render(<Controlled />);
        const input = screen.getByRole('textbox');
        expect(input).toHaveValue('');
        await user.type(input, '12');
        expect(input).toHaveValue('12-');
        await user.type(input, '{Backspace}{Backspace}');
        expect(input).toHaveValue('');
    });

    it('keeps the contenteditable empty and uses aria-placeholder', () => {
        render(
            <InputNumberMaskContentEditable
                template="(ddd) ddd-dddd"
                placeholder="(___) ___-____"
                showMaskWhenEmpty={false}
                name="phone"
            />
        );
        const field = screen.getByRole('textbox');
        expect(field.textContent).toBe('');
        expect(field).toHaveAttribute('aria-placeholder', '(___) ___-____');
        expect(document.querySelector('input[name="phone"]')).toHaveValue('');

        fireEvent(field, new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: '1' }));
        expect(field.textContent).toBe('(1__) ___-____');
        expect(document.querySelector('input[name="phone"]')).toHaveValue('(1__) ___-____');
    });

    it('starts an IME composition from an empty field', async () => {
        render(<InputNumberMask template="dd-dd" showMaskWhenEmpty={false} />);
        const input = screen.getByRole('textbox') as HTMLInputElement;
        input.focus();

        fireEvent.compositionStart(input);
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '１２');
        fireEvent(input, new InputEvent('input', { bubbles: true, isComposing: true, inputType: 'insertCompositionText', data: '１２' }));
        fireEvent.compositionEnd(input);
        await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

        expect(input).toHaveValue('12-');
    });
});

describe('refs', () => {
    it('sets an object ref to the input and clears it on unmount', () => {
        const ref = createRef<HTMLInputElement>();
        const { unmount } = render(<InputNumberMask template="dd-dd" ref={ref} />);
        expect(ref.current).toBe(screen.getByRole('textbox'));
        unmount();
        expect(ref.current).toBeNull();
    });

    it('calls a callback ref with the element, then null on unmount', () => {
        const ref = vi.fn();
        const { unmount } = render(<InputNumberMaskContentEditable template="dd-dd" ref={ref} />);
        expect(ref).toHaveBeenLastCalledWith(screen.getByRole('textbox'));
        unmount();
        expect(ref).toHaveBeenLastCalledWith(null);
    });

    it('runs the cleanup a callback ref returns', () => {
        const cleanup = vi.fn();
        const ref = vi.fn(() => cleanup);
        const { unmount } = render(<InputNumberMask template="dd-dd" ref={ref} />);
        unmount();
        expect(cleanup).toHaveBeenCalledTimes(1);
        expect(ref).toHaveBeenCalledTimes(1);
    });

    it('keeps masking with a ref attached', async () => {
        const user = userEvent.setup();
        const ref = createRef<HTMLInputElement>();
        render(<InputNumberMask template="dd-dd" ref={ref} />);
        await user.type(ref.current!, '123');
        expect(ref.current).toHaveValue('12-3');
    });
});

describe('styles and classes', () => {
    it('renders one shared <style> in <head> for many inputs', () => {
        render(
            <>
                <InputNumberMask template="dd-dd" />
                <InputNumberMask template="dd-dd" />
                <InputNumberMaskContentEditable template="dd-dd" />
                <InputNumberMaskContentEditable template="dd-dd" />
            </>
        );
        expect(document.head.querySelectorAll('style[data-href="input-number-mask"]')).toHaveLength(1);
        expect(document.head.querySelectorAll('style[data-href="input-number-mask-content-editable"]')).toHaveLength(1);
        expect(document.body.querySelectorAll('style')).toHaveLength(0);
    });

    it('adds a passed className to the base class on both components', () => {
        render(
            <>
                <InputNumberMask template="dd-dd" className="mine" />
                <InputNumberMaskContentEditable template="dd-dd" className="mine" />
            </>
        );
        const [input, field] = screen.getAllByRole('textbox');
        expect(input).toHaveClass('input-number-mask', 'mine');
        expect(field).toHaveClass('input-number-mask-content-editable', 'mine');
    });

    it('leaves no trailing space in the class without a className', () => {
        render(<InputNumberMask template="dd-dd" />);
        expect(screen.getByRole('textbox').getAttribute('class')).toBe('input-number-mask');
    });
});

describe('caret handling', () => {
    it("doesn't move the caret of an input that isn't focused", () => {
        const spy = vi.spyOn(HTMLInputElement.prototype, 'setSelectionRange');
        const { rerender } = render(<InputNumberMask template="dd-dd" value="12" />);
        rerender(<InputNumberMask template="dd-dd" value="1234" />);
        expect(spy).not.toHaveBeenCalled();
        expect(document.activeElement).not.toBe(screen.getByRole('textbox'));
    });

    it('cancels a pending caret restore on unmount', async () => {
        const user = userEvent.setup();
        const cancel = vi.spyOn(window, 'cancelAnimationFrame');
        const { unmount } = render(<InputNumberMask template="dd-dd" defaultValue="12" />);
        const input = screen.getByRole('textbox');
        // Typing a letter changes nothing, so the hook schedules a caret restore.
        await user.type(input, 'a');
        unmount();
        expect(cancel).toHaveBeenCalled();
    });
});
