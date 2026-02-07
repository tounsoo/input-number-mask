import type { Meta, StoryObj } from '@storybook/react';
import { useInputNumberMask } from '../useInputNumberMask';
import { userEvent, within, expect } from 'storybook/test';

const PhoneInput = ({ template, placeholder, keepPosition }: any) => {
    const mask = useInputNumberMask({ template, placeholder, keepPosition });

    return (
        <form aria-label="phone-form">
            <label htmlFor="phone-input" style={{ display: 'block', marginBottom: '8px' }}>
                Phone Input
            </label>
            <input
                id="phone-input"
                ref={mask.ref}
                value={mask.value}
                onChange={() => { }}
                style={{ padding: '8px', fontSize: '1rem', width: '250px' }}
            />
            {/* Hidden input to simulate real form usage */}
            <input type="hidden" name="phone_raw" value={mask.rawValue} data-testid="hidden-raw" />

            <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#666' }}>
                Formatted: <span data-testid="formatted-value">{mask.value}</span><br />
                Raw: <span data-testid="visible-raw">{mask.rawValue}</span>
            </div>
        </form>
    );
};

const meta: Meta<typeof PhoneInput> = {
    title: 'Mask/PhoneInput',
    component: PhoneInput,
    args: {
        template: '+1 (ddd) ddd-dddd',
        placeholder: '+1 (___) ___-____',
    },
};

export default meta;
type Story = StoryObj<typeof PhoneInput>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByLabelText('Phone Input');
        const formattedDisplay = canvas.getByTestId('formatted-value');
        const rawDisplay = canvas.getByTestId('visible-raw');
        const hiddenInput = canvas.getByTestId('hidden-raw');

        // Initial check
        expect(input).toHaveValue('+1 (___) ___-____');
        expect(formattedDisplay).toHaveTextContent('+1 (___) ___-____');
        expect(rawDisplay).toHaveTextContent('');
        expect(hiddenInput).toHaveValue('');

        // Typing
        await userEvent.type(input, '1234567890');

        // Check values
        expect(input).toHaveValue('+1 (123) 456-7890');
        expect(rawDisplay).toHaveTextContent('1234567890');
        expect(hiddenInput).toHaveValue('1234567890');
    },
};
