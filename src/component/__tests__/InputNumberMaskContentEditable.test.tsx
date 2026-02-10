import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { InputNumberMaskContentEditable } from '../InputNumberMaskContentEditable';
import { typeAndCheckCursor, getCursorPosition } from '../../testUtils';

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
        expect(getCursorPosition(input)).toBe(1);
    });

    it('handles forward delete correctly', async () => {
        const user = userEvent.setup();
        render(<InputNumberMaskContentEditable template="dd-dd" />);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        await user.click(input);
        await user.keyboard('1234');
        expect(input).toHaveTextContent('12-34');

        // Move cursor to start: "|12-34"
        const textNode = input.firstChild;
        if (textNode) {
            const range = document.createRange();
            range.setStart(textNode, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
        }

        await user.keyboard('{Delete}');
        // "2-34" -> "23-4"? No.
        // "12-34" -> delete "1" -> "2-34". Clean "234". Format "23-4".
        expect(input).toHaveTextContent('23-4');
        // Cursor should theoretically stay at 0?
        // Logic says generic deleteForward returns cursor at start.
    });

    it('positions caret at first digit slot on focus if empty', async () => {
        const user = userEvent.setup();
        render(<InputNumberMaskContentEditable template="(ddd)" />);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        // Initial text "(   )" (if placeholders hidden? or just mask chars?)
        // Template "(ddd)". Value empty -> "()".
        // Wait, formatWithMask with empty input?
        // "(ddd)" -> "()"?
        // Let's verify initial state first.
        expect(input).toHaveTextContent('(');

        await user.click(input); // Triggers focus

        // Should caret be at index 1 (after '(')?
        // 0: '('
        // 1: digit slot
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

    describe('Edge Cases & Interactions', () => {
        it('handles selection replacement', async () => {
            const user = userEvent.setup();
            render(<InputNumberMaskContentEditable template="dd/dd/dddd" />);
            const input = screen.getByRole('textbox');

            // Focus
            input.focus();

            await user.keyboard('12252024');
            expect(input.textContent).toBe('12/25/2024');

            // Select '25' (indices 3,4,5? no, 3 '2', 4 '5') and type '3'
            // Text: "12/25/2024"
            // Indices: 0123456789
            // Select start=3, end=5 ("25")
            // This is tricky with contentEditable. We need the text node.
            const textNode = input.firstChild;
            expect(textNode).not.toBeNull();

            if (textNode) {
                const range = document.createRange();
                range.setStart(textNode, 3);
                range.setEnd(textNode, 5);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
            }

            await user.keyboard('3');

            // Expect "12/32/024" (Standard replacement logic: delete range -> insert -> shift)
            // Wait, standard logic:
            // "12/25/2024" -> delete "25" -> "12//2024" -> insert "3" at 3 -> "12/3/2024"
            // Clean "1232024" -> Format "12/32/024"
            expect(input.textContent).toBe('12/32/024');
        });

        it('handles paste (simulated)', async () => {
            const user = userEvent.setup();
            render(<InputNumberMaskContentEditable template="(ddd) ddd-dddd" />);
            const input = screen.getByRole('textbox');

            input.focus();
            await user.paste('1234567890');
            expect(input.textContent).toBe('(123) 456-7890');
        });
    });
    describe('Architecture & Integrations', () => {
        // Ensure CSS Highlight API is mocked for these tests
        beforeAll(() => {
            if (typeof CSS === 'undefined') {
                (global as any).CSS = { highlights: new Map() };
                (global as any).Highlight = class { };
            } else if (!CSS.highlights) {
                (CSS as any).highlights = new Map();
                (global as any).Highlight = class { };
            }
        });

        it('forwards ref to the underlying div', () => {
            const ref = { current: null };
            render(<InputNumberMaskContentEditable template="dd" ref={ref} />);
            expect(ref.current).toBeInstanceOf(HTMLDivElement);
            expect(ref.current).toHaveAttribute('contenteditable', 'true');
        });

        it('forwards ref as a function', () => {
            let refNode: HTMLDivElement | null = null;
            render(<InputNumberMaskContentEditable template="dd" ref={(node) => { refNode = node; }} />);
            expect(refNode).toBeInstanceOf(HTMLDivElement);
        });

        it('updates internal value when template changes (dynamic props)', () => {
            const { rerender } = render(<InputNumberMaskContentEditable template="dd" defaultValue="12" />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveTextContent('12');

            // Change template to add separator
            rerender(<InputNumberMaskContentEditable template="d-d" defaultValue="12" />);
            // Should reformat existing internal value "12" -> "1-2"
            expect(input).toHaveTextContent('1-2');
        });

        it('registers CSS Highlight for placeholder chars', async () => {
            // Spy on CSS.highlights.set
            const setSpy = vi.fn();
            const originalSet = CSS.highlights.set;
            CSS.highlights.set = setSpy;

            render(<InputNumberMaskContentEditable template="(ddd)" placeholder="(___)" />);

            try {
                // Initial state: "(___)" -> (, ) should be highlighted?
                // Logic: if char === placeholderChar, highlight.
                const [name, highlight] = setSpy.mock.calls[0];
                expect(name).toMatch(/placeholder-highlight-/);
                expect(highlight).toBeInstanceOf(Highlight);
            } finally {
                CSS.highlights.set = originalSet;
            }
        });

        it('removes CSS Highlight when mask becomes empty', () => {
            const deleteSpy = vi.fn();
            const originalDelete = CSS.highlights.delete;
            CSS.highlights.delete = deleteSpy;

            // Mock ref.current to simulate emptiness if needed, but here we rely on rerender
            // But highlight logic depends on ref.current.firstChild
            // Providing a value that clears the content...
            // If we rerender with a template/value that results in empty string?
            // "dd" -> ""

            const { rerender } = render(<InputNumberMaskContentEditable template="dd" value="12" />);

            // Re-render with empty value
            rerender(<InputNumberMaskContentEditable template="dd" value="" />);

            // The effect usually runs. If element is empty, it should call delete.
            // However, JSDOM might not actually update layout/ref synchronously or as expected for highlights.
            // But checking the logic: if (!el || !el.firstChild) -> delete.

            // We need to ensure ref.current is empty.
            // The component renders standard, so if value is empty, textContent is empty.

            try {
                // We might need to check if delete was called. Use waitFor if effect is async layout?
                // useLayoutEffect runs synchronously after DOM mutation.
                // We can check if deleteSpy was called with a string matching the highlight name.
                expect(deleteSpy).toHaveBeenCalled();
                const name = deleteSpy.mock.calls[0][0]; // might need to find the specific call
                expect(name).toMatch(/placeholder-highlight-/);
            } finally {
                CSS.highlights.delete = originalDelete;
            }
        });

        it('injects style tag for highlights', () => {
            render(<InputNumberMaskContentEditable template="dd" placeholderColor="red" />);
            // Look for style tag in head
            const style = document.head.querySelector('style[id^="style-placeholder-highlight-"]');
            expect(style).toBeInTheDocument();
            expect(style).toHaveTextContent('color: red');
            expect(style).toHaveTextContent('::highlight(placeholder-highlight-');
        });

        it('cleans up style and highlight on unmount', () => {
            const { unmount } = render(<InputNumberMaskContentEditable template="dd" />);

            // Check existence
            const style = document.head.querySelector('style[id^="style-placeholder-highlight-"]');
            expect(style).toBeInTheDocument();

            unmount();

            // Check removal
            expect(style).not.toBeInTheDocument();
        });
    });
});

