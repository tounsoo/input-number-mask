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
        expect(input.selectionStart).toBe(6);
    });

    it('InputNumberMask takes a pasted number with the country code', async () => {
        const user = userEvent.setup();
        render(<InputNumberMask template="+1 (ddd) ddd-dddd" />);
        const input = screen.getByRole('textbox') as HTMLInputElement;
        await user.click(input);
        input.setSelectionRange(0, 0);
        await user.paste('15551234567');
        expect(input.value).toBe('+1 (555) 123-4567');
        await user.keyboard('{Control>}a{/Control}');
        await user.paste('15559876543');
        expect(input.value).toBe('+1 (555) 987-6543');
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

    it('InputNumberMaskContentEditable takes a pasted number with the country code', () => {
        render(<InputNumberMaskContentEditable template="+1 (ddd) ddd-dddd" />);
        const field = screen.getByRole('textbox');
        field.focus();
        const range = document.createRange();
        range.selectNodeContents(field);
        range.collapse(true);
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);
        const event = new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertFromPaste', data: null });
        // jsdom doesn't implement DataTransfer, so stub the part the hook reads.
        Object.defineProperty(event, 'dataTransfer', {
            value: { getData: (format: string) => (format === 'text/plain' ? '15551234567' : '') }
        });
        fireEvent(field, event);
        expect(field.textContent).toBe('+1 (555) 123-4567');
    });
});
