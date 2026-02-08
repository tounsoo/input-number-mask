import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { InputNumberMask } from './InputNumberMask';

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
            const input = screen.getByRole('textbox');

            await user.type(input, '12');
            expect(input).toHaveValue('12-');

            await user.type(input, '34');
            expect(input).toHaveValue('12-34');
        });

        it('calls onValueChange with formatted value', async () => {
            const handleChange = vi.fn();
            const user = userEvent.setup();
            render(<InputNumberMask template="dd-dd" onValueChange={handleChange} />);
            const input = screen.getByRole('textbox');

            await user.type(input, '1');
            // "1-" partial? No, standard formatting breaks early if no digits left for template
            // So "1" -> "1"
            expect(handleChange).toHaveBeenCalledWith('1');

            await user.type(input, '2');
            // "12-"
            expect(handleChange).toHaveBeenCalledWith('12-');
        });

        it('calls onValueChange with raw value when returnRawValue is true', async () => {
            const handleChange = vi.fn();
            const user = userEvent.setup();
            render(<InputNumberMask template="dd-dd" returnRawValue={true} onValueChange={handleChange} />);
            const input = screen.getByRole('textbox');

            await user.type(input, '1');
            // Value "1-", raw "1"
            expect(handleChange).toHaveBeenCalledWith('1');

            await user.type(input, '2');
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
