import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { InputNumberMaskContentEditable } from './InputNumberMaskContentEditable';
import { typeAndCheckCursor, getCursorPosition } from '../testUtils';

// Mock Highlight API if not available in jsdom
if (typeof window !== 'undefined' && !window.CSS) {
    (window as any).CSS = { highlights: new Map() };
    (window as any).Highlight = class { };
}

describe('InputNumberMaskContentEditable', () => {
    it('renders correctly', () => {
        render(<InputNumberMaskContentEditable template="(ddd) ddd-dddd" />);
        const input = screen.getByRole('textbox');
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute('contenteditable', 'true');
    });

    it('formats initial value correctly', () => {
        render(<InputNumberMaskContentEditable template="(ddd) ddd-dddd" defaultValue="1234567890" />);
        const input = screen.getByRole('textbox');
        expect(input).toHaveTextContent('(123) 456-7890');
    });

    it('updates hidden input value', () => {
        render(<InputNumberMaskContentEditable name="phone" template="(ddd) ddd-dddd" placeholder="(___) ___-____" defaultValue="123" />);
        const hiddenInput = document.querySelector('input[name="phone"]');
        expect(hiddenInput).toHaveValue('(123) ___-____');
    });

    it('returns raw value in hidden input if requested', () => {
        render(<InputNumberMaskContentEditable name="phone" template="(ddd) ddd-dddd" defaultValue="123" returnRawValue />);
        const hiddenInput = document.querySelector('input[name="phone"]');
        expect(hiddenInput).toHaveValue('123');
    });

    // Note: Testing user interactions on contentEditable with testing-library/user-event in jsdom is difficult.
    // We need to polyfill innerText because jsdom doesn't support it well for contentEditable
    // and user-event relies on it.





    it('handles typing correctly', async () => {
        const user = userEvent.setup();
        render(<InputNumberMaskContentEditable template="dd-dd" />);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        await user.click(input);
        // '1' -> "1" (cursor 1)
        // '2' -> "12-" (cursor 3)
        await typeAndCheckCursor(user, input, '12', [1, 3]);
        expect(input).toHaveTextContent('12-');

        // '3' -> "12-3" (cursor 4)
        // '4' -> "12-34" (cursor 5)
        await typeAndCheckCursor(user, input, '34', [4, 5]);
        expect(input).toHaveTextContent('12-34');
    });

    it('handles backspace correctly', async () => {
        const user = userEvent.setup();
        render(<InputNumberMaskContentEditable template="dd-dd" />);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        await user.click(input);
        await typeAndCheckCursor(user, input, '1234', [1, 3, 4, 5]);
        expect(input).toHaveTextContent('12-34');
        expect(getCursorPosition(input)).toBe(5);

        await user.keyboard('{Backspace}');
        expect(input).toHaveTextContent('12-3');
        expect(getCursorPosition(input)).toBe(4);

        await user.keyboard('{Backspace}');
        expect(input).toHaveTextContent('12-');
        expect(getCursorPosition(input)).toBe(3);

        // Should skip separator
        await user.keyboard('{Backspace}');
        expect(input).toHaveTextContent('1');
        expect(getCursorPosition(input)).toBe(1);
    });


    it('calls onValueChange with formatted value', async () => {
        const handleChange = vi.fn();
        const user = userEvent.setup();
        render(<InputNumberMaskContentEditable template="dd-dd" onValueChange={handleChange} />);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        await user.click(input);
        await typeAndCheckCursor(user, input, '1', [1]);
        // "1" (Partial mask not filled until next separator generally, unless separator follows immediately?)
        // Template "dd-dd". "1" -> "1". "12" -> "12-".
        expect(handleChange).toHaveBeenCalledWith('1');

        await typeAndCheckCursor(user, input, '2', [3]);
        // "12-"
        expect(handleChange).toHaveBeenCalledWith('12-');
    });

    it('calls onValueChange with raw value when returnRawValue is true', async () => {
        const handleChange = vi.fn();
        const user = userEvent.setup();
        render(<InputNumberMaskContentEditable template="dd-dd" returnRawValue={true} onValueChange={handleChange} />);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        await user.click(input);
        await typeAndCheckCursor(user, input, '1', [1]);
        // Value "1-", raw "1"
        expect(handleChange).toHaveBeenCalledWith('1');

        await typeAndCheckCursor(user, input, '2', [3]);
        // Value "12-", raw "12"
        expect(handleChange).toHaveBeenCalledWith('12');
    });

    describe('Controlled Behavior', () => {
        it('renders with controlled value', () => {
            render(<InputNumberMaskContentEditable template="dd-dd" value="1234" />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveTextContent('12-34');
        });

        it('calls onValueChange but does NOT update input if value prop is not updated (strictly controlled)', async () => {
            const handleChange = vi.fn();
            const user = userEvent.setup();

            // Use partial value so typing would attempt to add more digits
            render(<InputNumberMaskContentEditable template="dd-dd" value="12" onValueChange={handleChange} />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveTextContent('12-');

            // Try to type '5'
            await user.click(input);
            // Manually ensure cursor at end
            const range = document.createRange();
            range.selectNodeContents(input);
            range.collapse(false);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);

            await user.keyboard('5');

            // Should call callback with attempted new value
            expect(handleChange).toHaveBeenCalled();
            // But input value should revert to '12-' because prop didn't change
            expect(input).toHaveTextContent('12-');
        });

        it('updates input when value prop changes', () => {
            const { rerender } = render(<InputNumberMaskContentEditable template="dd-dd" value="1234" />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveTextContent('12-34');

            rerender(<InputNumberMaskContentEditable template="dd-dd" value="5678" />);
            expect(input).toHaveTextContent('56-78');
        });
    });
});

