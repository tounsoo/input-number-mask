import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { InputNumberMask } from '../InputNumberMask';
import { typeAndCheckCursor } from '../../testUtils';

// Wrapper for controlled test
const ControlledInput = ({ template, returnRawValue = false }: { template: string, returnRawValue?: boolean }) => {
    const [value, setValue] = useState('');
    return (
        <InputNumberMask
            template={template}
            value={value}
            onValueChange={setValue}
            returnRawValue={returnRawValue}
        />
    );
};

describe('InputNumberMask Component', () => {

    describe('Uncontrolled Behavior', () => {
        it('renders with empty value by default', () => {
            render(<InputNumberMask template="dd-dd" />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveValue('');
        });

        it('renders with defaultValue', () => {
            render(<InputNumberMask template="dd-dd" defaultValue="1234" />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveValue('12-34');
        });

        it('updates value on user input', async () => {
            const user = userEvent.setup();
            render(<InputNumberMask template="dd-dd" />);
            const input = screen.getByRole('textbox') as HTMLInputElement;

            // '1' -> "1" (cursor 1)
            // '2' -> "12-" (cursor 3)
            await typeAndCheckCursor(user, input, '12', [1, 3]);
            expect(input).toHaveValue('12-');

            // '3' -> "12-3" (cursor 4)
            // '4' -> "12-34" (cursor 5)
            await typeAndCheckCursor(user, input, '34', [4, 5]);
            expect(input).toHaveValue('12-34');
        });

        it('ignores invalid characters and restores cursor', async () => {
            const user = userEvent.setup();
            render(<InputNumberMask template="dd-dd" />);
            const input = screen.getByRole('textbox') as HTMLInputElement;

            await typeAndCheckCursor(user, input, '12', [1, 3]);
            expect(input).toHaveValue('12-');

            await user.type(input, 'a');
            expect(input).toHaveValue('12-');
            // Wait for requestAnimationFrame restoration
            await screen.findByDisplayValue('12-'); // ensuring render cycle?
            // Actually waitFor is better
            await new Promise(resolve => setTimeout(resolve, 0)); // tick
            expect(input.selectionStart).toBe(3); // Should remain at end

            // Move cursor to middle '1|2-' and type 'b'
            input.focus();
            input.setSelectionRange(1, 1);
            fireEvent.select(input); // Ensure hook logic updates selectionRef
            expect(input.selectionStart).toBe(1);
            await user.keyboard('b');
            expect(input).toHaveValue('12-');

            // Wait for cursor restoration (RAF)
            await waitFor(() => {
                expect(input.selectionStart).toBe(1);
            });
        });

        it('handles backspace correctly', async () => {
            const user = userEvent.setup();
            render(<InputNumberMask template="dd-dd" />);
            const input = screen.getByRole('textbox') as HTMLInputElement;

            await typeAndCheckCursor(user, input, '1234', [1, 3, 4, 5]);
            expect(input).toHaveValue('12-34');

            await user.keyboard('{Backspace}');
            expect(input).toHaveValue('12-3');
            expect(input.selectionStart).toBe(4);

            await user.keyboard('{Backspace}');
            expect(input).toHaveValue('12-');
            expect(input.selectionStart).toBe(3);

            // Should skip separator
            await user.keyboard('{Backspace}');
            expect(input).toHaveValue('1');
            expect(input.selectionStart).toBe(1);
        });

        it('calls onValueChange with formatted value', async () => {
            const handleChange = vi.fn();
            const user = userEvent.setup();
            render(<InputNumberMask template="dd-dd" onValueChange={handleChange} />);
            const input = screen.getByRole('textbox') as HTMLInputElement;

            await typeAndCheckCursor(user, input, '1', [1]);
            // "1" -> "1"
            expect(handleChange).toHaveBeenCalledWith('1');

            await typeAndCheckCursor(user, input, '2', [3]);
            // "12-"
            expect(handleChange).toHaveBeenCalledWith('12-');
        });

        it('calls onValueChange with raw value when returnRawValue is true', async () => {
            const handleChange = vi.fn();
            const user = userEvent.setup();
            render(<InputNumberMask template="dd-dd" returnRawValue={true} onValueChange={handleChange} />);
            const input = screen.getByRole('textbox') as HTMLInputElement;

            await typeAndCheckCursor(user, input, '1', [1]);
            // Value "1-", raw "1"
            expect(handleChange).toHaveBeenCalledWith('1');

            await typeAndCheckCursor(user, input, '2', [3]);
            // Value "12-", raw "12"
            expect(handleChange).toHaveBeenCalledWith('12');
        });
    });

    describe('Controlled Behavior', () => {
        it('renders with controlled value', () => {
            render(<InputNumberMask template="dd-dd" value="1234" readOnly />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveValue('12-34');
        });

        it('calls onValueChange but does NOT update input if value prop is not updated (strictly controlled)', async () => {
            const handleChange = vi.fn();
            const user = userEvent.setup();

            // Use partial value so typing would attempt to add more digits
            render(<InputNumberMask template="dd-dd" value="12" onValueChange={handleChange} />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveValue('12-');

            // Try to type '5'
            await user.type(input, '5');

            // Should call callback with attempted new value
            expect(handleChange).toHaveBeenCalled();
            // But input value should revert to '12-' because prop didn't change
            expect(input).toHaveValue('12-');
        });

        it('updates input when value prop changes', () => {
            const { rerender } = render(<InputNumberMask template="dd-dd" value="1234" readOnly />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveValue('12-34');

            rerender(<InputNumberMask template="dd-dd" value="5678" readOnly />);
            expect(input).toHaveValue('56-78');
        });

        it('works with standard React controlled pattern (prop updates based on callback)', async () => {
            const user = userEvent.setup();
            render(<ControlledInput template="dd-dd" />);
            const input = screen.getByRole('textbox');

            await user.type(input, '1234');
            expect(input).toHaveValue('12-34');
        });
    });

    describe('Edge Cases & Interactions', () => {
        it('handles selection replacement', async () => {
            const user = userEvent.setup();
            render(<InputNumberMask template="dd/dd/dddd" />);
            const input = screen.getByRole('textbox') as HTMLInputElement;

            await user.type(input, '12252024');
            expect(input).toHaveValue('12/25/2024');

            // Select '25' and type '3' -> '12/32/024...' or '12/3/2024'
            input.setSelectionRange(3, 5);
            input.focus();
            fireEvent.select(input);
            await user.keyboard('3');

            // "12/25/2024" -> delete "25" -> "12//2024". insert '3' at index 3 -> "12/3/2024".
            // Clean "1232024". Format "12/32/024".
            expect(input).toHaveValue('12/32/024');
        });

        it('handles paste of formatted content', async () => {
            const user = userEvent.setup();
            render(<InputNumberMask template="(ddd) ddd-dddd" />);
            const input = screen.getByRole('textbox');

            input.focus();
            await user.paste('(123) 456-7890');
            expect(input).toHaveValue('(123) 456-7890');
        });
    });
    describe('Architecture & Integrations', () => {
        it('forwards ref as a function', () => {
            let refNode: HTMLInputElement | null = null;
            render(<InputNumberMask template="dd" ref={(node) => { refNode = node; }} />);
            expect(refNode).toBeInstanceOf(HTMLInputElement);
        });

        it('forwards ref as an object', () => {
            const ref = { current: null };
            render(<InputNumberMask template="dd" ref={ref} />);
            expect(ref.current).toBeInstanceOf(HTMLInputElement);
        });
    });
});
