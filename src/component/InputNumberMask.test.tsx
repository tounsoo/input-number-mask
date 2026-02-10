import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { InputNumberMask } from './InputNumberMask';
import { typeAndCheckCursor } from '../testUtils';

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
});
