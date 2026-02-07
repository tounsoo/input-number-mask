import type { Meta, StoryObj } from '@storybook/react';
import { useInputNumberMask } from '../useInputNumberMask';
import { userEvent, within, expect, fn } from 'storybook/test';
import React from 'react';

// Example form component using the hook
const RegistrationForm = ({ onSubmit }: { onSubmit: (data: any) => void }) => {
    // Phone Mask
    const phoneMask = useInputNumberMask({
        template: '(ddd) ddd-dddd',
        placeholder: '(___) ___-____'
    });

    // Date Mask
    const dateMask = useInputNumberMask({
        template: 'dd/dd/dddd',
        placeholder: 'dd/mm/yyyy'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        // We can also extract raw values directly if needed, but FormData gets the input value
        // To get raw value in onSubmit, we might rely on the state or refs if we stored them,
        // or cleaner: use the hook's rawValue and include it as a hidden field if strictly needed for standard submission,
        // OR just use the masked value.
        // For this demo, we'll submit the masked values as they appear in the inputs.

        onSubmit(data);
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
            <div>
                <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem' }}>Full Name</label>
                <input
                    name="name"
                    id="name"
                    type="text"
                    required
                    style={{ padding: '0.5rem', width: '100%' }}
                />
            </div>

            <div>
                <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.5rem' }}>Phone Number</label>
                <input
                    {...phoneMask}
                    name="phone"
                    id="phone"
                    type="tel"
                    required
                    aria-describedby="phone-hint"
                    style={{ padding: '0.5rem', width: '100%' }}
                />
                <small id="phone-hint">Format: (123) 456-7890</small>
            </div>

            <div>
                <label htmlFor="dob" style={{ display: 'block', marginBottom: '0.5rem' }}>Date of Birth</label>
                <input
                    {...dateMask}
                    name="dob"
                    id="dob"
                    type="text"
                    required
                    aria-describedby="dob-hint"
                    style={{ padding: '0.5rem', width: '100%' }}
                />
                <small id="dob-hint">Format: dd/mm/yyyy</small>
            </div>

            <button type="submit" style={{ padding: '0.75rem', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
                Register
            </button>
        </form>
    );
};

const meta: Meta<typeof RegistrationForm> = {
    title: 'Examples/Form Integration',
    component: RegistrationForm,
    parameters: {
        layout: 'centered',
    },
    args: {
        onSubmit: fn(),
    },
};

export default meta;
type Story = StoryObj<typeof RegistrationForm>;

export const Default: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);

        // Fill Name
        await userEvent.type(canvas.getByLabelText(/Full Name/i), 'John Doe');

        // Fill Phone
        await userEvent.type(canvas.getByLabelText(/Phone Number/i), '1234567890');
        expect(canvas.getByLabelText(/Phone Number/i)).toHaveValue('(123) 456-7890');

        // Fill DOB
        await userEvent.type(canvas.getByLabelText(/Date of Birth/i), '01012000');
        expect(canvas.getByLabelText(/Date of Birth/i)).toHaveValue('01/01/2000');

        // Submit
        await userEvent.click(canvas.getByRole('button', { name: /Register/i }));

        // Verify onSubmit was called with correct data
        expect(args.onSubmit).toHaveBeenCalledWith({
            name: 'John Doe',
            phone: '(123) 456-7890',
            dob: '01/01/2000'
        });
    },
};

const RawSubmitForm = ({ onSubmit }: { onSubmit: (data: any) => void }) => {
    const phoneMask = useInputNumberMask({
        template: '(ddd) ddd-dddd',
        placeholder: '(___) ___-____'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());
        onSubmit(data);
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
            <div>
                <label htmlFor="raw-phone" style={{ display: 'block', marginBottom: '0.5rem' }}>Phone Number (Submit Raw)</label>
                <input
                    {...phoneMask}
                    id="raw-phone"
                    type="tel"
                    required
                    aria-describedby="raw-phone-hint"
                    style={{ padding: '0.5rem', width: '100%' }}
                />
                {/* Hidden input to populate raw value */}
                <input type="hidden" name="phone" value={phoneMask.rawValue} />
                <small id="raw-phone-hint" aria-live="polite">Submitted value will be unmasked: {phoneMask.rawValue}</small>
            </div>
            <button type="submit" style={{ padding: '0.75rem', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>
                Submit Raw
            </button>
        </form>
    );
};

export const SubmitRawValue: Story = {
    render: (args) => <RawSubmitForm {...args} />,
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);

        // Fill Phone
        await userEvent.type(canvas.getByLabelText(/Phone Number/i), '1234567890');
        expect(canvas.getByLabelText(/Phone Number/i)).toHaveValue('(123) 456-7890');

        // Submit
        await userEvent.click(canvas.getByRole('button', { name: /Submit Raw/i }));

        // Verify onSubmit was called with RAW data
        expect(args.onSubmit).toHaveBeenCalledWith({
            phone: '1234567890'
        });
    },
};
