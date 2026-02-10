import type { Meta, StoryObj } from '@storybook/react-vite';
import { InputNumberMask } from '../component/InputNumberMask';
import { userEvent, within, expect, fn } from 'storybook/test';
import React, { useState } from 'react';

const meta: Meta<typeof InputNumberMask> = {
    title: 'Component/InputNumberMask',
    component: InputNumberMask,
    args: {
        template: '(ddd) ddd-dddd',
        placeholder: '(___) ___-____',
        onValueChange: fn(),
    },
    argTypes: {
        template: { control: 'text' },
        placeholder: { control: 'text' },
        keepPosition: { control: 'boolean' },
        returnRawValue: { control: 'boolean' },
        disabled: { control: 'boolean' },
        readOnly: { control: 'boolean' },
        autoFocus: { control: 'boolean' },
    },
    parameters: {
        layout: 'centered',
    },
};

export default meta;
type Story = StoryObj<typeof InputNumberMask>;

// --- Group 1: Basic & Formatting ---

export const Basic: Story = {
    args: {
        template: '(ddd) ddd-dddd',
        placeholder: '(___) ___-____',
        'aria-label': 'Phone Number',
    },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('textbox', { name: /Phone Number/i });

        await userEvent.type(input, '1234567890');
        expect(input).toHaveValue('(123) 456-7890');
        if (args.onValueChange) {
            expect(args.onValueChange).toHaveBeenLastCalledWith('(123) 456-7890');
        }
    }
};

export const DateFormat: Story = {
    args: {
        template: 'dd/dd/dddd',
        placeholder: 'mm/dd/yyyy',
        'aria-label': 'Date',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('textbox', { name: /Date/i });
        await userEvent.type(input, '12252025');
        expect(input).toHaveValue('12/25/2025');
    }
};

export const CreditCard: Story = {
    args: {
        template: 'dddd dddd dddd dddd',
        placeholder: 'xxxx xxxx xxxx xxxx',
        'aria-label': 'Credit Card',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('textbox', { name: /Credit Card/i });
        await userEvent.type(input, '1234567812345678');
        expect(input).toHaveValue('1234 5678 1234 5678');
    }
};

export const WithPlaceholder: Story = {
    args: {
        template: 'dd-dd',
        placeholder: 'MM-YY',
        'aria-label': 'Expiry',
    }
};

// --- Group 2: State Management ---

export const Controlled: Story = {
    render: (args) => {
        const [val, setVal] = useState('');
        return (
            <div>
                <InputNumberMask
                    {...args}
                    value={val}
                    onValueChange={setVal}
                    aria-label="Controlled Input"
                />
                <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                    Current State: <span data-testid="state-val">{val}</span>
                </div>
            </div>
        );
    },
    args: {
        template: 'dd/dd/dddd',
        placeholder: 'dd/mm/yyyy',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('textbox', { name: /Controlled Input/i });
        const display = canvas.getByTestId('state-val');

        await userEvent.type(input, '01012024');
        expect(input).toHaveValue('01/01/2024');
        expect(display).toHaveTextContent('01/01/2024');
    }
};

export const UncontrolledDefaultValue: Story = {
    args: {
        template: 'dd/dd/dddd',
        defaultValue: '12312023',
        placeholder: 'mm/dd/yyyy',
        'aria-label': 'Uncontrolled Input',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('textbox', { name: /Uncontrolled Input/i });
        expect(input).toHaveValue('12/31/2023');

        await userEvent.clear(input);
        await userEvent.type(input, '01012024');
        expect(input).toHaveValue('01/01/2024');
    }
};

// --- Group 3: Behaviors ---

export const KeepPosition: Story = {
    args: {
        template: 'dd/dd/dddd',
        placeholder: 'mm/dd/yyyy',
        keepPosition: true,
        'aria-label': 'Keep Position Input',
        defaultValue: '12122024'
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('textbox', { name: /Keep Position Input/i });

        // Initial correct value
        expect(input).toHaveValue('12/12/2024');

        // Move cursor to middle and delete
        // 1 2 / 1 2 / 2 0 2 4
        // 0 1 2 3 4 5
        // Ensure input is focused for userEvent interactions
        input.focus();
        (input as HTMLInputElement).setSelectionRange(5, 5);

        await userEvent.keyboard('{Backspace}');

        // Expect '2' (at index 4) to be replaced by 'd' (placeholder char), 
        // rest of string remains (especially '2024' part)
        expect(input).toHaveValue('12/1d/2024');

        await userEvent.keyboard('5');
        expect(input).toHaveValue('12/15/2024');
    }
};

export const ReturnRawValue: Story = {
    args: {
        template: '(ddd) ddd-dddd',
        returnRawValue: true,
        'aria-label': 'Raw Value Input',
    },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('textbox', { name: /Raw Value Input/i });

        await userEvent.type(input, '1234567890');
        expect(input).toHaveValue('(123) 456-7890'); // Value in DOM is always masked

        // onValueChange receives raw digits
        if (args.onValueChange) {
            expect(args.onValueChange).toHaveBeenLastCalledWith('1234567890');
        }
    }
};

// --- Group 4: Standard HTML Attributes ---

export const Disabled: Story = {
    args: {
        template: '(ddd) ddd-dddd',
        disabled: true,
        defaultValue: '1234567890',
    }
};

export const ReadOnly: Story = {
    args: {
        template: '(ddd) ddd-dddd',
        readOnly: true,
        defaultValue: '1234567890',
    }
};

export const AutoFocus: Story = {
    args: {
        template: '(ddd) ddd-dddd',
        autoFocus: true,
        'aria-label': 'Auto Focus Input',
    },
    // Note: Auto focus might be flaky in some test environments, 
    // but useful for visual confirmation.
};

// --- Group 5: Form Integration ---

export const NativeFormSubmission: Story = {
    render: (args) => (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData.entries());
                (args.onValueChange)?.(data as unknown as string); // Using onValueChange to capture submit result for test
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: 300 }}
        >
            <label htmlFor="native-phone">Phone (Native)</label>
            <InputNumberMask
                {...args}
                id="native-phone"
                name="phone"
                required
            />
            <button type="submit">Submit</button>
        </form>
    ),
    args: {
        template: '(ddd) ddd-dddd',
        returnRawValue: true, // Will create a hidden input with raw value
    },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByLabelText('Phone (Native)');

        await userEvent.type(input, '9876543210');
        await userEvent.click(canvas.getByText('Submit'));

        // Expect the form data to contain the RAW value because returnRawValue=true
        // The visible input has the masked value, but the hidden input acts as the submitted value
        if (args.onValueChange) {
            expect(args.onValueChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    phone: '9876543210'
                })
            );
        }
    }
};

export const ReactControlledForm: Story = {
    render: (args) => {
        const [formState, setFormState] = useState({ phone: '' });

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            args.onValueChange?.(formState.phone);
        };

        return (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: 300 }}>
                <label htmlFor="react-phone">Phone (React State)</label>
                <InputNumberMask
                    {...args}
                    id="react-phone"
                    value={formState.phone}
                    onValueChange={(val) => setFormState(prev => ({ ...prev, phone: val }))}
                />
                <button type="submit">Submit</button>
                <div style={{ fontSize: 12, color: '#666' }}>
                    State: {JSON.stringify(formState)}
                </div>
            </form>
        );
    },
    args: {
        template: '(ddd) ddd-dddd',
        returnRawValue: true, // State will get raw value
    },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByLabelText('Phone (React State)');

        await userEvent.type(input, '5551234567');
        await userEvent.click(canvas.getByText('Submit'));

        if (args.onValueChange) {
            expect(args.onValueChange).toHaveBeenCalledWith('5551234567');
        }
    }
};
