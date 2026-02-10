
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { InputNumberMask } from '../InputNumberMask';

// Regression tests for keepPosition behavior
describe('InputNumberMask KeepPosition', () => {
    it('behaves correctly in keepPosition mode (overwrite & delete)', async () => {
        const user = userEvent.setup();
        render(
            <InputNumberMask
                template="dd/dd/dddd"
                placeholder="mm/dd/yyyy"
                keepPosition={true}
                defaultValue="12122024"
            />
        );
        const input = screen.getByRole('textbox') as HTMLInputElement;

        // Initial correct value
        expect(input).toHaveValue('12/12/2024');

        // 1. Test replacement (overwrite) behavior at the start
        // Place cursor at start
        input.focus();
        input.setSelectionRange(0, 0);
        await user.keyboard('5');

        // Expect '1' to be replaced by '5'
        // '52/12/2024'
        expect(input).toHaveValue('52/12/2024');
        expect(input.selectionStart).toBe(1); // Cursor should move to next char

        // 2. Test deletion (replace with placeholder)
        // Move cursor to end of '52' (index 2)
        input.setSelectionRange(2, 2);
        await user.keyboard('{Backspace}');

        // Expect '2' (index 1) to be replaced by 'm' (from placeholder mm at index 1)
        // '5m/12/2024'
        expect(input).toHaveValue('5m/12/2024');
        expect(input.selectionStart).toBe(1);

        // 3. Test typing over placeholder
        // Cursor at 1 (before 'm')
        input.setSelectionRange(1, 1);
        await user.keyboard('9');

        // Expect 'm' to be replaced by '9'
        // '59/12/2024'
        expect(input).toHaveValue('59/12/2024');
        expect(input.selectionStart).toBe(2);
    });

    it('handles typing in the middle without shifting subsequent digits', async () => {
        const user = userEvent.setup();
        render(
            <InputNumberMask
                template="dd-dd"
                placeholder="__-__"
                keepPosition={true}
                defaultValue="1234"
            />
        );
        const input = screen.getByRole('textbox') as HTMLInputElement;

        // '12-34'
        // Click at index 3 (before '3')
        input.focus();
        input.setSelectionRange(3, 3);
        await user.keyboard('5');

        // Expect '3' to be replaced by '5', '4' remains
        // '12-54'
        expect(input).toHaveValue('12-54');
        expect(input.selectionStart).toBe(4);
    });
});

it('handles selection replacement in keepPosition mode', async () => {
    const user = userEvent.setup();
    render(
        <InputNumberMask
            template="dd/dd/dddd"
            placeholder="mm/dd/yyyy"
            keepPosition={true}
        />
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;

    await user.type(input, '12252024');
    expect(input).toHaveValue('12/25/2024');

    // Select '25' and type '3'
    // "12/25/2024"
    input.setSelectionRange(3, 5);
    input.focus();
    // fireEvent.select(input); // Ensure selection is registered if needed
    await user.keyboard('3');

    // keepPosition:
    // Range 3-5 ("25") is replaced.
    // Logic: 
    // 1. Clear range to placeholder -> "12/dd/2024" (using 'd' from 'mm/dd/yyyy' at those positions? Wait, placeholder is "mm/dd/yyyy".
    // Indices 3,4 correspond to 'd','d' in placeholder.
    // So "12/dd/2024".
    // 2. Insert '3' at start of range (3). -> "12/3d/2024".
    expect(input).toHaveValue('12/3d/2024');
});

it('handles paste with keepPosition (falls back to standard shift)', async () => {
    const user = userEvent.setup();
    render(<InputNumberMask template="dd-dd" keepPosition={true} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    await user.type(input, '1234');
    expect(input).toHaveValue('12-34');

    // Select all and paste "56"
    input.setSelectionRange(0, 5);
    input.focus();
    await user.paste('56');

    // Pasting "56" over "12-34".
    // Should behave like standard replacement if it mimics "typing" or if paste is handled separately?
    // If handled as standard paste, it cleans "56" -> "56". Formats -> "56-".
    expect(input).toHaveValue('56-');
});

