import type { Meta, StoryObj } from '@storybook/react';
import { useInputNumberMask } from '../useInputNumberMask';
import type { UseInputNumberMaskProps } from '../useInputNumberMask';
import { userEvent, within, expect } from 'storybook/test';

// Component wrapper for Storybook
const DateInput = (props: UseInputNumberMaskProps) => {
    const mask = useInputNumberMask(props);
    return (
        <div>
            <label htmlFor="date-input" style={{ display: 'block', marginBottom: '8px' }}>
                Date Input ({props.template})
            </label>
            <input
                id="date-input"
                ref={mask.ref}
                value={mask.value}
                onChange={() => { }}
                style={{ padding: '8px', fontSize: '1rem', width: '200px' }}
            />
            <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#666' }} data-testid="raw-value" aria-live="polite">
                Raw: {mask.rawValue}
            </div>
        </div>
    );
};

const meta: Meta<typeof DateInput> = {
    title: 'Mask/DateInput',
    component: DateInput,
    args: {
        template: 'dd/dd/dddd',
        placeholder: 'dd/mm/yyyy',
        keepPosition: false,
    },
};

export default meta;
type Story = StoryObj<typeof DateInput>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByLabelText(/Date Input/i);

        // Initial state
        expect(input).toHaveValue('dd/mm/yyyy');

        // Typing
        await userEvent.type(input, '12252025');
        expect(input).toHaveValue('12/25/2025');

        // Verify Raw Value
        const rawValue = canvas.getByTestId('raw-value');
        expect(rawValue).toHaveTextContent('Raw: 12252025');
    },
};

export const BackspaceBehavior: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByLabelText(/Date Input/i);

        await userEvent.type(input, '12');
        expect(input).toHaveValue('12/mm/yyyy');

        // Cursor is at end, backspace should delete '2'
        await userEvent.keyboard('{backspace}');
        expect(input).toHaveValue('1d/mm/yyyy');
    },
};

export const KeepPosition: Story = {
    args: {
        keepPosition: true,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByLabelText(/Date Input/i);

        // Type full date
        await userEvent.type(input, '12122024');
        expect(input).toHaveValue('12/12/2024');

        // Move cursor to after the month's second digit '2' (index 5)
        // 1 2 / 1 2 / 2 0 2 4
        // 0 1 2 3 4 5
        (input as HTMLInputElement).setSelectionRange(5, 5);

        await userEvent.keyboard('{backspace}');

        // Should replace '2' with 'm' (placeholder char) and keep the rest in place
        // This demonstrates "keepPosition" - the year part didn't shift left
        expect(input).toHaveValue('12/1m/2024');

        // Type '5' to fill the gap
        await userEvent.keyboard('5');
        expect(input).toHaveValue('12/15/2024');
    },
};
