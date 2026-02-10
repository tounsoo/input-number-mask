
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { InputNumberMaskContentEditable } from '../InputNumberMaskContentEditable';

// Mock Highlight API if not available in jsdom
if (typeof window !== 'undefined' && !window.CSS) {
    (window as any).CSS = { highlights: new Map() };
    (window as any).Highlight = class { };
}

describe('InputNumberMaskContentEditable KeepPosition', () => {
    it('behaves correctly in keepPosition mode (overwrite & delete)', async () => {
        const user = userEvent.setup();
        render(
            <InputNumberMaskContentEditable
                template="dd/dd/dddd"
                placeholder="mm/dd/yyyy"
                keepPosition={true}
                defaultValue="12122024"
                data-testid="content-editable"
            />
        );
        const input = screen.getByTestId('content-editable');

        // Initial correct value
        expect(input).toHaveTextContent('12/12/2024');

        // 1. Test replacement (overwrite) behavior at the start
        // Place cursor at start
        input.focus();

        // setSelectionRange doesn't exist on contentEditable div usually, need range/selection API
        // Helper to set cursor at index
        const setCursor = (index: number) => {
            const textNode = input.firstChild;
            if (textNode) {
                const range = document.createRange();
                range.setStart(textNode, index);
                range.setEnd(textNode, index);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
            }
        };

        setCursor(0);
        await user.keyboard('5');

        // Expect '1' to be replaced by '5'
        // '52/12/2024'
        expect(input).toHaveTextContent('52/12/2024');

        // 2. Test deletion (replace with placeholder)
        // Move cursor to end of '52' (index 2)
        setCursor(2);
        await user.keyboard('{Backspace}');

        // Expect '2' (index 1) to be replaced by 'm' (from placeholder mm at index 1)
        // '5m/12/2024'
        expect(input).toHaveTextContent('5m/12/2024');

        // 3. Test typing over placeholder
        // Cursor at 1 (before 'm')
        setCursor(1);
        await user.keyboard('9');

        // Expect 'm' to be replaced by '9'
        // '59/12/2024'
        expect(input).toHaveTextContent('59/12/2024');
    });

    it('handles typing in the middle without shifting subsequent digits', async () => {
        const user = userEvent.setup();
        render(
            <InputNumberMaskContentEditable
                template="dd-dd"
                placeholder="__-__"
                keepPosition={true}
                defaultValue="1234"
                data-testid="content-editable"
            />
        );
        const input = screen.getByTestId('content-editable');

        // '12-34'
        // Click at index 3 (before '3')
        input.focus();

        const setCursor = (index: number) => {
            const textNode = input.firstChild;
            if (textNode) {
                const range = document.createRange();
                range.setStart(textNode, index);
                range.setEnd(textNode, index);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
            }
        };

        setCursor(3);
        await user.keyboard('5');

        // Expect '3' to be replaced by '5', '4' remains
        // '12-54'
        expect(input).toHaveTextContent('12-54');
    });

    it('handles selection replacement in keepPosition mode', async () => {
        const user = userEvent.setup();
        render(
            <InputNumberMaskContentEditable
                template="dd/dd/dddd"
                placeholder="mm/dd/yyyy"
                keepPosition={true}
                data-testid="content-editable"
            />
        );
        const input = screen.getByTestId('content-editable');
        input.focus();

        await user.keyboard('12252024');
        expect(input).toHaveTextContent('12/25/2024');

        // Select '25' and type '3'
        // "12/25/2024"
        const textNode = input.firstChild;
        if (textNode) {
            const range = document.createRange();
            range.setStart(textNode, 3);
            range.setEnd(textNode, 5);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
        }

        await user.keyboard('3');

        // keepPosition:
        // Range 3-5 ("25") is replaced.
        // Logic: 
        // 1. Clear range to placeholder -> "12/dd/2024" (using 'd' from 'mm/dd/yyyy' at those positions? Wait, placeholder is "mm/dd/yyyy".
        // Indices 3,4 correspond to 'd','d' in placeholder.
        // So "12/dd/2024".
        // 2. Insert '3' at start of range (3). -> "12/3d/2024".
        expect(input).toHaveTextContent('12/3d/2024');
    });

    it('handles paste with keepPosition (falls back to standard shift)', async () => {
        const user = userEvent.setup();
        render(<InputNumberMaskContentEditable template="dd-dd" keepPosition={true} data-testid="content-editable" />);
        const input = screen.getByTestId('content-editable');
        input.focus();

        await user.keyboard('1234');
        expect(input).toHaveTextContent('12-34');

        // Select all and paste "56"
        const textNode = input.firstChild;
        if (textNode) {
            const range = document.createRange();
            range.setStart(textNode, 0);
            range.setEnd(textNode, 5);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
        }

        await user.paste('56');

        // Pasting "56" over "12-34".
        // Should behave like standard replacement if it mimics "typing" or if paste is handled separately?
        // If handled as standard paste, it cleans "56" -> "56". Formats -> "56-".
        expect(input).toHaveTextContent('56-');
    });
});
