
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { useInputNumberMask } from '../useInputNumberMask';

// Wrapper component to test the hook in a real DOM environment
const TestInput = ({
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

    // We treat this as a controlled component where the hook updates the parent state
    // and the parent state is passed back to the hook.
    // The hook is designed to work this way: 
    // - onValueChange provides the new formatted value.
    // - value prop syncs the hook's internal state.
    const { ref, value } = useInputNumberMask({
        template,
        placeholder,
        keepPosition,
        value: val,
        onValueChange: (newValue) => {
            setVal(newValue);
        }
    });

    return (
        <input
            ref={ref}
            value={value}
            onChange={() => { }} // React controlled input requirement
            aria-label="masked-input"
        />
    );
};

describe('useInputNumberMask DOM Interactions', () => {
    it('formats input as user types digits', async () => {
        const user = userEvent.setup();
        render(<TestInput template="(ddd) ddd-dddd" />);

        const input = screen.getByLabelText('masked-input') as HTMLInputElement;

        // Type '1'
        await user.type(input, '1');
        expect(input).toHaveValue('(1');

        // Type '23'
        await user.type(input, '23');
        expect(input).toHaveValue('(123) ');

        // Type '456'
        await user.type(input, '456');
        expect(input).toHaveValue('(123) 456-');

        // Type '7890'
        await user.type(input, '7890');
        expect(input).toHaveValue('(123) 456-7890');
    });

    it('ignores non-digit characters', async () => {
        const user = userEvent.setup();
        render(<TestInput template="(ddd) ddd-dddd" />);

        const input = screen.getByLabelText('masked-input') as HTMLInputElement;

        await user.type(input, '1a2b3');
        expect(input).toHaveValue('(123) ');
    });

    it('handles backspace correctly', async () => {
        const user = userEvent.setup();
        render(<TestInput template="(ddd) ddd-dddd" />);

        const input = screen.getByLabelText('masked-input') as HTMLInputElement;

        // Type full number
        await user.type(input, '1234567890');
        expect(input).toHaveValue('(123) 456-7890');

        // Delete last digit '0'
        await user.type(input, '{Backspace}');
        expect(input).toHaveValue('(123) 456-789');

        // Delete '9'
        await user.type(input, '{Backspace}');
        expect(input).toHaveValue('(123) 456-78');

        // Delete '8', '7', '6'
        await user.type(input, '{Backspace}{Backspace}{Backspace}');
        expect(input).toHaveValue('(123) 45'); // '6' removed, '-' removed automatically? 
        // Logic: clean='12345'. format='(123) 45'.
        // Why?
        // i=0..4: (123) 
        // i=5 'd': '4'.
        // i=6 'd': '5'.
        // i=7 'd': undefined. Break.
        // So '(123) 45'. Correct.
    });

    it('handles selection replacement', async () => {
        const user = userEvent.setup();
        render(<TestInput template="dd/dd/dddd" />);

        const input = screen.getByLabelText('masked-input') as HTMLInputElement;

        await user.type(input, '12252024');
        expect(input).toHaveValue('12/25/2024');

        // Select '25' (indices 3,4) and type '30'
        // Range: start=3, end=5
        // userEvent handles selection setting via type with override or setSelectionRange
        input.focus();
        input.setSelectionRange(3, 5);
        fireEvent.select(input);
        await user.keyboard('3');
        // "12/3/2024"
        expect(input).toHaveValue('12/32/024');
        // Wait, regular replacement logic:
        // "12/25/2024" -> delete "25" -> "12//2024" -> insert "3" -> "12/3/2024" -> clean "1232024" -> format "12/32/024"
        // Correct.
    });

    it('handles keepPosition with deletion', async () => {
        const user = userEvent.setup();
        render(<TestInput template="dd/dd/dddd" placeholder="mm/dd/yyyy" keepPosition={true} initialValue="12/25/2024" />);

        const input = screen.getByLabelText('masked-input') as HTMLInputElement;
        // Verify initial
        expect(input).toHaveValue('12/25/2024');

        // Delete '5' at index 4
        input.focus();
        input.setSelectionRange(5, 5);
        fireEvent.select(input);
        await user.keyboard('{Backspace}');

        // Should be "12/2d/2024"
        // placeholder at 4 is 'd'
        expect(input).toHaveValue('12/2d/2024');
    });

    it('handles keepPosition with insertion', async () => {
        const user = userEvent.setup();
        render(<TestInput template="dd/dd/dddd" placeholder="mm/dd/yyyy" keepPosition={true} initialValue="12/2d/2024" />);

        const input = screen.getByLabelText('masked-input') as HTMLInputElement;

        // Cursor at index 4 (after '2'). Insert '5'.
        // "12/2d/2024"
        // 0123456789
        // d is at 4.
        // If cursor is at 4, we are *before* d.
        // Type '5'.
        input.focus();
        input.setSelectionRange(4, 4);
        fireEvent.select(input);
        await user.keyboard('5');

        expect(input).toHaveValue('12/25/2024');
    });

    it('handles paste (simulated)', async () => {
        const user = userEvent.setup();
        render(<TestInput template="(ddd) ddd-dddd" />);

        const input = screen.getByLabelText('masked-input') as HTMLInputElement;

        // Paste usually triggers input event with entire string
        // userEvent.paste implies clipboard interaction
        await user.click(input);
        await user.paste('1234567890');

        expect(input).toHaveValue('(123) 456-7890');
    });

    it('handles Delete key (forward delete)', async () => {
        const user = userEvent.setup();
        render(<TestInput template="dd-dd" initialValue="12-34" />);
        const input = screen.getByLabelText('masked-input') as HTMLInputElement;

        // Cursor at start
        input.focus();
        input.setSelectionRange(0, 0);
        await user.keyboard('{Delete}');
        // "12-34" -> delete '1' -> "23-4"
        expect(input).toHaveValue('23-4');
    });

    it('triggers keepPosition single char insertion logic via explicit event', async () => {
        const user = userEvent.setup();
        render(<TestInput template="dd-dd" placeholder="aa-aa" keepPosition={true} initialValue="12-3a" />);
        const input = screen.getByLabelText('masked-input') as HTMLInputElement;
        input.focus();
        // "12-3a". We want to type '4' at index 4 (replace 'a').
        // Expected result: "12-34"

        // Manually fire input event to ensure we hit the branch
        // Selection at 4.
        input.selectionStart = 4;
        input.selectionEnd = 4;

        // Simulating the browser behavior: input value becomes "12-34a" (inserted '4')?
        // Or "12-34".
        // Let's assume browser inserted '4' at 4.
        // Old Value (state): "12-3a"
        // New Value (dom): "12-34a"
        // Wait, if it's replacement/insertion.
        // If we just insert '4' at 4: "12-34a".

        // Set value *before* firing input, as browser would
        // Actually, for React controlled input, we fire change/input with the new value
        // But the hook calculates `typedChars` based on `inputVal.length - value.length`.
        // "12-34a".length = 6. "12-3a".length = 5. diff = 1.



        // Type '4'
        await user.keyboard('4');



        expect(input).toHaveValue('12-34');
    });
});
