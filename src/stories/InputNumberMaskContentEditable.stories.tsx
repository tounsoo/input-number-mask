import type { Meta, StoryObj } from '@storybook/react';
import { InputNumberMaskContentEditable } from '../component/InputNumberMaskContentEditable';
import { useState } from 'react';

const meta: Meta<typeof InputNumberMaskContentEditable> = {
    title: 'Component/InputNumberMaskContentEditable',
    component: InputNumberMaskContentEditable,
    argTypes: {
        template: { control: 'text' },
        placeholder: { control: 'text' },
        keepPosition: { control: 'boolean' },
        returnRawValue: { control: 'boolean' },
        placeholderColor: { control: 'color' },
    },
};

export default meta;
type Story = StoryObj<typeof InputNumberMaskContentEditable>;

export const Default: Story = {
    args: {
        template: '(ddd) ddd-dddd',
        placeholder: '(___) ___-____',
        placeholderColor: 'red',
        'aria-label': 'Phone number',
    },
};

export const CustomPlaceholderColor: Story = {
    args: {
        template: 'dd/dd/dddd',
        placeholder: 'mm/dd/yyyy',
        placeholderColor: 'blue',
        'aria-label': 'Date of birth',
    },
};

export const KeepPosition: Story = {
    args: {
        template: '(ddd) ddd-dddd',
        placeholder: '(___) ___-____',
        keepPosition: true,
        placeholderColor: 'orange',
        'aria-label': 'Phone number',
    },
};

export const Controlled: Story = {
    args: {
        template: '(ddd) ddd-dddd',
        placeholder: '(___) ___-____',
        placeholderColor: 'green',
        'aria-label': 'Controlled phone number',
    },
    render: (args) => {
        const [value, setValue] = useState('');
        return (
            <div>
                <p>Value: {value}</p>
                <InputNumberMaskContentEditable
                    {...args}
                    value={value}
                    onValueChange={setValue}
                />
                <button onClick={() => setValue('(555) 555-5555')}>Set to 555</button>
            </div>
        );
    },
};

export const ControlledCustomPlaceholderColor: Story = {
    args: {
        template: 'dd/dd/dddd',
        placeholder: 'mm/dd/yyyy',
        placeholderColor: 'blue',
        'aria-label': 'Controlled date input',
    },
    render: (args) => {
        const [value, setValue] = useState('');
        return (
            <div>
                <p>Value: {value}</p>
                <InputNumberMaskContentEditable
                    {...args}
                    value={value}
                    onValueChange={setValue}
                />
                <button onClick={() => setValue('12/25/2025')}>Set to 12/25/2025</button>
            </div>
        );
    },
};

export const FormSubmission: Story = {
    render: () => {
        const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            alert(`Submitted: ${formData.get('phone')}`);
        };

        return (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label>
                    Phone:
                    <InputNumberMaskContentEditable
                        name="phone"
                        template="(ddd) ddd-dddd"
                        placeholder="(___) ___-____"
                        placeholderColor="purple"
                        returnRawValue
                        aria-label="Phone number input"
                    />
                </label>
                <button type="submit">Submit</button>
            </form>
        );
    },
};
