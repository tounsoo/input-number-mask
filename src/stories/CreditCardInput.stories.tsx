import type { Meta, StoryObj } from '@storybook/react-vite';
import { useInputNumberMask } from '../useInputNumberMask';
import { userEvent, within, expect } from 'storybook/test';

const CreditCardInput = ({ template, placeholder, keepPosition }: any) => {
    const mask = useInputNumberMask({ template, placeholder, keepPosition });

    return (
        <div>
            <label htmlFor="cc-input" style={{ display: 'block', marginBottom: '8px' }}>
                Credit Card Input
            </label>
            <input
                id="cc-input"
                ref={mask.ref}
                value={mask.value}
                onChange={() => { }}
                style={{ padding: '8px', fontSize: '1rem', width: '250px' }}
            />

            <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#666' }} aria-live="polite">
                Formatted: <span data-testid="formatted-value">{mask.value}</span><br />
                Raw: <span data-testid="visible-raw">{mask.rawValue}</span>
            </div>
        </div>
    );
};

const meta: Meta<typeof CreditCardInput> = {
    title: 'Mask/CreditCardInput',
    component: CreditCardInput,
    args: {
        template: 'dddd-dddd-dddd-dddd',
        placeholder: '####-####-####-####',
    },
};

export default meta;
type Story = StoryObj<typeof CreditCardInput>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByLabelText('Credit Card Input');
        const formattedDisplay = canvas.getByTestId('formatted-value');
        const rawDisplay = canvas.getByTestId('visible-raw');

        // Initial check
        expect(input).toHaveValue('####-####-####-####');
        expect(formattedDisplay).toHaveTextContent('####-####-####-####');
        expect(rawDisplay).toHaveTextContent('');

        // Typing
        await userEvent.type(input, '1234567812345678');

        // Check values
        expect(input).toHaveValue('1234-5678-1234-5678');
        expect(rawDisplay).toHaveTextContent('1234567812345678');
    },
};
