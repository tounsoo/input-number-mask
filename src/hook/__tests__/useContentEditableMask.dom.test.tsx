
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { useContentEditableMask } from '../useContentEditableMask';

const TestContentEditable = ({
    template,
    placeholder,
    keepPosition = false,
    initialValue = ''
}: {
    template: string,
    placeholder?: string,
    keepPosition?: boolean,
    initialValue?: string
}) => {
    const [val, setVal] = useState(initialValue);

    // Controlled pattern
    const { ref } = useContentEditableMask({
        template,
        placeholder,
        keepPosition,
        value: val,
        onValueChange: setVal
    });

    return (
        <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            aria-label="masked-input"
            style={{ border: '1px solid black', minHeight: '20px' }}
        >
            {/* The hook manages textContent via layoutEffect, but initial render empty div? 
                Actually the hook uses useLayoutEffect to set textContent if it differs.
                But usually controlled contentEditable needs to handle children or dangerSetInnerHTML.
                The hook sets ref.current.textContent directly.
                So we can render empty.
            */}
        </div>
    );
};

describe('useContentEditableMask DOM Interactions', () => {
    it('formats input as user types digits', async () => {
        const user = userEvent.setup();
        render(<TestContentEditable template="(ddd) ddd-dddd" />);

        const input = screen.getByLabelText('masked-input');

        // Focus
        input.focus();

        // Type '123'
        await user.keyboard('123');
        expect(input.textContent).toBe('(123) ');

        // Type '456'
        await user.keyboard('456');
        expect(input.textContent).toBe('(123) 456-');
    });

    it('ignores non-digit characters', async () => {
        const user = userEvent.setup();
        render(<TestContentEditable template="(ddd) ddd-dddd" />);

        const input = screen.getByLabelText('masked-input');
        input.focus();

        await user.keyboard('1a2b3');
        expect(input.textContent).toBe('(123) ');
    });

    it('handles backspace correctly', async () => {
        const user = userEvent.setup();
        render(<TestContentEditable template="(ddd) ddd-dddd" />);

        const input = screen.getByLabelText('masked-input');
        input.focus();

        await user.keyboard('123');
        expect(input.textContent).toBe('(123) ');

        await user.keyboard('{Backspace}');
        // "12" -> "(12"
        expect(input.textContent).toBe('(12');
    });

    // ContentEditable keepPosition tests
    it('handles keepPosition with deletion', async () => {
        const user = userEvent.setup();
        render(<TestContentEditable template="dd/dd/dddd" placeholder="mm/dd/yyyy" keepPosition={true} initialValue="12/25/2024" />);

        const input = screen.getByLabelText('masked-input');
        expect(input.textContent).toBe('12/25/2024');

        // Ensure focus and cursor placement
        input.focus();

        // Simulate placing cursor after '5' (index 5)
        // For ContentEditable, we need to set Selection on the text node.
        // The div contains a single text node '12/25/2024'.
        const textNode = input.firstChild;
        if (textNode) {
            document.getSelection()?.collapse(textNode, 5);
        }

        // We use fireEvent.select to ensure any selection listeners update? 
        // useContentEditableMask doesn't listen to 'select' explicitly for state updates?
        // It uses getSelectionIndices() inside handleBeforeInput.
        // It DOES call setCaretPosition in layout effects.

        await user.keyboard('{Backspace}');

        // "12/2d/2024"
        expect(input.textContent).toBe('12/2d/2024');
    });

    it('handles keepPosition with insertion', async () => {
        const user = userEvent.setup();
        render(<TestContentEditable template="dd/dd/dddd" placeholder="mm/dd/yyyy" keepPosition={true} initialValue="12/2d/2024" />);

        const input = screen.getByLabelText('masked-input');
        expect(input).toHaveTextContent('12/2d/2024');

        input.focus();

        // Cursor at 4
        const textNode = input.firstChild;
        if (textNode) {
            document.getSelection()?.collapse(textNode, 4);
        }

        await user.keyboard('5');
        expect(input.textContent).toBe('12/25/2024');
    });

    // Manual event firing to ensure coverage of specific inputTypes which might be flaky in JSDOM/user-event
    it('handles explicit deleteContentBackward event', () => {
        render(<TestContentEditable template="dd-dd" initialValue="12-34" />);
        const input = screen.getByLabelText('masked-input');

        // Mock selection at end
        // "12-34" length 5.
        // deleteBackward from end -> delete '4' -> "12-3"
        const textNode = input.firstChild;
        if (textNode) {
            document.getSelection()?.collapse(textNode, 5);
        }

        // Fire beforeinput
        fireEvent(input, new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'deleteContentBackward',
            data: null
        }));

        expect(input.textContent).toBe('12-3');
    });

    it('handles explicit deleteContentForward event', () => {
        render(<TestContentEditable template="dd-dd" initialValue="12-34" />);
        const input = screen.getByLabelText('masked-input');

        // Selection at 0. DeleteForward -> delete '1' -> "2-34"
        const textNode = input.firstChild;
        if (textNode) {
            document.getSelection()?.collapse(textNode, 0);
        }

        fireEvent(input, new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'deleteContentForward',
            data: null
        }));

        // "12-34" -> "2-34"? 
        // Logic: delete '1'. clean "234". format "23-4".
        expect(input.textContent).toBe('23-4');
    });
});
