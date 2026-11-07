import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { InputNumberMask } from '../InputNumberMask';
import { InputNumberMaskContentEditable } from '../InputNumberMaskContentEditable';

// The template's own 1 in "+1 (ddd)" used to be read as a typed digit when the
// caret was before it, so typing 2 then 3 gave "+1 (231)".
describe('templates with a literal digit, caret at the start', () => {
    it('InputNumberMask types into the slots', async () => {
        const user = userEvent.setup();
        render(<InputNumberMask template="+1 (ddd)" />);
        const input = screen.getByRole('textbox') as HTMLInputElement;
        await user.click(input);
        input.setSelectionRange(0, 0);
        await user.keyboard('23');
        expect(input.value).toBe('+1 (23');
    });

    it('InputNumberMask with keepPosition and a placeholder', async () => {
        const user = userEvent.setup();
        render(<InputNumberMask template="+1 (ddd)" placeholder="+1 (___)" keepPosition />);
        const input = screen.getByRole('textbox') as HTMLInputElement;
        await user.click(input);
        input.setSelectionRange(0, 0);
        await user.keyboard('23');
        expect(input.value).toBe('+1 (23_)');
    });

    it('InputNumberMaskContentEditable types into the slots', () => {
        render(<InputNumberMaskContentEditable template="+1 (ddd)" />);
        const field = screen.getByRole('textbox');
        field.focus();
        const range = document.createRange();
        range.selectNodeContents(field);
        range.collapse(true);
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);
        for (const data of ['2', '3']) {
            fireEvent(field, new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data }));
        }
        expect(field.textContent).toBe('+1 (23');
    });
});
